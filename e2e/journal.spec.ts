import { expect, test } from "@playwright/test";

import { visit, openDesk } from "./support";

/**
 * The journal, §6.7 and FR-19.
 *
 * The point of authoring these as MDX is NFR-18: someone who is not a developer
 * adds a file through GitHub's web editor and it appears. So the assertions
 * that matter are the ones that would catch a post silently not appearing, or
 * appearing without the metadata that makes the index usable.
 */

test.describe("journal", () => {
  test("lists entries newest first with their metadata", async ({ page }) => {
    await visit(page, "/journal");

    const rows = page.getByRole("listitem");
    await expect(rows.first()).toBeVisible();

    const dates = await page
      .locator("time")
      .evaluateAll((nodes) =>
        nodes.map((node) => node.getAttribute("datetime") ?? ""),
      );
    expect(dates.length).toBeGreaterThan(1);

    const parsed = dates.map((d) => Date.parse(d));
    const sorted = [...parsed].sort((a, b) => b - a);
    expect(parsed).toEqual(sorted);
  });

  test("flags audio essays and gives every entry a reading time", async ({
    page,
  }) => {
    await visit(page, "/journal");

    await expect(page.getByText(/audio essay/i).first()).toBeVisible();
    const times = await page.getByText(/\d+ min/).count();
    expect(times).toBeGreaterThan(0);
  });

  test("opens a post without reloading the document", async ({ page }) => {
    await visit(page, "/journal");

    // FR-05: the canvas is mounted once and has to survive this like every
    // other navigation on the site.
    await page.evaluate(() => {
      (window as unknown as { __persisted?: boolean }).__persisted = true;
    });

    await page.getByRole("link", { name: /seatbelt chime/i }).click();
    await expect(page).toHaveURL(/\/journal\/the-seatbelt-chime-problem$/);
    await expect(
      page.getByRole("heading", { level: 1, name: /seatbelt chime/i }),
    ).toBeVisible();

    const survived = await page.evaluate(
      () => (window as unknown as { __persisted?: boolean }).__persisted === true,
    );
    expect(survived).toBe(true);
  });

  test("renders MDX prose and the Listen embed", async ({ page }) => {
    await visit(page, "/journal/the-seatbelt-chime-problem");

    // A heading from inside the MDX body, so this fails if the compiler is
    // returning the source rather than rendering it.
    await expect(
      page.getByRole("heading", { name: /an instruction is not a mood/i }),
    ).toBeVisible();

    // §6.7's Listen panel. FR-23: the written equivalent is present in the DOM
    // rather than behind a play button that may never be pressed.
    const listen = page.getByRole("figure");
    await expect(listen.getByText(/◉ LISTEN/)).toBeVisible();
    await expect(
      listen.getByText(/two tones, a rising minor third/i),
    ).toBeAttached();
  });

  test("is reachable from the mixing desk", async ({ page }) => {
    await visit(page, "/");
    await openDesk(page);

    // It shipped disabled for months. Being reachable from the desk is the
    // whole point of building the route.
    //
    // The desk's faders became audio channels, so sections moved to the nav row
    // beneath the mixer. The assertion follows them: Journal is a real link
    // there, not inert text.
    const journal = page
      .getByRole("navigation", { name: /sections/i })
      .getByRole("link", { name: /^journal$/i });

    await expect(journal).toHaveAttribute("href", "/journal");
  });

  test("teases the two most recent posts on the homepage", async ({ page }) => {
    await visit(page, "/");

    const teaser = page.getByRole("region", { name: /from the journal/i });
    await expect(teaser.getByRole("listitem")).toHaveCount(2);
    await expect(
      teaser.getByRole("link", { name: /all entries/i }),
    ).toHaveAttribute("href", "/journal");
  });
});
