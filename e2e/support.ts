import type { Page } from "@playwright/test";

/**
 * Shared helpers.
 *
 * Every test starts on a fresh context, which is a fresh session, so the gate is
 * present on every first navigation and has to be answered before anything else
 * is reachable. That is the point of the gate, not an obstacle to work around.
 *
 * Within one test the choice persists, so `visit` can be called repeatedly and
 * only the first call sees a gate to answer.
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

/**
 * Opens the mixing desk with its keyboard shortcut.
 *
 * The shortcut is scoped to focus, per WCAG 2.1.4 — a bare single-character
 * shortcut listening on the document is neither remappable, switchable off, nor
 * focus-scoped, and a screen reader claims those keys for its own navigation
 * anyway. So reaching the control comes first, exactly as a visitor would.
 */
export async function openDesk(page: Page): Promise<void> {
  await page
    .getByRole("button", { name: /mixing desk navigation/i })
    .focus();
  await page.keyboard.press("m");
}
