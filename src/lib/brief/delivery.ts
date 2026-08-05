import type { BriefPayload } from "./schema";
import { isQualified } from "./schema";

/**
 * Delivery, rate limiting and verification, FR-17.
 *
 * Every integration sits behind a small interface with a working local
 * implementation. The service SDKs are deliberately not installed: there are no
 * accounts to point them at, so installing them would add code that cannot be
 * executed and integrations that stay unverified either way. Swapping a stub for
 * the real adapter is a change to one function here.
 *
 * The stubs are not no-ops. The rate limiter really limits, the verifier really
 * rejects a missing token when configured to, and the transport really records
 * what it would have sent — so the route's behaviour is testable before any
 * account exists.
 */

export type DeliveryResult = { ok: boolean; detail: string };

export interface BriefTransport {
  send(reference: string, payload: BriefPayload): Promise<DeliveryResult>;
}

/* ------------------------------------------------------------------ email */

/**
 * Email via Resend's REST API, FR-17.
 *
 * Over `fetch` rather than the `resend` package, which is a thin wrapper over
 * exactly this call: one endpoint, a bearer token and a JSON body. The
 * dependency would add a package to audit and update for no capability.
 *
 * This previously returned `{ ok: true, detail: "resend adapter not yet
 * installed" }` whenever a key *was* present — so configuring the key would
 * have made every brief report success while sending nothing, and the failure
 * would only have surfaced as enquiries that never arrived. A stub must fail
 * loudly or not claim success.
 */
const RESEND_ENDPOINT = "https://api.resend.com/emails";

