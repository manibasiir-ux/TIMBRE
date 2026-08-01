import { describe, expect, it } from "vitest";

import { RATE_LIMIT, clientIp, createMemoryRateLimiter } from "./delivery";

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
