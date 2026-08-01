import { expect, test } from "@playwright/test";

import { visit } from "./support";

/**
 * The brief form, §6.8 and FR-15 through FR-18.
 *
 * The conversion endpoint. A form that silently loses a filled-in brief costs
 * the studio the thing the whole site exists to produce, so the failure paths
 * matter as much as the happy one.
 */

async function fillStepOne(page: import("@playwright/test").Page) {
  await page.getByLabel("Your name").fill("Tobias Renner");
  await page.getByLabel("Company").fill("Kestrel");
  await page.getByLabel("Email").fill("tobias@kestrel.example");

  // Wait for React to have committed, not merely for the DOM to look right.
  //
  // fill() sets the input's value and dispatches the event, then returns. The
  // state update is scheduled. Clicking Continue before it lands validates the
  // previous state and stays on step one — Chromium usually wins the race,
  // WebKit does not.
  //
  // Asserting the field's value does not prove anything here: fill() wrote that
  // value itself, and React only overwrites it on a re-render. The draft does
  // prove it, because it is written from an effect and an effect only runs
  // after a commit.
  await expect
    .poll(
      () =>
        page.evaluate(() => {
          const raw = localStorage.getItem("timbre.brief.draft");
          if (!raw) return null;
          return (JSON.parse(raw) as { values?: { email?: string } }).values
            ?.email ?? null;
        }),
      { message: "waiting for React to commit step one" },
    )
    .toBe("tobias@kestrel.example");
}

/**
 * Every direct POST carries its own x-forwarded-for.
 *
 * The rate limiter keys on client IP, and every request from this suite arrives
 * from the same container, so without this the API tests spend each other's
 * budget: WebKit's run saw a 429 because Chromium's had already used the five
 * allowed in ten minutes. The limiter was right; the tests were sharing an
 * identity.
 */
function asFreshClient(label: string) {
  return { "x-forwarded-for": `203.0.113.${Math.abs(hash(label)) % 254 + 1}` };
}

function hash(value: string): number {
  let out = 0;
  for (let i = 0; i < value.length; i += 1) out = (out * 31 + value.charCodeAt(i)) | 0;
  return out;
}

