import { beforeEach, describe, expect, it } from "vitest";

import {
  CONSENT_KEY,
  CONSENT_TTL_MS,
  clearConsent,
  readConsent,
  writeConsent,
} from "./consent";

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

const NOW = Date.UTC(2026, 6, 30);
let storage: ReturnType<typeof makeStorage>;

beforeEach(() => {
  storage = makeStorage();
});

describe("readConsent", () => {
  it("is pending with nothing stored", () => {
    expect(readConsent(NOW, storage)).toBe("pending");
  });

  it("returns a stored choice inside the window", () => {
    writeConsent("granted", NOW, storage);
    expect(readConsent(NOW, storage)).toBe("granted");

    writeConsent("declined", NOW, storage);
    expect(readConsent(NOW, storage)).toBe("declined");
  });

  it("honours the choice for the full 180 days, FR-01", () => {
    writeConsent("granted", NOW, storage);
    const oneDayBefore = NOW + CONSENT_TTL_MS - 24 * 60 * 60 * 1000;
    expect(readConsent(oneDayBefore, storage)).toBe("granted");
  });

  it("expires exactly at the boundary", () => {
    writeConsent("granted", NOW, storage);
    expect(readConsent(NOW + CONSENT_TTL_MS - 1, storage)).toBe("granted");
    expect(readConsent(NOW + CONSENT_TTL_MS, storage)).toBe("pending");
  });

  it("is pending once the window has passed", () => {
    writeConsent("declined", NOW, storage);
    expect(readConsent(NOW + CONSENT_TTL_MS + 1, storage)).toBe("pending");
  });

  it("ignores corrupt JSON rather than throwing", () => {
    storage.setItem(CONSENT_KEY, "{not json");
    expect(readConsent(NOW, storage)).toBe("pending");
  });

  it.each([
    ['{"value":"maybe","expiresAt":99999999999999}', "unknown value"],
    ['{"value":"granted"}', "missing expiry"],
    ['{"value":"granted","expiresAt":"soon"}', "non-numeric expiry"],
    ['{"expiresAt":99999999999999}', "missing value"],
    ["null", "null"],
    ['"granted"', "bare string"],
    ["[]", "array"],
  ])("rejects a malformed record: %s (%s)", (raw) => {
    storage.setItem(CONSENT_KEY, raw);
    expect(readConsent(NOW, storage)).toBe("pending");
  });

  it("is pending when storage is unavailable", () => {
    expect(readConsent(NOW, null)).toBe("pending");
  });

  it("survives a storage that throws on read, as in private mode", () => {
    const hostile = makeStorage({ throwOn: "get" });
    expect(() => readConsent(NOW, hostile)).not.toThrow();
    expect(readConsent(NOW, hostile)).toBe("pending");
  });
});

describe("writeConsent", () => {
  it("stores value and expiry together", () => {
    writeConsent("granted", NOW, storage);
    const stored = JSON.parse(storage.getItem(CONSENT_KEY) as string);
    expect(stored).toEqual({ value: "granted", expiresAt: NOW + CONSENT_TTL_MS });
  });

  it("uses the documented key", () => {
    writeConsent("granted", NOW, storage);
    expect(storage.raw.has("timbre.audio.consent")).toBe(true);
  });

  it("overwrites an earlier choice", () => {
    writeConsent("granted", NOW, storage);
    writeConsent("declined", NOW, storage);
    expect(readConsent(NOW, storage)).toBe("declined");
  });

  it("does not throw when storage rejects the write", () => {
    const full = makeStorage({ throwOn: "set" });
    expect(() => writeConsent("granted", NOW, full)).not.toThrow();
  });

  it("does nothing without storage", () => {
    expect(() => writeConsent("granted", NOW, null)).not.toThrow();
  });
});

describe("clearConsent", () => {
  it("returns the gate to pending", () => {
    writeConsent("granted", NOW, storage);
    clearConsent(storage);
    expect(readConsent(NOW, storage)).toBe("pending");
  });

  it("does not throw when storage rejects the removal", () => {
    const hostile = makeStorage({ throwOn: "remove" });
    expect(() => clearConsent(hostile)).not.toThrow();
  });
});
