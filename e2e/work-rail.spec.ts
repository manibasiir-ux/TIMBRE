import { expect, test } from "@playwright/test";

import { visit } from "./support";

/**
 * The work rail, §6.1 item 5 and FR-04.
 *
 * What this file can and cannot check is worth stating plainly. The rail's
 * structure, its pin, its horizontal scrub and its keyboard behaviour are all
 * DOM-observable and are covered here. The sculpture morph is not: these
 * browsers run under software rendering in the container, so `detectProfile`
 * selects the fallback and there is no canvas to inspect. The morph is verified
 * against a real GPU by reading the canvas back pixel by pixel, and the numbers
 * from that live in sculptureIdentity.
 */

/** Scrolls to the rail and returns the document position of its pin start. */
async function scrollToRail(page: import("@playwright/test").Page) {
  return page.evaluate(() => {
    const heading = document.getElementById("work-rail-title");
    const section = heading?.closest("section");
    if (!section) return null;
    // Once pinned the section is transformed, so its own offset is no longer
    // the pin start; ScrollTrigger's spacer is.
    const spacer = section.closest(".pin-spacer") as HTMLElement | null;
    const top = spacer
      ? spacer.offsetTop
      : section.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top, behavior: "auto" });
    return top;
  });
}

function translateX(transform: string): number {
  if (!transform || transform === "none") return 0;
  const matrix = transform.match(/matrix.*\((.+)\)/);
  if (!matrix) return 0;
  const parts = matrix[1].split(",").map((value) => parseFloat(value.trim()));
  // matrix(a,b,c,d,tx,ty) and matrix3d(...,tx,ty,tz,w).
  return parts.length === 6 ? parts[4] : parts[12];
}

test.describe("work rail", () => {
  test("shows a card for every featured case", async ({ page }) => {
    await visit(page, "/");

    const cards = page.locator("[data-case-card]");
    await expect(cards).toHaveCount(4);

    for (const client of [
      "Kestrel",
      "Halcyon Mobility",
      "Solene Group",
      "European flag carrier",
    ]) {
      await expect(page.getByText(client, { exact: true })).toBeAttached();
    }
  });

  test("is server-rendered, not assembled by script", async ({ page }) => {
    // NFR-11 wants indexable content in the HTML. The rail is the homepage's
    // only route into the case studies, so if it were client-only the crawler
    // would see a homepage with no work on it.
    const response = await page.goto("/");
    const html = (await response?.text()) ?? "";
    expect(html).toContain("Selected work");
    expect(html).toContain("Halcyon Mobility");
  });

  test("holds the viewport while the track moves sideways", async ({ page }) => {
    await visit(page, "/");
    const top = await scrollToRail(page);
    expect(top).not.toBeNull();

    const heading = page.getByRole("heading", { name: /selected work/i });
    await expect(heading).toBeInViewport();

    const track = page.locator("[data-case-card]").first().locator("..");
    const before = translateX(
      await track.evaluate((el) => getComputedStyle(el).transform),
    );

    // Far enough that an unpinned section would have left the viewport
    // entirely, and long enough for a 1.2s scrub to settle.
    await page.evaluate((from) => window.scrollTo({ top: from! + 900 }), top);
    await page.waitForTimeout(2000);

    await expect(heading).toBeInViewport();

    const after = translateX(
      await track.evaluate((el) => getComputedStyle(el).transform),
    );
    expect(after).toBeLessThan(before);
  });

  test("opens a case study without reloading the document", async ({ page }) => {
    await visit(page, "/");
    await scrollToRail(page);

    // FR-05 again. The desk shipped with a bare anchor once, and every
    // navigation silently tore the canvas down; the rail is the other place
    // that mistake is easy to make.
    await page.evaluate(() => {
      (window as unknown as { __persisted?: boolean }).__persisted = true;
    });

    await page.locator("[data-case-card] a").first().click();

    await expect(page).toHaveURL(/\/work\/kestrel$/);
    const survived = await page.evaluate(
      () => (window as unknown as { __persisted?: boolean }).__persisted === true,
    );
    expect(survived).toBe(true);
  });

  test("brings a focused card into view", async ({ page }) => {
    await visit(page, "/");
    await scrollToRail(page);
    await page.waitForTimeout(1500);

    // A pinned horizontal rail keeps every card in the DOM while holding most
    // of them off-screen. Without the focus handler, tabbing to the last card
    // puts the focus ring somewhere nobody can see.
    const last = page.locator("[data-case-card] a").last();
    await last.focus();
    await page.waitForTimeout(1500);

    await expect(last).toBeInViewport();
  });

  test("keeps every card reachable by keyboard", async ({ page }) => {
    await visit(page, "/");
    await scrollToRail(page);

    const links = page.locator("[data-case-card] a");
    await expect(links).toHaveCount(4);

    for (const link of await links.all()) {
      await expect(link).toHaveAttribute("href", /^\/work\//);
    }
  });
});
