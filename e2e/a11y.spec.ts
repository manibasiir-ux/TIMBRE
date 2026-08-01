import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { ROUTES, answerConsent, visit } from "./support";

/**
 * Accessibility, NFR-16 and the M7 gate: zero serious or critical issues.
 *
 * Moderate and minor findings are reported but not failed. A gate that fails on
 * everything gets disabled within a fortnight, and the roadmap's count of
 * eleven serious defects is the standard being held to here.
 */

const BLOCKING = new Set(["serious", "critical"]);

async function audit(page: import("@playwright/test").Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();

  const blocking = results.violations.filter((violation) =>
    BLOCKING.has(violation.impact ?? ""),
  );

  return { results, blocking };
}

function describeViolations(
  violations: Awaited<ReturnType<typeof audit>>["blocking"],
): string {
  return violations
    .map(
      (violation) =>
        `${violation.impact}: ${violation.id} — ${violation.help}\n    ${violation.nodes
          .slice(0, 3)
          .map((node) => node.target.join(" "))
          .join("\n    ")}`,
    )
    .join("\n  ");
}

test.describe("accessibility", () => {
  for (const route of ROUTES) {
    test(`${route.name} has no serious or critical issues`, async ({ page }) => {
      await visit(page, route.path);

      const { blocking } = await audit(page);
      expect(
        blocking.length,
        `\n  ${describeViolations(blocking)}\n`,
      ).toBe(0);
    });
  }

  test("the consent gate itself is clean", async ({ page }) => {
    // Audited before it is answered: it is the first thing anyone meets, and
    // every other page is audited after it has gone.
    await page.goto("/");
    await expect(page.getByRole("dialog", { name: /timbre/i })).toBeVisible();

    const { blocking } = await audit(page);
    expect(blocking.length, `\n  ${describeViolations(blocking)}\n`).toBe(0);
  });

  test("the open mixing desk is clean", async ({ page }) => {
    await visit(page, "/");
    await page.keyboard.press("m");
    await expect(
      page.getByRole("dialog", { name: /mixing desk navigation/i }),
    ).toBeVisible();

    const { blocking } = await audit(page);
    expect(blocking.length, `\n  ${describeViolations(blocking)}\n`).toBe(0);
  });

  test("the 404 keeps its navigation", async ({ page }) => {
    await page.goto("/no-such-route");
    await answerConsent(page);

    // FR-24: a dead channel, not a dead end.
    await expect(page.getByRole("heading", { name: /dead channel/i })).toBeVisible();
    await expect(
      page.getByRole("button", { name: /mixing desk navigation/i }),
    ).toBeVisible();

    const { blocking } = await audit(page);
    expect(blocking.length, `\n  ${describeViolations(blocking)}\n`).toBe(0);
  });

  test("a skip link is the first focusable element and works", async ({
    page,
  }) => {
    await visit(page, "/");

    // Answering the gate hands focus to the content on the next frame. Racing
    // that with a focus() of our own makes this test a coin toss, so wait for
    // the handoff to land first — it has its own test below.
    await expect(page.locator("#main")).toBeFocused();

    const skip = page.getByRole("link", { name: /skip to content/i });

    // Asserted as a property of the document rather than by pressing Tab and
    // hoping: after a dialog is removed the browser's sequential-focus starting
    // point is wherever that dialog was, so Tab is a statement about focus
    // restoration, not about the skip link.
    const isFirst = await page.evaluate(() => {
      const focusable = document.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      return focusable[0]?.textContent?.trim() ?? null;
    });
    expect(isFirst).toMatch(/skip to content/i);

    await skip.focus();
    await expect(skip).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/#main$/);
  });

  test("closing the gate hands focus to the content", async ({ page }) => {
    // Otherwise the next Tab starts from where the removed dialog was, which is
    // the end of the document, and a keyboard user is stranded.
    await page.goto("/");
    await answerConsent(page, "silent");
    await expect(page.locator("#main")).toBeFocused();
  });

  test("the canvas is hidden from assistive technology", async ({ page }) => {
    await visit(page, "/");

    // §10: the canvas holds no information absent from the DOM, is never
    // focusable, and the container above it carries the accessible name.
    const canvas = page.locator("canvas");
    if ((await canvas.count()) > 0) {
      await expect(canvas.first()).toHaveAttribute("aria-hidden", "true");
      await expect(canvas.first()).toHaveAttribute("tabindex", "-1");
    }
  });
});
