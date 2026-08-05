import type { MetadataRoute } from "next";

import { CASES } from "@/content/cases";
import { allPosts } from "@/lib/journal";
import { STATIC_ROUTES, absoluteUrl } from "@/lib/site";

/**
 * The XML sitemap, NFR-11 ("regenerated on build").
 *
 * Generated from the same content the pages are generated from, so it cannot
 * drift: a case study added to `cases.ts` or an `.mdx` file dropped into
 * `content/journal` appears here on the next build without anyone remembering
 * to update a list.
 *
 * Journal posts carry their real publication date. Everything else uses the
 * build time, which is honest — these pages change when the site is deployed
 * and at no other moment.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const builtAt = new Date();

  const statics = STATIC_ROUTES.map((route) => ({
    url: absoluteUrl(route.path),
    lastModified: builtAt,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));

  const work = CASES.map((entry) => ({
    url: absoluteUrl(`/work/${entry.slug}`),
    lastModified: builtAt,
    changeFrequency: "yearly" as const,
    priority: 0.8,
  }));

  const journal = allPosts().map((post) => ({
    url: absoluteUrl(`/journal/${post.slug}`),
    lastModified: new Date(post.date),
    changeFrequency: "yearly" as const,
    priority: 0.6,
  }));

  return [...statics, ...work, ...journal];
}