test.describe("brief form", () => {
  test("blocks advancing past an incomplete step", async ({ page }) => {
    await visit(page, "/brief");

    await page.getByRole("button", { name: /continue/i }).click();

    await expect(page.getByText(/step 01 \/ 04/i)).toBeVisible();
    await expect(page.getByLabel("Your name")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
  });

  test("explains what is wrong in words, not type errors", async ({ page }) => {
    await visit(page, "/brief");
    await page.getByRole("button", { name: /continue/i }).click();

    // "Invalid input" is zod's default and tells a visitor nothing.
    await expect(page.getByText(/please give us a name/i)).toBeVisible();
    await expect(page.getByText("Invalid input")).toHaveCount(0);
  });

  test("labels a field by a real label, filled or empty", async ({ page }) => {
    await visit(page, "/brief");

    // §10 forbids placeholder-only labelling. The label moves out of the way on
    // focus, it does not disappear, so the field keeps its accessible name
    // either way. Asserted against the accessibility tree rather than by
    // filling and reading the value back, which tests the driver rather than
    // the page.
    const name = page.getByLabel("Your name");
    await expect(name).toHaveAttribute("id", "name");

    const labelledCorrectly = await page.evaluate(() => {
      const input = document.getElementById("name");
      const label = document.querySelector('label[for="name"]');
      return {
        hasLabelElement: !!label,
        labelText: label?.textContent?.trim() ?? null,
        // A placeholder is not a label; it disappears the moment anyone types.
        placeholderOnly: !label && !!input?.getAttribute("placeholder"),
      };
    });

    expect(labelledCorrectly.hasLabelElement).toBe(true);
    expect(labelledCorrectly.labelText).toMatch(/your name/i);
    expect(labelledCorrectly.placeholderOnly).toBe(false);

    await name.fill("Tobias Renner");
    // Still labelled after filling: the moved label is still the label.
    await expect(page.getByLabel("Your name")).toBeVisible();
  });

  test("completes all four steps and returns a reference code", async ({
    page,
  }) => {
    await visit(page, "/brief");

    await fillStepOne(page);
    await page.getByRole("button", { name: /continue/i }).click();

    await page.getByRole("button", { name: "Product and UI sound" }).click();
    await page
      .getByLabel(/what is the moment/i)
      .fill("Payment confirmation that lands before the animation does.");
    await page.getByRole("button", { name: /continue/i }).click();

    await page
      .locator("label")
      .filter({ hasText: "£110k – £220k" })
      .click();
    await page.getByRole("button", { name: /continue/i }).click();

    await expect(page.getByText(/step 04 \/ 04/i)).toBeVisible();
    await page.getByRole("button", { name: /send brief/i }).click();

    await expect(page.getByText(/brief received/i)).toBeVisible();
    await expect(page.getByText(/TMB-\d{6}-[A-Z2-9]{3}/)).toBeVisible();
  });

  test("keeps answers across a reload, FR-15", async ({ page }) => {
    await visit(page, "/brief");
    await fillStepOne(page);

    await expect
      .poll(() =>
        page.evaluate(() => localStorage.getItem("timbre.brief.draft") !== null),
      )
      .toBe(true);

    await page.reload();

    await expect(page.getByLabel("Your name")).toHaveValue("Tobias Renner");
    await expect(page.getByLabel("Company")).toHaveValue("Kestrel");
    await expect(page.getByText(/kept what you had already written/i)).toBeVisible();
  });

  test("keeps the draft and offers email when the endpoint fails", async ({
    page,
  }) => {
    await visit(page, "/brief");

    // Edge case E7. The one thing that must never happen is a filled brief
    // vanishing because the network did.
    await page.route("**/api/brief", (route) =>
      route.fulfill({ status: 500, body: "{}" }),
    );

    await fillStepOne(page);
    await page.getByRole("button", { name: /continue/i }).click();
    await page.getByRole("button", { name: "Product and UI sound" }).click();
    await page
      .getByLabel(/what is the moment/i)
      .fill("Payment confirmation that lands before the animation does.");
    await page.getByRole("button", { name: /continue/i }).click();
    await page
      .locator("label")
      .filter({ hasText: "£110k – £220k" })
      .click();
    await page.getByRole("button", { name: /continue/i }).click();
    await page.getByRole("button", { name: /send brief/i }).click();

    await expect(page.getByText(/did not send/i)).toBeVisible();
    await expect(page.getByRole("link", { name: /new@timbre.studio/i })).toBeVisible();

    const draftKept = await page.evaluate(
      () => localStorage.getItem("timbre.brief.draft") !== null,
    );
    expect(draftKept).toBe(true);
  });

  test("rejects a payload with the honeypot filled", async ({ request }) => {
    // FR-17. Answered with a plausible success on purpose: telling a bot it was
    // detected is free information for whoever wrote it.
    const response = await request.post("/api/brief", {
      headers: asFreshClient("honeypot"),
      data: {
        name: "Bot",
        company: "Bot Co",
        role: "",
        email: "bot@example.com",
        services: ["Sonic mnemonic"],
        moment: "Filling in every field I can find.",
        budget: "220+",
        targetDate: "",
        attachmentName: "",
        fax: "caught",
        turnstileToken: "",
      },
    });
    expect(response.status()).toBe(400);
  });

  test("rejects an invalid payload posted directly", async ({ request }) => {
    // The client check is a convenience; anything can POST here.
    const response = await request.post("/api/brief", {
      headers: asFreshClient("invalid-payload"),
      data: { name: "x", email: "not-an-email" },
    });
    expect(response.status()).toBe(400);
    const body = (await response.json()) as { error?: string };
    expect(body.error).toBe("invalid_payload");
  });
});
