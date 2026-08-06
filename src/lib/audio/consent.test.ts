import { beforeEach, describe, expect, it } from "vitest";

import {
  CONSENT_KEY,
  clearConsent,
  purgeLegacyConsent,
  readConsent,
  writeConsent,
} from "./consent";

/**
 * FR-01, as amended: the choice lasts one session rather than 180 days.
 *
 * The expiry tests that used to live here are gone on purpose. There is no
 * clock any more — sessionStorage ends when the session does — so there is no
 * boundary to get wrong. What remains is the part that can still fail: reading
 * something that is not a valid answer, and storage that refuses to cooperate.
 */

/** Minimal in-memory Storage, with optional failure injection. */
function makeStorage(options: { throwOn?: "get" | "set" | "remove" } = {}) {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    key: (i: number) => [...map.keys()][i] ?? null,
    getItem(key: string) {
      if (options.throwOn === "get") throw new Error("denied");
      return map.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      if (options.throwOn === "set") throw new Error("quota");
      map.set(key, value);
    },
    removeItem(key: string) {
      if (options.throwOn === "remove") throw new Error("denied");
      map.delete(key);
    },
    clear: () => map.clear(),
    raw: map,
  } as Storage & { raw: Map<string, string> };
}

let storage: ReturnType<typeof makeStorage>;

beforeEach(() => {
  storage = makeStorage();
});

describe("readConsent", () => {
  it("is pending with nothing stored", () => {
    expect(readConsent(storage)).toBe("pending");
  });

  it("returns a stored choice", () => {
    writeConsent("granted", storage);
    expect(readConsent(storage)).toBe("granted");

    writeConsent("declined", storage);
    expect(readConsent(storage)).toBe("declined");
  });

  it("holds the choice across reads within the session", () => {
    // The behaviour that makes the gate bearable: answered once, it stays
    // answered while someone moves around the site.
    writeConsent("declined", storage);
    expect(readConsent(storage)).toBe("declined");
    expect(readConsent(storage)).toBe("declined");
  });

  it("is pending again in a fresh session", () => {
    writeConsent("granted", storage);
    // A new session is a new store. This is the whole point of the change:
    // closing the tab returns the gate rather than suppressing it for 180 days.
    expect(readConsent(makeStorage())).toBe("pending");
  });

  it.each([
    ["maybe", "unknown value"],
    ["", "empty string"],
    ["GRANTED", "wrong case"],
    ['{"value":"granted","expiresAt":99999999999999}', "the old 180-day record"],
    ['"granted"', "quoted"],
    ["null", "null"],
  ])("rejects a value that is not an answer: %s (%s)", (raw) => {
    storage.setItem(CONSENT_KEY, raw);
    expect(readConsent(storage)).toBe("pending");
  });

  it("is pending when storage is unavailable", () => {
    expect(readConsent(null)).toBe("pending");
  });

  it("survives a storage that throws on read, as in private mode", () => {
    const hostile = makeStorage({ throwOn: "get" });
    expect(() => readConsent(hostile)).not.toThrow();
    expect(readConsent(hostile)).toBe("pending");
  });
});

describe("writeConsent", () => {
  it("stores the answer plainly", () => {
    writeConsent("granted", storage);
    expect(storage.getItem(CONSENT_KEY)).toBe("granted");
  });

  it("uses the documented key", () => {
    writeConsent("granted", storage);
    expect(storage.raw.has("timbre.audio.consent")).toBe(true);
  });

  it("overwrites an earlier choice", () => {
    writeConsent("granted", storage);
    writeConsent("declined", storage);
    expect(readConsent(storage)).toBe("declined");
  });

  it("does not throw when storage rejects the write", () => {
    const full = makeStorage({ throwOn: "set" });
    expect(() => writeConsent("granted", full)).not.toThrow();
  });

  it("does nothing without storage", () => {
    expect(() => writeConsent("granted", null)).not.toThrow();
  });
});

describe("clearConsent", () => {
  it("returns the gate to pending", () => {
    writeConsent("granted", storage);
    clearConsent(storage);
    expect(readConsent(storage)).toBe("pending");
  });

  it("does not throw when storage rejects the removal", () => {
    const hostile = makeStorage({ throwOn: "remove" });
    expect(() => clearConsent(hostile)).not.toThrow();
  });
});

describe("purgeLegacyConsent", () => {
  it("removes the record the 180-day implementation left behind", () => {
    const legacy = makeStorage();
    legacy.setItem(
      CONSENT_KEY,
      JSON.stringify({ value: "granted", expiresAt: 1801553809216 }),
    );

    purgeLegacyConsent(legacy);
    expect(legacy.getItem(CONSENT_KEY)).toBeNull();
  });

  it("does not throw when storage rejects the removal", () => {
    const hostile = makeStorage({ throwOn: "remove" });
    expect(() => purgeLegacyConsent(hostile)).not.toThrow();
  });

  it("does nothing without storage", () => {
    expect(() => purgeLegacyConsent(null)).not.toThrow();
  });
});
