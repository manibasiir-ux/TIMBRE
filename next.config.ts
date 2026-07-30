import type { NextConfig } from "next";

/**
 * Security headers, NFR-12.
 *
 * The full requirement also specifies a strict Content-Security-Policy with
 * per-request nonces and 'strict-dynamic'. That needs middleware to mint a
 * nonce per response and thread it through every script tag, and it has to be
 * validated against the WebGL, GSAP and analytics chunks that do not exist yet.
 * Building it now would only prove it works on an empty application, so it is
 * scheduled as its own step and tracked as outstanding. frame-ancestors is set
 * here already because clickjacking protection does not depend on any of that.
 */
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
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
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
