import { expect, test } from "@playwright/test";

import { answerConsent } from "./support";

/**
 * The audio consent gate, FR-01 and §10.
 *
 * The gate is the one piece of the product with a legal edge: nothing may play
 * before an explicit gesture, and declining has to be a real choice rather than
 * a nudge toward the other button.
 */

test.describe("consent gate", () => {
  test("blocks the page until answered", async ({ page }) => {
    await page.goto("/");

    const gate = page.getByRole("dialog", { name: /timbre/i });
    await expect(gate).toBeVisible();
    await expect(gate).toHaveAttribute("aria-modal", "true");

    await expect(page.getByRole("button", { name: /play the room/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /stay silent/i })).toBeVisible();
  });

  test("offers both paths as equally weighted controls", async ({ page }) => {
    await page.goto("/");

    // §10: declining is a genuine choice. If it were a text link beside a
    // button, the choice would be nominal.
    const play = page.getByRole("button", { name: /play the room/i });
    const silent = page.getByRole("button", { name: /stay silent/i });

    const playBox = await play.boundingBox();
    const silentBox = await silent.boundingBox();

    expect(playBox).not.toBeNull();
    expect(silentBox).not.toBeNull();
    // Same width, and both clear the 44px target minimum in SC 2.5.8.
    expect(Math.abs(playBox!.width - silentBox!.width)).toBeLessThan(2);
    expect(silentBox!.height).toBeGreaterThanOrEqual(44);
  });

  test("says plainly that everything works without sound", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText(/everything works without sound/i)).toBeVisible();
  });

  test("moves focus into the dialog and traps it", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("button", { name: /play the room/i })).toBeFocused();

    // Tabbing past the last control must come back to the first, not escape
    // into content nobody can see behind the gate.
    await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name: /stay silent/i })).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name: /play the room/i })).toBeFocused();
  });

  test("does not dismiss on Escape", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("Escape");
    // Dismissing without choosing would leave audio in an undefined state.
    await expect(page.getByRole("dialog", { name: /timbre/i })).toBeVisible();
  });

  test("remembers a declined choice across a reload", async ({ page }) => {
    await page.goto("/");
    await answerConsent(page, "silent");

    await page.reload();
    await expect(page.getByRole("dialog", { name: /timbre/i })).toBeHidden();
  });

  test("remembers a granted choice across a reload", async ({ page }) => {
    await page.goto("/");
    await answerConsent(page, "play");

    await page.reload();
    await expect(page.getByRole("dialog", { name: /timbre/i })).toBeHidden();
  });

  test("leaves the page fully readable after declining", async ({ page }) => {
    await page.goto("/");
    await answerConsent(page, "silent");

    // Content parity is the whole claim of the sound-off path.
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByText(/sonic identity studio/i).first()).toBeVisible();
  });
});
