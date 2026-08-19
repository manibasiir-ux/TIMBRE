import { expect, test } from "@playwright/test";

import { ROUTES, visit, openDesk } from "./support";

/**
 * Content-Security-Policy, NFR-12.
 *
 * A policy is only worth having if it does not break the site, and the failure
 * is silent to anyone not watching the console: a blocked chunk means the
 * sculpture never mounts or the desk never opens, and the page still looks
 * broadly fine. So this watches for violations rather than for symptoms.
 *
 * It also pins the deviation. NFR-12 asks for nonces and `'strict-dynamic'`;
 * that was built and removed because a nonce cannot exist in prerendered HTML —
 * the reasoning is in next.config. These assertions exist so the trade stays a
 * decision rather than becoming an accident: if someone puts `'strict-dynamic'`
 * back without making routes dynamic, the site stops booting and this says so.
 */

test.describe("content security policy", () => {
  test("is strict everywhere it costs nothing", async ({ page }) => {
    const response = await page.request.get("/");
    const policy = response.headers()["content-security-policy"] ?? "";

    for (const directive of [
      "default-src 'self'",
      "connect-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
    ]) {
      expect(policy, `missing ${directive}`).toContain(directive);
    }

    // No script from another origin, whatever is permitted inline.
    expect(policy).toContain("script-src 'self' 'unsafe-inline'");

    /**
     * The production half of a deliberate asymmetry.
     *
     * `next dev` evaluates every module through `eval()`, so development has to
     * allow it or no client JavaScript runs at all — silently, since the
     * server-rendered HTML still arrives looking correct. Production builds
     * contain no `eval()`, so the shipped policy keeps the restriction.
     *
     * This suite runs against `web-prod`, which is what makes this assertion
     * meaningful: it is checking the header real visitors receive.
     */
    expect(policy).not.toContain("unsafe-eval");
  });

  test("does not claim a nonce it cannot deliver", async ({ page }) => {
    // The failure this replaces: a header advertising a nonce over HTML with
    // none on any of its 25 inline scripts, which blocked the entire site.
    const response = await page.request.get("/");
    const policy = response.headers()["content-security-policy"] ?? "";
    const html = await response.text();

    if (policy.includes("nonce-")) {
      expect(
        html,
        "the policy promises a nonce but the HTML carries none",
      ).toContain("nonce=");
    }
  });

  test("blocks nothing on any route", async ({ page }) => {
    const violations: string[] = [];
    page.on("console", (message) => {
      const text = message.text();
      if (/content security policy|refused to (load|execute|apply)/i.test(text)) {
        violations.push(text);
      }
    });

    // Navigated rather than visited: answering the consent gate on all eleven
    // routes took 29 seconds and timed out in WebKit, and it proves nothing
    // extra here. Every chunk this policy could block is requested on load,
    // whether or not anyone has agreed to hear anything.
    for (const route of ROUTES) {
      await page.goto(route.path);
      await page.waitForLoadState("networkidle").catch(() => {});
    }

    expect(violations, `\n  ${violations.join("\n  ")}\n`).toEqual([]);
  });

  test("leaves the sculpture and the desk working under it", async ({ page }) => {
    // The two things a broken script-src takes out first, and the two least
    // obvious from a screenshot.
    await visit(page, "/");
    await openDesk(page);
    await expect(
      page.getByRole("dialog", { name: /mixing desk navigation/i }),
    ).toBeVisible();
  });
});
