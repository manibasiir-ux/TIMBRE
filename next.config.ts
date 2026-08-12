import type { NextConfig } from "next";

import { buildContentSecurityPolicy } from "./src/lib/security/csp";

/**
 * Security headers, NFR-12 — with one documented deviation.
 *
 * NFR-12 specifies `script-src 'self' 'nonce-…' 'strict-dynamic'`. That was
 * built, measured and removed, and the reason is worth recording so nobody
 * rebuilds it.
 *
 * A nonce is per request. These pages are prerendered at build time, so their
 * HTML exists before any request does and cannot contain one. Middleware minting
 * a nonce produced a correct header over HTML with **zero** nonce attributes on
 * **25 inline scripts**, and because `'strict-dynamic'` discards host-based
 * sources, `'self'` stopped applying too — every chunk was blocked and the site
 * did not boot. The e2e suite caught it as the consent gate never appearing.
 *
 * Nonces are therefore available only by making every route dynamic, which
 * trades away static generation, ISR, and the TTFB and LCP budgets in NFR-01
 * and NFR-04 — to defend an injection vector this site does not have. Nothing
 * user-supplied is ever rendered: the only input is a brief form that POSTs to
 * an API and is never echoed back. There is no session, no cookie and no
 * authenticated state to steal.
 *
 * So `script-src` allows inline, and everything that costs nothing stays
 * strict. This still blocks loading script from any other origin, exfiltration
 * to any other origin, plugin content, base-tag hijacking, form redirection and
 * framing. What it does not stop is injected inline script — which requires an
 * injection point that does not exist here, and would be a far larger problem
 * than the header if it ever did.
 *
 * Revisit the moment this site renders anything a stranger can write.
 */
/**
 * `upgrade-insecure-requests` is emitted only where the site is actually served
 * over HTTPS.
 *
 * On an HTTP origin the directive rewrites every same-origin asset request to
 * https:// and they all fail. That is what it did to the e2e container, where
 * every chunk, font and stylesheet died with ERR_SSL_PROTOCOL_ERROR — a whole
 * site failing to boot for a directive that is a no-op in production, where
 * everything is already HTTPS.
 */
const servesHttps =
  (process.env.NEXT_PUBLIC_SITE_URL ?? "").startsWith("https://") ||
  process.env.VERCEL === "1";

/**
 * `'unsafe-eval'` in development only, and the asymmetry is the point.
 *
 * `next dev` serves every module through an `eval()` call — that is how the
 * webpack `eval-source-map` devtool attaches a source map to each module — so a
 * script-src without `'unsafe-eval'` blocks the entire client bundle. The
 * symptom is not an error page: the server-rendered HTML arrives intact and
 * looks correct, then nothing hydrates. No canvas, no audio, no working
 * buttons, and a single EvalError in the console that is easy to read as noise.
 *
 * It went unnoticed for three commits because every check runs against
 * `web-prod`. A production build contains no `eval()` at all, so the header
 * that ships is unchanged and stays as strict as it was.
 *
 * If this ever needs relaxing for production, it does not. Find another way.
 */
const isDevelopment = process.env.NODE_ENV !== "production";

/**
 * Cloudflare Turnstile is allowed through the policy only where it is actually
 * configured, mirroring the `servesHttps` conditional above.
 *
 * The alternative — allowing the origin unconditionally — would loosen
 * `script-src` and `frame-src` on every deployment that never loads Turnstile,
 * which is most of them, to save one boolean.
 */
const turnstile = Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);

const contentSecurityPolicy = buildContentSecurityPolicy({
  isDevelopment,
  servesHttps,
  turnstile,
});
const securityHeaders = [
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "microphone=(), camera=(), geolocation=(), interest-cohort=()",
  },
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

const nextConfig: NextConfig = {
  // Development runs in a Linux container while the source lives on a Windows
  // bind mount, and inotify events do not survive that boundary. Turbopack's
  // watcher, including this pollIntervalMs option, was measured on that mount
  // and never fired: edits made from Windows and from inside the container both
  // left the dev server serving a stale render indefinitely. Webpack's polling
  // watcher, driven by WATCHPACK_POLLING, does fire, so `npm run dev` passes
  // --webpack. See the Development section of README.md.
  //
  // This option is kept because it costs nothing and becomes the correct answer
  // the moment the source moves onto a Linux filesystem or Turbopack fixes the
  // watcher, at which point `npm run dev:turbo` becomes viable.
  watchOptions: {
    pollIntervalMs: 500,
  },

  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
