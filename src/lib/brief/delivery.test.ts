import { afterEach, describe, expect, it, vi } from "vitest";

import {
  RATE_LIMIT,
  clientIp,
  createMemoryRateLimiter,
  createUpstashRateLimiter,
  emailTransport,
} from "./delivery";
import type { BriefPayload } from "./schema";

/** A minimal valid submission, so each test states only what it varies. */
function payload(): BriefPayload {
  return {
    name: "Kiri Tanaka",
    company: "Solene Group",
    role: "",
    email: "kiri@example.com",
    services: ["Soundscape architecture"],
    moment: "Arrival, across thirty-one properties.",
    budget: "220+",
    targetDate: "",
    attachmentName: "",
    fax: "",
    turnstileToken: "",
  };
}

describe("rate limiter, NFR-12", () => {
  it("allows exactly five in a window and refuses the sixth", () => {
    const limiter = createMemoryRateLimiter();
    return (async () => {
      for (let i = 0; i < RATE_LIMIT.max; i += 1) {
        expect((await limiter.check("1.2.3.4")).allowed).toBe(true);
      }
      expect((await limiter.check("1.2.3.4")).allowed).toBe(false);
    })();
  });

  it("counts each address separately", async () => {
    const limiter = createMemoryRateLimiter();
    for (let i = 0; i < RATE_LIMIT.max; i += 1) await limiter.check("1.1.1.1");
    expect((await limiter.check("1.1.1.1")).allowed).toBe(false);
    expect((await limiter.check("2.2.2.2")).allowed).toBe(true);
  });

  it("forgets a window once it has passed", async () => {
    let now = 1_000_000;
    const limiter = createMemoryRateLimiter(() => now);
    for (let i = 0; i < RATE_LIMIT.max; i += 1) await limiter.check("ip");
    expect((await limiter.check("ip")).allowed).toBe(false);

    now += RATE_LIMIT.windowMs + 1;
    expect((await limiter.check("ip")).allowed).toBe(true);
  });

  it("slides rather than resetting on a fixed boundary", async () => {
    // A fixed bucket lets someone send ten across a boundary in two seconds.
    let now = 0;
    const limiter = createMemoryRateLimiter(() => now);
    for (let i = 0; i < RATE_LIMIT.max; i += 1) {
      await limiter.check("ip");
      now += 1000;
    }
    expect((await limiter.check("ip")).allowed).toBe(false);
  });

  it("reports what is left", async () => {
    const limiter = createMemoryRateLimiter();
    expect((await limiter.check("ip")).remaining).toBe(RATE_LIMIT.max - 1);
  });
});

describe("clientIp", () => {
  it("takes only the first hop of x-forwarded-for", () => {
    // The header is a client-settable list; trusting the whole thing lets
    // anyone mint a fresh identity per request by prepending to it.
    const headers = new Headers({
      "x-forwarded-for": "203.0.113.7, 70.41.3.18, 150.172.238.178",
    });
    expect(clientIp(headers)).toBe("203.0.113.7");
  });

  it("trims whitespace", () => {
    expect(clientIp(new Headers({ "x-forwarded-for": "  9.9.9.9  " }))).toBe(
      "9.9.9.9",
    );
  });

  it("falls back to x-real-ip", () => {
    expect(clientIp(new Headers({ "x-real-ip": "8.8.8.8" }))).toBe("8.8.8.8");
  });

  it("never returns empty, so the limiter always has a key", () => {
    expect(clientIp(new Headers())).toBe("unknown");
    expect(clientIp(new Headers({ "x-real-ip": "   " }))).toBe("unknown");
  });
});

describe("email delivery", () => {
  const original = { ...process.env };

  afterEach(() => {
    process.env = { ...original };
    vi.restoreAllMocks();
  });

  it("stubs quietly when no key is configured", async () => {
    delete process.env.RESEND_API_KEY;
    vi.spyOn(console, "info").mockImplementation(() => {});

    const result = await emailTransport.send("TMB-260101-AAA", payload());
    expect(result.ok).toBe(true);
    expect(result.detail).toBe("stubbed");
  });

  it("refuses a key configured without addresses", async () => {
    // The dangerous half-configured state. This used to return ok:true with
    // the detail "resend adapter not yet installed", so setting the key would
    // have made every brief report success and deliver nothing — a failure
    // only visible as enquiries that never arrived.
    process.env.RESEND_API_KEY = "re_test";
    delete process.env.BRIEF_TO_EMAIL;
    delete process.env.BRIEF_FROM_EMAIL;

    const result = await emailTransport.send("TMB-260101-AAA", payload());
    expect(result.ok).toBe(false);
    expect(result.detail).toMatch(/BRIEF_TO_EMAIL/);
  });

  it("reports a non-2xx from Resend as a failure", async () => {
    process.env.RESEND_API_KEY = "re_test";
    process.env.BRIEF_TO_EMAIL = "studio@example.com";
    process.env.BRIEF_FROM_EMAIL = "site@example.com";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("nope", { status: 422 })),
    );

    const result = await emailTransport.send("TMB-260101-AAA", payload());
    expect(result.ok).toBe(false);
    expect(result.detail).toContain("422");
  });

  it("sends the reference and replies to the enquirer", async () => {
    process.env.RESEND_API_KEY = "re_test";
    process.env.BRIEF_TO_EMAIL = "studio@example.com";
    process.env.BRIEF_FROM_EMAIL = "site@example.com";

    const sent: RequestInit[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init: RequestInit) => {
        sent.push(init);
        return new Response("{}", { status: 200 });
      }),
    );

    const result = await emailTransport.send("TMB-260101-AAA", payload());
    expect(result.ok).toBe(true);

    const body = JSON.parse(String(sent[0]?.body));
    expect(body.subject).toContain("TMB-260101-AAA");
    // Replying to the studio's own address rather than the enquirer is the
    // small mistake that makes an inbox useless.
    expect(body.reply_to).toBe("kiri@example.com");
  });
});

describe("the Upstash limiter", () => {
  afterEach(() => vi.restoreAllMocks());

  it("counts in Redis and blocks past the limit", async () => {
    let count = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        count += 1;
        return new Response(JSON.stringify([{ result: count }, { result: 1 }]), {
          status: 200,
        });
      }),
    );

    const limiter = createUpstashRateLimiter("https://redis.test", "token");
    for (let i = 0; i < RATE_LIMIT.max; i += 1) {
      expect((await limiter.check("ip")).allowed).toBe(true);
    }
    expect((await limiter.check("ip")).allowed).toBe(false);
  });

  it("fails open when Upstash is unreachable", async () => {
    // Deliberate. This protects an inbox from spam, not a system from harm, and
    // a Redis outage is a poor reason to refuse a real client's brief.
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("network");
      }),
    );

    const limiter = createUpstashRateLimiter("https://redis.test", "token");
    expect((await limiter.check("ip")).allowed).toBe(true);
  });
});
