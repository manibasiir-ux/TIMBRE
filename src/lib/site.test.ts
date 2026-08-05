import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { STATIC_ROUTES, absoluteUrl } from "./site";

/**
 * NFR-11. A sitemap that disagrees with the router is worse than none: it sends
 * crawlers to pages that 404 and stays silent about the ones that convert.
 */

/** Every directory under src/app that renders a static page. */
function routedPaths(): string[] {
  const appDir = join(process.cwd(), "src", "app");
  const found: string[] = [];

  for (const name of readdirSync(appDir)) {
    const full = join(appDir, name);
    if (!statSync(full).isDirectory()) continue;
    // Dynamic segments and route groups are not static routes, and `api` has
    // no page to index.
    if (name.startsWith("[") || name.startsWith("(") || name === "api") continue;
    try {
      if (statSync(join(full, "page.tsx")).isFile()) found.push(`/${name}`);
    } catch {
      // A directory with no page.tsx — providers, and anything else that is
      // structure rather than a route.
    }
  }

  return found;
}

describe("the published route list", () => {
  it("includes the home page", () => {
    expect(STATIC_ROUTES.map((route) => route.path)).toContain("/");
  });

  it("publishes every static route the router renders", () => {
    const published = new Set<string>(STATIC_ROUTES.map((route) => route.path));
    for (const path of routedPaths()) {
      expect(published.has(path), `${path} renders but is not in the sitemap`).toBe(
        true,
      );
    }
  });

  it("does not publish routes that do not exist", () => {
    const routed = new Set([...routedPaths(), "/"]);
    for (const route of STATIC_ROUTES) {
      expect(
        routed.has(route.path),
        `${route.path} is in the sitemap but has no page`,
      ).toBe(true);
    }
  });

  it("gives the home page the highest priority", () => {
    const home = STATIC_ROUTES.find((route) => route.path === "/");
    const others = STATIC_ROUTES.filter((route) => route.path !== "/");
    for (const route of others) {
      expect(route.priority).toBeLessThanOrEqual(home!.priority);
    }
  });

  it("builds absolute URLs, which is what canonicals and sitemaps require", () => {
    expect(absoluteUrl("/work")).toMatch(/^https?:\/\/.+\/work$/);
    expect(absoluteUrl()).toMatch(/^https?:\/\//);
  });
});
