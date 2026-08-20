import { expect, test } from "@playwright/test";

import { openDesk, ROUTES, visit } from "./support";

/**
 * Client-side teardown, for every route.
 *
 * ## Why this file exists
 *
 * `ProcessTimeline` pinned with `pin: true` and cleaned up in a passive
 * `useEffect`. `pin: true` makes ScrollTrigger wrap the pinned section in a
 * `pin-spacer` div, reparenting it out from under React; a passive cleanup
 * reverts that *after* React has detached the subtree, so React calls
 * removeChild on the original parent and the browser throws:
 *
 *     NotFoundError: Failed to execute 'removeChild' on 'Node':
 *     The node to be removed is not a child of this node.
 *
 * That exception escapes rendering. React unwinds the tree, hits the same
 * failure again, and the recursion takes the renderer with it — the browser
 * shows its own error page and every control on the site is gone, including
 * the back button. It shipped to production and broke every navigation after
 * a visitor opened `/process`.
 *
 * `WorkRail` had the identical bug and the identical fix months earlier. The
 * reason the second one still shipped is that **nothing in this suite listened
 * for `pageerror`**. Every spec asserts on content rendered *before* the
 * navigation away, so a tree that dies on unmount leaves no failing assertion.
 * The existing tests were all passing while the site was broken.
 *
 * So this does not test `ProcessTimeline`. It tests the property that was
 * actually missing: leaving a route must not throw. Any future component that
 * reparents DOM outside React — a pin, a Flip, a portal, a third-party widget —
 * fails here rather than in a visitor's browser.
 *
 * A hard `page.goto` would not catch this. It tears the document down without
 * ever asking React to unmount, which is why manual spot-checks of these routes
 * looked fine. The teardown only runs on a client-side navigation, so each case
 * leaves by clicking a real in-page link.
 */

/** The home mark is in the root layout, so it is on every route. */
const HOME_LINK = 'a[href="/"]';

/**
 * Clicks an in-app link, opening the desk first when that is where it lives.
 *
 * `/process`, `/studio` and `/work` are reachable only from the mixing desk,
 * which is why they went untested: a crawl of the page body never finds them.
 */
async function clickInAppLink(
  page: import("@playwright/test").Page,
  href: string,
): Promise<void> {
  const link = page.locator(`a[href="${href}"]`).first();
  if (!(await link.isVisible().catch(() => false))) {
    await openDesk(page);
  }
  const inDesk = page.locator(`a[href="${href}"]`).first();
  await inDesk.waitFor({ state: "visible" });
  await inDesk.click();
}

for (const route of ROUTES) {
  test(`leaving ${route.name} does not throw`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(String(error)));

    await visit(page, route.path);

    // Pins build their spacer when the ScrollTrigger is created, but scrolling
    // first also engages the pin itself and any triggers nested inside it.
    await page.evaluate(() => window.scrollTo(0, window.innerHeight * 2));
    await page.waitForTimeout(400);

    // A client-side navigation, which is the only thing that unmounts the tree.
    if (route.path === "/") {
      await clickInAppLink(page, "/process");
      await expect(page).toHaveURL(/\/process$/);
    } else {
      await page.locator(HOME_LINK).first().click();
      await expect(page).toHaveURL(/\/$/);
    }

    // The tree has to still be there. A dead tree renders nothing, so asserting
    // on a live landmark separates "no error" from "no page".
    await expect(page.locator("main")).toBeVisible();

    expect(errors, `uncaught error(s) leaving ${route.path}`).toEqual([]);
  });
}

/**
 * The reported reproduction, exactly: reach `/process` through the desk, then
 * keep navigating. The original failure needed the pinned route to be entered
 * and left through in-app navigation several times over.
 */
test("repeated desk navigation through the pinned route survives", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(String(error)));

  await visit(page, "/");

  for (const path of ["/process", "/journal", "/brief", "/process", "/work"]) {
    await clickInAppLink(page, path);
    await expect(page).toHaveURL(new RegExp(`${path.replace("/", "\\/")}$`));
    await page.evaluate(() => window.scrollTo(0, window.innerHeight));
    await page.waitForTimeout(300);
    await page.locator(HOME_LINK).first().click();
    await expect(page).toHaveURL(/\/$/);
  }

  await expect(page.locator("main")).toBeVisible();
  expect(errors, "uncaught error(s) during repeated desk navigation").toEqual(
    [],
  );
});
