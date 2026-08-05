/**
 * Where the site lives, and the routes it publishes.
 *
 * One source for both, because a sitemap that disagrees with the router is
 * worse than no sitemap: it tells a crawler about pages that 404 and stays
 * silent about the ones that matter. The static list is checked against the
 * App Router's own directory listing by a unit test, so adding a route without
 * publishing it fails the build rather than quietly costing traffic.
 */

/**
 * Vercel exposes the deployment host but not the scheme, and previews get a
 * different host each time. NEXT_PUBLIC_SITE_URL is the production canonical
 * and should be set to the custom domain once there is one; the fallbacks keep
 * previews and local development self-consistent rather than pointing every
 * canonical at production, which would ask Google to ignore the preview.
 */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000");

export const SITE_NAME = "TIMBRE";

/** Absolute URL for a path, which is what canonicals and sitemaps require. */
export function absoluteUrl(path = "/"): string {
  return new URL(path, SITE_URL).toString();
}

/**
 * Static routes, with the priority and change frequency each deserves.
 *
 * Case studies and journal posts are appended at build time from their content,
 * so they are not listed here.
 */
export const STATIC_ROUTES = [
  { path: "/", priority: 1.0, changeFrequency: "weekly" },
  { path: "/work", priority: 0.9, changeFrequency: "weekly" },
  { path: "/services", priority: 0.9, changeFrequency: "monthly" },
  { path: "/studio", priority: 0.7, changeFrequency: "monthly" },
  { path: "/process", priority: 0.7, changeFrequency: "monthly" },
  { path: "/journal", priority: 0.8, changeFrequency: "weekly" },
  { path: "/brief", priority: 0.8, changeFrequency: "monthly" },
  { path: "/privacy", priority: 0.3, changeFrequency: "yearly" },
] as const;
