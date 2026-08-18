import { expect, test } from "@playwright/test";

import { visit } from "./support";

/**
 * The mixing desk, §8 and FR-08/FR-09.
 *
 * The roadmap records the second design attempt failing on exactly one line of
 * feedback: "I got in. I could not get out." Most of what follows is about
 * getting out.
 */

test.describe("mixing desk", () => {
  test("opens with M and closes with Escape", async ({ page }) => {
    await visit(page, "/");

    const toggle = page.getByRole("button", { name: /mixing desk navigation/i });
    await expect(toggle).toHaveAttribute("aria-expanded", "false");

    await page.keyboard.press("m");
    const desk = page.getByRole("dialog", { name: /mixing desk navigation/i });
    await expect(desk).toBeVisible();
    await expect(toggle).toHaveAttribute("aria-expanded", "true");

    await page.keyboard.press("Escape");
    await expect(desk).toBeHidden();
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
  });

  test("returns focus to the toggle on close", async ({ page }) => {
    await visit(page, "/");

    await page.keyboard.press("m");
    await expect(
      page.getByRole("dialog", { name: /mixing desk navigation/i }),
    ).toBeVisible();

    await page.keyboard.press("Escape");
    // Leaving focus on a removed node drops a keyboard user to the top of the
    // document, which is how the second design attempt lost people.
    await expect(
      page.getByRole("button", { name: /mixing desk navigation/i }),
    ).toBeFocused();
  });

  test("shows a channel per mix source with slider semantics", async ({
    page,
  }) => {
    await visit(page, "/");
    await page.keyboard.press("m");

    const desk = page.getByRole("dialog", { name: /mixing desk navigation/i });
    const sliders = desk.getByRole("slider");
    // Five audio channels — the room and four client stems — rather than one
    // per section. The faders ride gain nodes now; sections moved to the nav
    // row beneath, which is also the whole desk with sound off.
    await expect(sliders).toHaveCount(5);

    const first = sliders.first();
    await expect(first).toHaveAttribute("aria-valuemin", "0");
    await expect(first).toHaveAttribute("aria-valuemax", "100");
    await expect(first).toHaveAttribute("aria-valuenow", /\d+/);
  });

  test("gives every fader a value text, not a bare number", async ({ page }) => {
    await visit(page, "/");
    await page.keyboard.press("m");

    const sliders = page
      .getByRole("dialog", { name: /mixing desk navigation/i })
      .getByRole("slider");

    // The defect the roadmap names: VoiceOver announced "forty" with no unit
    // and no context.
    for (const slider of await sliders.all()) {
      const text = await slider.getAttribute("aria-valuetext");
      expect(text).toMatch(/^[A-Za-z]+, \d+ percent$/);
    }
  });

  test("moves focus between channels with the arrow keys", async ({ page }) => {
    await visit(page, "/");
    await page.keyboard.press("m");

    const desk = page.getByRole("dialog", { name: /mixing desk navigation/i });
    await expect(desk.getByRole("slider").first()).toBeFocused();

    await page.keyboard.press("ArrowDown");
    await expect(desk.getByRole("slider").nth(1)).toBeFocused();

    await page.keyboard.press("ArrowUp");
    await expect(desk.getByRole("slider").first()).toBeFocused();
  });

  test("never offers a channel that goes nowhere", async ({ page }) => {
    await visit(page, "/");
    await page.keyboard.press("m");

    const nav = page.getByRole("navigation", { name: /sections/i });

    // The rule survives its move. It was never about Journal, or about faders:
    // a destination that 404s is worse than one that says so. Sections now live
    // in the nav row, so that is where it is asserted — every section is either
    // a link or plain text, and never a link to nowhere.
    for (const item of await nav.getByRole("listitem").all()) {
      const links = await item.getByRole("link").count();
      const label = (await item.textContent())?.trim() ?? "";
      expect(links, `${label} must be a link or plain text`).toBeLessThan(2);
      if (links === 1) {
        await expect(item.getByRole("link")).toHaveAttribute("href", /^\//);
      }
    }
  });

  test("navigates without reloading the document", async ({ page }) => {
    await visit(page, "/");

    // FR-05: the canvas is mounted once and must survive navigation. A full
    // document load would rebuild it, and a page global is the cheapest way to
    // tell the two apart.
    await page.evaluate(() => {
      (window as unknown as { __persisted?: boolean }).__persisted = true;
    });

    await page.keyboard.press("m");
    // Navigation moved from a Go link on each strip to the section row beneath
    // the mixer, so this now clicks the section by name.
    await page
      .getByRole("navigation", { name: /sections/i })
      .getByRole("link", { name: /^work$/i })
      .click();

    await expect(page).toHaveURL(/\/work$/);
    const survived = await page.evaluate(
      () => (window as unknown as { __persisted?: boolean }).__persisted === true,
    );
    expect(survived).toBe(true);
  });
});
