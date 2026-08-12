import { describe, expect, it } from "vitest";

import { TURNSTILE_ORIGIN, buildContentSecurityPolicy } from "./csp";

/**
 * NFR-12. The e2e suite asserts the header a real browser receives, but it can
 * only ever exercise its own environment: development off, HTTPS off, Turnstile
 * unconfigured. These cover the three branches it cannot reach, including the
 * one that ships.
 */

const PRODUCTION = {
  isDevelopment: false,
  servesHttps: true,
  turnstile: false,
} as const;

describe("script-src", () => {
  it("never allows eval in production", () => {
    // The asymmetry is deliberate and load-bearing: `next dev` runs every
    // module through eval(), production builds contain none.
    expect(buildContentSecurityPolicy(PRODUCTION)).not.toContain("unsafe-eval");
  });

  it("allows eval in development, or no client JavaScript runs at all", () => {
    const policy = buildContentSecurityPolicy({
      ...PRODUCTION,
      isDevelopment: true,
    });
    expect(policy).toContain("'unsafe-eval'");
  });

  it("admits no third-party origin when Turnstile is unconfigured", () => {
    expect(buildContentSecurityPolicy(PRODUCTION)).not.toContain(
      TURNSTILE_ORIGIN,
    );
  });
});

describe("Turnstile", () => {
  const policy = buildContentSecurityPolicy({ ...PRODUCTION, turnstile: true });

  it("allows the challenge script", () => {
    const scriptSrc = policy
      .split("; ")
      .find((directive) => directive.startsWith("script-src"));
    expect(scriptSrc).toContain(TURNSTILE_ORIGIN);
  });

  it("allows the challenge iframe", () => {
    // The failure this guards: with no frame-src, the directive falls back to
    // default-src 'self' and the widget is blocked. The symptom is a captcha
    // that never appears, which reads as Cloudflare being down.
    expect(policy).toContain(`frame-src 'self' ${TURNSTILE_ORIGIN}`);
  });

  it("still refuses to be framed itself", () => {
    // frame-src governs what this page may embed; frame-ancestors governs who
    // may embed it. Allowing the first must not relax the second.
    expect(policy).toContain("frame-ancestors 'none'");
  });
});

describe("upgrade-insecure-requests", () => {
  it("is emitted on an HTTPS origin", () => {
    expect(buildContentSecurityPolicy(PRODUCTION)).toContain(
      "upgrade-insecure-requests",
    );
  });

  it("is withheld on an HTTP origin, where it breaks every asset", () => {
    // It rewrites same-origin requests to https:// and they all fail. This
    // took out the whole e2e container once.
    const policy = buildContentSecurityPolicy({
      ...PRODUCTION,
      servesHttps: false,
    });
    expect(policy).not.toContain("upgrade-insecure-requests");
  });
});

describe("the directives that never move", () => {
  it("holds the strict defaults in every configuration", () => {
    for (const isDevelopment of [true, false]) {
      for (const servesHttps of [true, false]) {
        for (const turnstile of [true, false]) {
          const policy = buildContentSecurityPolicy({
            isDevelopment,
            servesHttps,
            turnstile,
          });

          for (const directive of [
            "default-src 'self'",
            "connect-src 'self'",
            "object-src 'none'",
            "base-uri 'self'",
            "form-action 'self'",
            "frame-ancestors 'none'",
          ]) {
            expect(
              policy,
              `${directive} missing at dev=${isDevelopment} https=${servesHttps} turnstile=${turnstile}`,
            ).toContain(directive);
          }
        }
      }
    }
  });
});
