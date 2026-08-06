import { expect, test } from "@playwright/test";

import { ROUTES, visit } from "./support";

/**
 * The site controls that replaced the §8 transport bar.
 *
 * What can be asserted here is structure and reachability. Whether the
 * container's Web Audio actually starts is not something this suite can rely
 * on — the same limit `work-rail.spec.ts` documents — so nothing below depends
 * on a sound having been made. The parts that need ears are checked by hand.
 */

test.describe("site controls", () => {
  test("carries exactly two controls", async ({ page }) => {
    await visit(page, "/");

    const cluster = page.locator("[data-site-controls]");
    await expect(cluster).toBeVisible();
    await expect(cluster.getByRole("button")).toHaveCount(2);
  });

  test("has retired every control the bar carried", async ({ page }) => {
    await visit(page, "/");

    // Each of these was a real element until this change. Naming them
    // individually means a revert shows up as a failure here rather than as a
    // bar quietly reappearing.
    await expect(page.getByRole("button", { name: /play the reel/i })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /pause the reel/i })).toHaveCount(0);
    await expect(page.getByRole("slider", { name: /scroll progress/i })).toHaveCount(0);
    await expect(page.getByTestId("transport-meter")).toHaveCount(0);
    await expect(page.getByText(/showreel bed/i)).toHaveCount(0);
    // The timecode: "0:11 / 0:16".
    await expect(page.getByText(/^\d+:\d{2} \/ \d+:\d{2}$/)).toHaveCount(0);
  });

  test("gives the page back its reserved band", async ({ page }) => {
    await visit(page, "/");

    // §5 held 64px at the bottom of every viewport for a bar that no longer
    // exists. Only the device safe area should remain, which is zero here.
    const padding = await page.evaluate(
      () => getComputedStyle(document.body).paddingBottom,
    );
    expect(padding).toBe("0px");
  });

  /**
   * FR-06's real requirement, which survives the redesign: whatever the
   * controls look like, they are never absent.
   *
   * One test per route rather than one loop over all ten, matching the pattern
   * a11y.spec.ts already uses for route sweeps. Two reasons, both learned here:
   * a single navigation that fails names the route in the test title instead of
   * inside a loop counter, and a retry re-runs one navigation rather than all
   * ten. The loop version flaked on a WebKit internal error at /work/kestrel,
   * and retrying it meant redoing nine navigations that were already fine.
   *
   * Navigated rather than visited, for the reason csp.spec.ts records —
   * answering the gate on every route costs about 29 seconds and blows WebKit's
   * budget. The gate proves nothing here anyway: the controls mount with the
   * layout, so they are in the DOM whether or not anyone has chosen yet.
   */
  for (const route of ROUTES) {
    test(`is present on ${route.name}`, async ({ page }) => {
      await page.goto(route.path);
      await expect(page.locator("[data-site-controls]")).toBeVisible();
    });
  }
});

test.describe("the sound toggle", () => {
  test("meets the target size in SC 2.5.8", async ({ page }) => {
    await visit(page, "/");

    const box = await page.locator("[data-sound-toggle]").boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThanOrEqual(44);
    expect(box!.height).toBeGreaterThanOrEqual(44);
  });

  test("names the action rather than the state", async ({ page }) => {
    await visit(page, "/"); // declines, so nothing is audible

    // "Turn sound on" says what the click does. A bare "Sound" or an icon with
    // no name leaves a screen-reader user to guess which way the switch is.
    await expect(page.locator("[data-sound-toggle]")).toHaveAttribute(
      "aria-label",
      /turn sound on/i,
    );
  });

  test("reverses a refusal, §10", async ({ page }) => {
    await visit(page, "/"); // answers the gate with "Stay silent"

    expect(
      await page.evaluate(() => sessionStorage.getItem("timbre.audio.consent")),
    ).toBe("declined");

    await page.locator("[data-sound-toggle]").click();

    /**
     * The consent decision itself has to be reversible, and this is the only
     * place it reverses now that the transport bar is gone. Asserted through
     * the stored choice rather than through audio, which the container cannot
     * guarantee will start.
     */
    await expect
      .poll(() =>
        page.evaluate(() => sessionStorage.getItem("timbre.audio.consent")),
      )
      .toBe("granted");
  });

  test("is reachable and operable from the keyboard", async ({ page }) => {
    await visit(page, "/");

    const toggle = page.locator("[data-sound-toggle]");
    await toggle.focus();
    await expect(toggle).toBeFocused();

    await page.keyboard.press("Enter");
    await expect
      .poll(() =>
        page.evaluate(() => sessionStorage.getItem("timbre.audio.consent")),
      )
      .toBe("granted");
  });
});

test.describe("the desk trigger", () => {
  test("still opens the only navigation the site has", async ({ page }) => {
    await visit(page, "/");

    await page
      .getByRole("button", { name: /mixing desk navigation/i })
      .click();

    const desk = page.getByRole("dialog", { name: /mixing desk navigation/i });
    await expect(desk).toBeVisible();

    // The desk sat above the bar and now sits on the bottom edge. If it is
    // still offset by a bar that no longer exists, there is a 64px strip of
    // dead space under it that nothing explains.
    const box = await desk.boundingBox();
    const viewport = page.viewportSize();
    expect(box).not.toBeNull();
    expect(viewport).not.toBeNull();
    expect(box!.y + box!.height).toBeCloseTo(viewport!.height, 0);
  });
});