export const emailTransport: BriefTransport = {
  async send(reference, payload) {
    const key = process.env.RESEND_API_KEY;
    const to = process.env.BRIEF_TO_EMAIL;
    const from = process.env.BRIEF_FROM_EMAIL;

    if (!key) {
      // Logged rather than swallowed: in development this is the record that a
      // brief arrived, and it is what makes the endpoint exercisable.
      console.info(
        `[brief] would email ${reference}: ${payload.company} · ${payload.budget}`,
      );
      return { ok: true, detail: "stubbed" };
    }

    // Configured by halves is the dangerous state: a key with no addresses
    // looks configured and delivers nowhere.
    if (!to || !from) {
      return {
        ok: false,
        detail: "RESEND_API_KEY set without BRIEF_TO_EMAIL and BRIEF_FROM_EMAIL",
      };
    }

    const lines = [
      `Reference: ${reference}`,
      `Name: ${payload.name}`,
      `Company: ${payload.company}`,
      `Email: ${payload.email}`,
      `Budget: ${payload.budget}`,
      `Services: ${payload.services.join(", ")}`,
      "",
      payload.moment,
    ];

    try {
      const response = await fetch(RESEND_ENDPOINT, {
        method: "POST",
        headers: {
          authorization: `Bearer ${key}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: [to],
          reply_to: payload.email,
          subject: `Brief ${reference} · ${payload.company}`,
          text: lines.join("\n"),
        }),
      });

      if (!response.ok) {
        return { ok: false, detail: `resend ${response.status}` };
      }
      return { ok: true, detail: "resend" };
    } catch (error) {
      return { ok: false, detail: `resend failed: ${String(error)}` };
    }
  },
};

/* ------------------------------------------------------------------ slack */

export const slackTransport: BriefTransport = {
  async send(reference, payload) {
    const webhook = process.env.SLACK_BRIEF_WEBHOOK;
    const text = `New brief ${reference} · ${payload.company} · ${payload.budget}${
      isQualified(payload.budget) ? " · qualified" : ""
    }`;

    if (!webhook) {
      console.info(`[brief] would post to Slack: ${text}`);
      return { ok: true, detail: "stubbed" };
    }

    // Slack's incoming webhooks are a plain POST, so this one needs no SDK.
    try {
      const response = await fetch(webhook, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text }),
      });
      return { ok: response.ok, detail: `slack ${response.status}` };
    } catch (error) {
      return { ok: false, detail: `slack failed: ${String(error)}` };
    }
  },
};

/* ----------------------------------------------------------- rate limiting */

export type RateLimitResult = { allowed: boolean; remaining: number };

export interface RateLimiter {
  check(key: string): Promise<RateLimitResult>;
}

export const RATE_LIMIT = { max: 5, windowMs: 10 * 60 * 1000 } as const;

/**
 * In-memory limiter, NFR-12's 5 per 10 minutes per IP.
 *
 * Correct for a single instance and useless across several, which is exactly
 * why the deployed version needs Upstash. It is here so the endpoint's
 * behaviour under repeat submission is real and testable rather than absent.
 */
export function createMemoryRateLimiter(
  now: () => number = Date.now,
): RateLimiter {
  const hits = new Map<string, number[]>();

  return {
    async check(key) {
      const current = now();
      const window = (hits.get(key) ?? []).filter(
        (stamp) => current - stamp < RATE_LIMIT.windowMs,
      );

      if (window.length >= RATE_LIMIT.max) {
        hits.set(key, window);
        return { allowed: false, remaining: 0 };
      }

      window.push(current);
      hits.set(key, window);
      return { allowed: true, remaining: RATE_LIMIT.max - window.length };
    },
  };
}

/**
 * Upstash Redis limiter, NFR-12.
 *
 * The in-memory limiter above is correct per instance and wrong on serverless,
 * where every cold start gets its own empty map and the limit effectively does
 * not exist. This one counts in Redis, so all instances share it.
 *
 * A fixed window rather than a sliding one, over Upstash's REST API rather than
 * `@upstash/ratelimit`. A sliding window is more precise at the boundary — in
 * the worst case this allows 10 submissions across two adjacent windows rather
 * than 5 — and that precision is not worth a dependency for a form whose limit
 * exists to stop scripted abuse rather than to meter a paid API.
 *
 * `INCR` then `EXPIRE` in one pipelined call: two round trips would leave a key
 * without a TTL if the second failed, and a counter that never expires locks
 * someone out permanently.
 */
export function createUpstashRateLimiter(
  url: string,
  token: string,
): RateLimiter {
  const windowSeconds = Math.ceil(RATE_LIMIT.windowMs / 1000);

  return {
    async check(key) {
      const redisKey = `brief:${key}`;

      try {
        const response = await fetch(`${url}/pipeline`, {
          method: "POST",
          headers: {
            authorization: `Bearer ${token}`,
            "content-type": "application/json",
          },
          body: JSON.stringify([
            ["INCR", redisKey],
            ["EXPIRE", redisKey, windowSeconds, "NX"],
          ]),
        });

        if (!response.ok) throw new Error(`upstash ${response.status}`);

        const results = (await response.json()) as { result: number }[];
        const count = Number(results[0]?.result ?? 0);

        return {
          allowed: count <= RATE_LIMIT.max,
          remaining: Math.max(0, RATE_LIMIT.max - count),
        };
      } catch {
        // Fail open, deliberately. This limiter protects an inbox from spam,
        // not a system from harm, and Upstash being unreachable is a poor
        // reason to stop a real client sending a real brief. The honeypot and
        // Turnstile still stand in front of it.
        return { allowed: true, remaining: RATE_LIMIT.max };
      }
    },
  };
}

/** The limiter this deployment should use, chosen by what is configured. */
export function createRateLimiter(): RateLimiter {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  return url && token
    ? createUpstashRateLimiter(url, token)
    : createMemoryRateLimiter();
}

/* ------------------------------------------------------------- verification */

export interface CaptchaVerifier {
  verify(token: string | undefined): Promise<boolean>;
}

/**
 * Turnstile needs no SDK — it is a script tag and one POST.
 *
 * With no secret configured the verifier passes, because refusing every
 * submission in development would make the endpoint untestable. That default is
 * safe only because it is keyed on the secret being absent, which it never is
 * in production.
 */
export const turnstileVerifier: CaptchaVerifier = {
  async verify(token) {
    const secret = process.env.TURNSTILE_SECRET_KEY;
    if (!secret) return true;
    if (!token) return false;

    try {
      const response = await fetch(
        "https://challenges.cloudflare.com/turnstile/v0/siteverify",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ secret, response: token }),
        },
      );
      const result = (await response.json()) as { success?: boolean };
      return result.success === true;
    } catch {
      // A verifier that is down must not silently admit everything.
      return false;
    }
  },
};

/* -------------------------------------------------------------------- ip */

/**
 * x-forwarded-for is a client-settable list on most platforms, so only the
 * first hop is meaningful and even that is advisory. This keys a spam speed
 * bump sitting in front of Turnstile, not an authorisation boundary.
 */
export function clientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return headers.get("x-real-ip")?.trim() || "unknown";
}
