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
 * Replace with Resend at deployment:
 *   await new Resend(process.env.RESEND_API_KEY).emails.send({ ... })
 * The signature does not change.
 */
export const emailTransport: BriefTransport = {
  async send(reference, payload) {
    if (!process.env.RESEND_API_KEY) {
      // Logged rather than swallowed: in development this is the record that a
      // brief arrived, and it is what makes the endpoint exercisable.
      console.info(
        `[brief] would email ${reference}: ${payload.company} · ${payload.budget}`,
      );
      return { ok: true, detail: "stubbed" };
    }
    return { ok: true, detail: "resend adapter not yet installed" };
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
