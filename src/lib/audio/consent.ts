/**
 * Audio consent persistence, FR-01.
 *
 * The choice is remembered for 180 days under `timbre.audio.consent`. Storage
 * and clock are injected so expiry can be tested without waiting six months,
 * and every access is wrapped: Safari in private mode throws on localStorage,
 * and a thrown error here would take down the consent gate, which is the first
 * thing a visitor sees.
 *
 * A stored value is strictly "granted" or "declined". "pending" means no valid
 * record exists, so the gate should be shown.
 */

export type AudioConsent = "pending" | "granted" | "declined";

export const CONSENT_KEY = "timbre.audio.consent";
export const CONSENT_TTL_DAYS = 180;
export const CONSENT_TTL_MS = CONSENT_TTL_DAYS * 24 * 60 * 60 * 1000;

type StoredConsent = { value: "granted" | "declined"; expiresAt: number };

function isStoredConsent(value: unknown): value is StoredConsent {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    (record.value === "granted" || record.value === "declined") &&
    typeof record.expiresAt === "number" &&
    Number.isFinite(record.expiresAt)
  );
}

function defaultStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function readConsent(
  now: number = Date.now(),
  storage: Storage | null = defaultStorage(),
): AudioConsent {
  if (!storage) return "pending";

  let raw: string | null;
  try {
    raw = storage.getItem(CONSENT_KEY);
  } catch {
    return "pending";
  }
  if (!raw) return "pending";

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // Corrupt or hand-edited. Treat as absent and let it be overwritten.
    return "pending";
  }

  if (!isStoredConsent(parsed)) return "pending";
  if (parsed.expiresAt <= now) return "pending";

  return parsed.value;
}

export function writeConsent(
  value: "granted" | "declined",
  now: number = Date.now(),
  storage: Storage | null = defaultStorage(),
): void {
  if (!storage) return;
  const record: StoredConsent = { value, expiresAt: now + CONSENT_TTL_MS };
  try {
    storage.setItem(CONSENT_KEY, JSON.stringify(record));
  } catch {
    // Quota or private mode. The choice still applies for this session; it
    // simply will not survive a reload.
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
