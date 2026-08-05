import type { Page } from "@playwright/test";

/**
 * Shared helpers.
 *
 * Every test starts on a fresh context, so the consent gate is present on every
 * first navigation and has to be answered before anything else is reachable.
 * That is the point of the gate, not an obstacle to work around.
 */

export const ROUTES = [
  { path: "/", name: "home" },
  { path: "/work", name: "work index" },
  { path: "/work/kestrel", name: "case study" },
  { path: "/services", name: "services" },
  { path: "/process", name: "process" },
  { path: "/studio", name: "studio" },
  { path: "/journal", name: "journal index" },
  { path: "/journal/governance-is-the-deliverable", name: "journal post" },
  { path: "/brief", name: "brief" },
  { path: "/privacy", name: "privacy" },
] as const;

/** Answers the gate. Declining keeps the suite silent and deterministic. */
export async function answerConsent(
  page: Page,
  choice: "play" | "silent" = "silent",
): Promise<void> {
  const gate = page.getByRole("dialog", { name: /timbre/i });
  if (!(await gate.isVisible().catch(() => false))) return;

  await page
    .getByRole("button", {
      name: choice === "play" ? /play the room/i : /stay silent/i,
    })
    .click();

  await gate.waitFor({ state: "detached" });
}

/** Navigates and answers the gate in one step. */
export async function visit(page: Page, path: string): Promise<void> {
  await page.goto(path);
  await answerConsent(page);
}
