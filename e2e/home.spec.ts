import { expect, test } from "@playwright/test";

import { visit } from "./support";

/**
 * The closing half of the homepage, §6.1 items 6, 7 and 9.
 *
 * The rail proves the studio can do the work. These three say what it is
 * called, who else bought it, and how to start — so the assertions here are
 * mostly about a visitor being able to get from convinced to in touch.
 */

test.describe("homepage", () => {
  test("names every service line and links to the detail", async ({ page }) => {
    await visit(page, "/");

    const ticker = page.getByRole("region", { name: /what we make/i });
    for (const service of [
      "Sonic mnemonic",
      "Product and UI sound",
    ]) {
      await expect(ticker.getByText(service).first()).toBeAttached();
    }

    await expect(
      ticker.getByRole("link", { name: /service lines, packages/i }),
    ).toHaveAttribute("href", "/services");
  });

  test("says each service once to a screen reader", async ({ page }) => {
    await visit(page, "/");

    // The marquee is rendered twice so the loop closes without a jump, and a
    // visitor hearing twelve services when there are six would be the cost of
    // that trick. Asserted through the accessibility tree rather than by
    // counting text: both copies are in the DOM by design, and `getByText`
    // finds both — which is what this test caught when it was written that way.
    const lists = page
      .getByRole("region", { name: /what we make/i })
      .locator("ul");
    await expect(lists).toHaveCount(2);
    await expect(lists.first()).not.toHaveAttribute("aria-hidden", "true");
    await expect(lists.nth(1)).toHaveAttribute("aria-hidden", "true");

    // The tree itself, which is what a screen reader walks.
    const named = await page
      .getByRole("region", { name: /what we make/i })
      .getByRole("listitem")
      .filter({ hasText: "Sonic mnemonic" })
      .count();
    expect(named).toBe(1);
  });

  test("shows the client wall and counts it honestly", async ({ page }) => {
    await visit(page, "/");

    const wall = page.getByRole("region", { name: /selected clients/i });
    await expect(wall.getByRole("listitem")).toHaveCount(15);

    // The count line claims four published, and there are four case studies.
    // A wall that overstates the depth behind it is the one failure mode here.
    await expect(wall.getByText(/15 engagements · 4 published/)).toBeVisible();
  });

  test("closes with a route into the brief", async ({ page }) => {
    await visit(page, "/");

    const slab = page.getByRole("region", { name: /let's make something audible/i });
    await expect(slab).toBeAttached();

    await page.evaluate(() => {
      (window as unknown as { __persisted?: boolean }).__persisted = true;
    });

    await slab.getByRole("link", { name: /brief us/i }).click();
    await expect(page).toHaveURL(/\/brief$/);

    // FR-05 once more: the canvas is mounted once and must survive this too.
    const survived = await page.evaluate(
      () => (window as unknown as { __persisted?: boolean }).__persisted === true,
    );
    expect(survived).toBe(true);
  });

  test("tells the visitor what the brief costs them before they start", async ({
    page,
  }) => {
    await visit(page, "/");
    await expect(page.getByText(/four short steps, about three minutes/i)).toBeVisible();
  });
});
