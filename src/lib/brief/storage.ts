import type { BriefPayload } from "./schema";

/**
 * Draft persistence, FR-15 and edge case E7.
 *
 * A four-step form is long enough that a reload, a crash or a failed submit
 * mid-way is a real event, and losing the answers is the point at which someone
 * gives up rather than starts again. The draft is written on every change and
 * cleared only on a successful submission.
 *
 * Deliberately localStorage and not a cookie: NFR-13 forbids cookies before
 * consent, and this is the visitor's own text being kept for the visitor's own
 * benefit rather than anything transmitted.
 */

export const DRAFT_KEY = "timbre.brief.draft";
/** Older than this and the draft is more likely to confuse than to help. */
export const DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export type Draft = {
  savedAt: number;
  step: number;
  values: Partial<BriefPayload>;
};

function storage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function readDraft(
  now: number = Date.now(),
  store: Storage | null = storage(),
): Draft | null {
  if (!store) return null;

  let raw: string | null;
  try {
    raw = store.getItem(DRAFT_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Draft;
    if (typeof parsed?.savedAt !== "number") return null;
    if (now - parsed.savedAt > DRAFT_TTL_MS) return null;
    if (typeof parsed.values !== "object" || parsed.values === null) return null;
    return {
      savedAt: parsed.savedAt,
      step: typeof parsed.step === "number" ? parsed.step : 0,
      values: parsed.values,
    };
  } catch {
    // Hand-edited or truncated. Treat as absent rather than crashing the form
    // that is supposed to be recovering from a crash.
    return null;
  }
}

export function writeDraft(
  values: Partial<BriefPayload>,
  step: number,
  now: number = Date.now(),
  store: Storage | null = storage(),
): void {
  if (!store) return;
  try {
    store.setItem(DRAFT_KEY, JSON.stringify({ savedAt: now, step, values }));
  } catch {
    // Quota or private mode. The form still works for this session.
  }
}

export function clearDraft(store: Storage | null = storage()): void {
  if (!store) return;
  try {
    store.removeItem(DRAFT_KEY);
  } catch {
    // Nothing useful to do.
  }
}
