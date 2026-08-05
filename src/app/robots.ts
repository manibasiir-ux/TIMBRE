import type { MetadataRoute } from "next";

import { absoluteUrl } from "@/lib/site";

/**
 * robots.txt, NFR-11.
 *
 * `/api/` is disallowed because it is the brief endpoint and nothing else: it
 * accepts POSTs and has no content to index, so a crawler hitting it is wasted
 * budget at best and rate-limit noise at worst.
 *
 * Preview deployments are excluded entirely. Vercel gives every preview a
 * public URL, and an indexed preview competes with production for the same
 * queries — the classic way a staging site ends up outranking the real one.
 */
export default function robots(): MetadataRoute.Robots {
  const isProduction = process.env.VERCEL_ENV
    ? process.env.VERCEL_ENV === "production"
    : true;

  if (!isProduction) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/"],
    },
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
