/**
 * The Content-Security-Policy, NFR-12.
 *
 * Lifted out of `next.config.ts` so both of its conditional branches can be
 * asserted in a unit test. The e2e suite can only ever see the branch its own
 * environment produces — no Turnstile key, HTTP origin — which is precisely the
 * half least likely to be wrong. The branch that ships to production was, until
 * this file existed, the one nothing checked.
 *
 * The reasoning behind each directive lives with the config that consumes it.
 */

export type CspOptions = {
  /** `next dev` serves modules through `eval()`; production builds do not. */
  isDevelopment: boolean;
  /** `upgrade-insecure-requests` is fatal on an HTTP origin. */
  servesHttps: boolean;
  /** Cloudflare Turnstile is configured, so its script and iframe are needed. */
  turnstile: boolean;
};

export const TURNSTILE_ORIGIN = "https://challenges.cloudflare.com";

export function buildContentSecurityPolicy({
  isDevelopment,
  servesHttps,
  turnstile,
}: CspOptions): string {
  const scriptSrc = [
    "script-src 'self' 'unsafe-inline'",
    isDevelopment ? " 'unsafe-eval'" : "",
    turnstile ? ` ${TURNSTILE_ORIGIN}` : "",
  ].join("");

  return [
    "default-src 'self'",
    scriptSrc,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "media-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    // Turnstile renders its challenge in an iframe. Without an explicit
    // frame-src this falls back to default-src 'self' and the widget is
    // blocked — which looks like Turnstile being broken rather than like a
    // policy doing its job.
    turnstile ? `frame-src 'self' ${TURNSTILE_ORIGIN}` : "frame-src 'self'",
    ...(servesHttps ? ["upgrade-insecure-requests"] : []),
  ].join("; ");
}
