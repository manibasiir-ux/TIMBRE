import { expect, test } from "@playwright/test";

import { ROUTES, visit } from "./support";

/**
 * prefers-reduced-motion, §10 and edge case E3.
 *
 * This has been the project's largest untested requirement: the branches exist
 * and are unit-tested, but no real browser session can be made to report the
 * preference. Playwright can, so this is the first time any of it is verified
 * rather than asserted.
 *
 * §10 is explicit that reduced motion is a first-class art direction and not a
 * stripped version — content parity is absolute, and no information may exist
 * only in motion. So these tests check that everything is still *there*, not
 * merely that things stopped moving.
 */

test.describe("reduced motion", () => {
  test("the browser reports the preference", async ({ page }) => {
    await visit(page, "/");
    const reduced = await page.evaluate(
      () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    );
    expect(reduced).toBe(true);
  });

  test("Lenis is never constructed", async ({ page }) => {
    await visit(page, "/");
    // §10 asks for native scrolling here, not smoothed scrolling with shorter
    // durations. Lenis marks the document element when it takes over.
    const smoothing = await page.evaluate(() =>
      document.documentElement.classList.contains("lenis"),
    );
    expect(smoothing).toBe(false);
  });

  test("the hero is never split into per-character spans", async ({ page }) => {
    await visit(page, "/");
    // SplitText rewrites the heading into one span per character, which is
    // noise for a screen reader and pointless when nothing will animate.
    const chars = await page.locator("[data-hero-line] .char").count();
    expect(chars).toBe(0);
  });

  test("the hero lockup is still fully legible", async ({ page }) => {
    await visit(page, "/");

    const lines = page.locator("[data-hero-line]");
    await expect(lines).toHaveCount(3);
    for (const line of await lines.all()) {
      await expect(line).toBeVisible();
      // Opacity is where a reveal that never fires leaves content stranded.
      const opacity = await line.evaluate(
        (element) => getComputedStyle(element).opacity,
      );
      expect(Number(opacity)).toBeGreaterThan(0.99);
    }
  });

  test("manifesto copy is present without scrolling to it", async ({ page }) => {
    await visit(page, "/");

    // The reveal is opacity-only here, and content parity means the words are
    // in the document either way.
    const manifesto = page.getByText(/sound is the only brand asset/i);
    await expect(manifesto).toBeAttached();
  });

  test("the work rail is a plain list, not a pinned scrub", async ({ page }) => {
    await visit(page, "/");

    // §6.1's rail is a horizontal scrub pinned for several viewports. Holding
    // someone in a pinned section while the content moves sideways under them
    // is the exact experience §10 exists to prevent, so here it is four cards
    // stacked down the page — same content, ordinary scrolling.
    const cards = page.locator("[data-case-card]");
    await expect(cards).toHaveCount(4);

    const track = cards.first().locator("..");
    const transform = await track.evaluate(
      (element) => getComputedStyle(element).transform,
    );
    expect(["none", "matrix(1, 0, 0, 1, 0, 0)"]).toContain(transform);

    // Stacked, not laid out in a row.
    const first = await cards.first().boundingBox();
    const second = await cards.nth(1).boundingBox();
    expect(second!.y).toBeGreaterThan(first!.y);
  });

  test("every work card is legible without a morph to explain it", async ({
    page,
  }) => {
    await visit(page, "/");

    // The sculpture holds a fixed pose here, so nothing about a case is
    // carried by the form changing. Content parity means the card says it.
    for (const client of ["Kestrel", "Halcyon Mobility", "Solene Group"]) {
      await expect(page.getByText(client, { exact: true })).toBeAttached();
    }
  });

  test("every route still renders its heading", async ({ page }) => {
    for (const route of ROUTES) {
      await visit(page, route.path);
      await expect(
        page.getByRole("heading", { level: 1 }),
        `${route.name} lost its heading under reduced motion`,
      ).toBeVisible();
    }
  });

  test("the grain overlay stops animating", async ({ page }) => {
    await visit(page, "/");
    const grain = page.locator("[data-decorative-motion]").first();
    if ((await grain.count()) === 0) return;

    const animationName = await grain.evaluate(
      (element) => getComputedStyle(element).animationName,
    );
    expect(animationName).toBe("none");
  });

  test("durations are capped", async ({ page }) => {
    await visit(page, "/brief");

    // §10 caps every transition at 0.2s. Sampled on a real control rather than
    // a synthetic element so it reflects what actually ships.
    const duration = await page
      .getByRole("button", { name: /continue/i })
      .evaluate((element) => getComputedStyle(element).transitionDuration);

    const seconds = duration
      .split(",")
      .map((value) => parseFloat(value))
      .filter((value) => !Number.isNaN(value));

    for (const value of seconds) expect(value).toBeLessThanOrEqual(0.2);
  });

  test("the brief form still completes", async ({ page }) => {
    // The conversion path must not depend on motion being enabled.
    await visit(page, "/brief");

    await page.getByLabel("Your name").fill("Kiri Tanaka");
    await page.getByLabel("Company").fill("Solene Group");
    await page.getByLabel("Email").fill("kiri@solene.example");
    await page.getByRole("button", { name: /continue/i }).click();

    await page.getByRole("button", { name: "Soundscape architecture" }).click();
    await page
      .getByLabel(/what is the moment/i)
      .fill("Arrival, across thirty-one properties.");
    await page.getByRole("button", { name: /continue/i }).click();

    await page.locator("label").filter({ hasText: "£220k+" }).click();
    await page.getByRole("button", { name: /continue/i }).click();
    await page.getByRole("button", { name: /send brief/i }).click();

    await expect(page.getByText(/TMB-\d{6}-[A-Z2-9]{3}/)).toBeVisible();
  });
});
