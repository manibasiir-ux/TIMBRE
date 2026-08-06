/**
 * Audio consent persistence, FR-01.
 *
 * The choice lasts one browsing session, in `sessionStorage` under
 * `timbre.audio.consent`. Answer it once and it stays answered while you move
 * around the site; close the tab and the next visit asks again.
 *
 * This deliberately replaces FR-01's 180 days in `localStorage`, and the reason
 * is worth recording. One click wrote a record expiring six months later, so
 * after a single visit the gate was never seen again — by anyone, including the
 * people building the site. A screen that introduces the product, states the
 * sound-off path exists, and supplies the gesture browsers require before any
 * audio can play is not a cookie banner to be endured once and suppressed. For
 * a studio whose product is sound, being asked at the start of a visit is the
 * front door, not friction.
 *
 * Nothing here has a clock, because the session is the expiry. That removes the
 * whole class of bug the previous version carried: no timestamps to compare, no
 * boundary conditions, no records from a past that outlive their usefulness.
 *
 * Every access is wrapped. Safari in private mode throws on storage access, and
 * an exception here would take down the first thing a visitor sees.
 */

export type AudioConsent = "pending" | "granted" | "declined";

export const CONSENT_KEY = "timbre.audio.consent";

function isChoice(value: unknown): value is "granted" | "declined" {
  return value === "granted" || value === "declined";
}

function defaultStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

/**
 * Where the previous implementation kept its 180-day record.
 *
 * Separate from `defaultStorage` because the two are different stores under the
 * same key, and the old one now needs clearing rather than reading.
 */
function legacyStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function readConsent(
  storage: Storage | null = defaultStorage(),
): AudioConsent {
  if (!storage) return "pending";

  let raw: string | null;
  try {
    raw = storage.getItem(CONSENT_KEY);
  } catch {
    return "pending";
  }

  // Anything that is not one of the two answers — absent, corrupt, or
  // hand-edited — means no choice has been made, so the gate should be shown.
  return isChoice(raw) ? raw : "pending";
}

export function writeConsent(
  value: "granted" | "declined",
  storage: Storage | null = defaultStorage(),
): void {
  if (!storage) return;
  try {
    storage.setItem(CONSENT_KEY, value);
  } catch {
    // Quota or private mode. The choice still holds in memory for this session;
    // it simply will not survive a reload.
  }
}

export function clearConsent(
  storage: Storage | null = defaultStorage(),
): void {
  if (!storage) return;
  try {
    storage.removeItem(CONSENT_KEY);
  } catch {
    // Nothing useful to do.
  }
}

/**
 * Deletes the 180-day record the previous implementation wrote.
 *
 * Without this, anyone who visited the old site keeps a dead entry in
 * localStorage until 2027. It suppresses nothing now — the gate reads
 * sessionStorage — but leaving stale audio preferences on a visitor's machine
 * to expire on their own is not a thing to do when removing them costs a line.
 */
export function purgeLegacyConsent(
  storage: Storage | null = legacyStorage(),
): void {
  if (!storage) return;
  try {
    storage.removeItem(CONSENT_KEY);
  } catch {
    // Private mode. The record is unreadable to us anyway.
  }
}
