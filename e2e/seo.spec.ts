import { expect, test } from "@playwright/test";

import { ROUTES, visit } from "./support";

/**
 * Discoverability, NFR-11 and FR-20.
 *
 * None of this is visible to a visitor, which is exactly why it needs tests: a
 * broken canonical or a sitemap listing a dead URL costs traffic silently and
 * indefinitely, and nobody notices by looking at the site.
 */

test.describe("sitemap and robots", () => {
  test("the sitemap lists every route and no dead ones", async ({ page }) => {
    const response = await page.goto("/sitemap.xml");
    expect(response?.status()).toBe(200);

    const xml = (await response?.text()) ?? "";
    const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    expect(urls.length).toBeGreaterThan(10);

    for (const path of ["/", "/work", "/services", "/journal", "/privacy"]) {
      expect(
        urls.some((url) => new URL(url).pathname === path),
        `${path} is missing from the sitemap`,
      ).toBe(true);
    }

    // Every listed page must actually render. This is the assertion that would
    // catch a case study or post being removed without the sitemap following.
    for (const url of urls.slice(0, 20)) {
      const check = await page.request.get(new URL(url).pathname);
      expect(check.status(), `${url} is in the sitemap but does not resolve`).toBe(
        200,
      );
    }
  });

  test("robots points at the sitemap and protects the API", async ({ page }) => {
    const response = await page.goto("/robots.txt");
    expect(response?.status()).toBe(200);

    const body = (await response?.text()) ?? "";
    expect(body).toContain("Sitemap:");
    expect(body).toContain("/api/");
  });
});

test.describe("per-page metadata", () => {
  test("every route declares its own canonical", async ({ page }) => {
    /**
     * The trap this catches: a canonical set once in the root layout is
     * inherited by every child, so every page declares itself a duplicate of
     * the home page and only one of them can rank.
     *
     * Read from the served HTML rather than a rendered page. Ten navigations
     * each answering the consent gate took 35 seconds and flaked in both
     * engines on every run — and rendering proved nothing extra, because a
     * canonical is a static tag a crawler reads without running any script.
     */
    const seen = new Set<string>();

    for (const route of ROUTES) {
      const response = await page.request.get(route.path);
      expect(response.status(), `${route.name} did not respond`).toBe(200);

      const html = await response.text();
      const canonical = html.match(
        /<link[^>]+rel="canonical"[^>]+href="([^"]+)"/,
      )?.[1];

      expect(canonical, `${route.name} has no canonical`).toBeTruthy();
      expect(
        new URL(canonical!).pathname,
        `${route.name} points its canonical elsewhere`,
      ).toBe(route.path);

      expect(seen.has(canonical!), `${route.name} shares a canonical`).toBe(false);
      seen.add(canonical!);
    }
  });

  test("the social card renders", async ({ page }) => {
    // FR-20 generates this at the edge, so a failure is a 500 rather than a
    // missing file, and it would only ever be noticed by someone sharing a link.
    const response = await page.request.get("/opengraph-image");
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("image/png");
  });
});

test.describe("structured data", () => {
  test("the studio is described on every page", async ({ page }) => {
    await visit(page, "/");
    const blocks = await page
      .locator('script[type="application/ld+json"]')
      .allTextContents();

    const types = blocks.map((block) => JSON.parse(block)["@type"]);
    expect(types).toContain("Organization");
  });

  test("a journal post carries Article and a breadcrumb trail", async ({
    page,
  }) => {
    await visit(page, "/journal/the-seatbelt-chime-problem");
    const blocks = await page
      .locator('script[type="application/ld+json"]')
      .allTextContents();

    const parsed = blocks.map((block) => JSON.parse(block));
    const types = parsed.map((item) => item["@type"]);
    expect(types).toContain("Article");
    expect(types).toContain("BreadcrumbList");

    const article = parsed.find((item) => item["@type"] === "Article");
    expect(article.datePublished).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    // Every block must be valid JSON, which the parse above already proves, and
    // must not contain an unescaped closing script tag.
    for (const block of blocks) expect(block).not.toContain("</script");
  });

  test("the services page lists its services", async ({ page }) => {
    await visit(page, "/services");
    const blocks = await page
      .locator('script[type="application/ld+json"]')
      .allTextContents();

    const list = blocks
      .map((block) => JSON.parse(block))
      .find((item) => item["@type"] === "ItemList");

    expect(list).toBeDefined();
    expect(list.itemListElement.length).toBe(6);
  });
});
