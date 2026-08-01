import { beforeEach, describe, expect, it } from "vitest";

import { DRAFT_KEY, DRAFT_TTL_MS, clearDraft, readDraft, writeDraft } from "./storage";

function memoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (key) => map.get(key) ?? null,
    key: (index) => [...map.keys()][index] ?? null,
    removeItem: (key) => void map.delete(key),
    setItem: (key, value) => void map.set(key, value),
  } as Storage;
}

/** Storage that throws on everything, as Safari private mode does. */
function hostileStorage(): Storage {
  const boom = () => {
    throw new DOMException("denied");
  };
  return {
    get length(): number {
      return boom();
    },
    clear: boom,
    getItem: boom,
    key: boom,
    removeItem: boom,
    setItem: boom,
  } as unknown as Storage;
}

let store: Storage;

beforeEach(() => {
  store = memoryStorage();
});

describe("draft persistence, FR-15", () => {
  it("round-trips values and the step", () => {
    writeDraft({ name: "Tobias Renner" }, 2, 1000, store);
    const draft = readDraft(1000, store);
    expect(draft?.values.name).toBe("Tobias Renner");
    expect(draft?.step).toBe(2);
  });

  it("returns null when nothing is stored", () => {
    expect(readDraft(0, store)).toBeNull();
  });

  it("expires a stale draft rather than resurrecting old answers", () => {
    writeDraft({ name: "Old" }, 0, 0, store);
    expect(readDraft(DRAFT_TTL_MS - 1, store)).not.toBeNull();
    expect(readDraft(DRAFT_TTL_MS + 1, store)).toBeNull();
  });

  it("survives corrupt JSON", () => {
    store.setItem(DRAFT_KEY, "{not json");
    expect(readDraft(0, store)).toBeNull();
  });

  it("rejects well-formed JSON of the wrong shape", () => {
    store.setItem(DRAFT_KEY, JSON.stringify({ hello: "world" }));
    expect(readDraft(0, store)).toBeNull();
    store.setItem(DRAFT_KEY, JSON.stringify({ savedAt: 1, values: null }));
    expect(readDraft(0, store)).toBeNull();
  });

  it("defaults a missing step to the first one", () => {
    store.setItem(DRAFT_KEY, JSON.stringify({ savedAt: 1, values: {} }));
    expect(readDraft(1, store)?.step).toBe(0);
  });

  it("clears on demand", () => {
    writeDraft({ name: "x" }, 1, 0, store);
    clearDraft(store);
    expect(readDraft(0, store)).toBeNull();
  });

  it("never throws when storage is unavailable", () => {
    // Private browsing throws on access, and a form that crashes while trying
    // to recover from a crash is worse than one that simply forgets.
    const hostile = hostileStorage();
    expect(() => writeDraft({ name: "x" }, 0, 0, hostile)).not.toThrow();
    expect(() => clearDraft(hostile)).not.toThrow();
    expect(readDraft(0, hostile)).toBeNull();
  });

  it("does nothing when there is no storage at all", () => {
    expect(readDraft(0, null)).toBeNull();
    expect(() => writeDraft({}, 0, 0, null)).not.toThrow();
    expect(() => clearDraft(null)).not.toThrow();
  });
});
