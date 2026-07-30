import { describe, expect, it } from "vitest";

import {
  REFERENCE_CODE_PATTERN,
  generateReferenceCode,
  isValidReferenceCode,
} from "./referenceCode";

describe("generateReferenceCode", () => {
  const at = (iso: string) => new Date(iso);

  it("matches the FR-18 format", () => {
    expect(generateReferenceCode()).toMatch(REFERENCE_CODE_PATTERN);
  });

  it("encodes the date as YYMMDD", () => {
    expect(generateReferenceCode(at("2026-07-30T12:00:00Z"), () => 0)).toBe(
      "TMB-260730-AAA",
    );
  });

  it("zero-pads single-digit months and days", () => {
    expect(generateReferenceCode(at("2026-01-05T12:00:00Z"), () => 0)).toBe(
      "TMB-260105-AAA",
    );
  });

  it("uses UTC, so a code does not shift with the submitter's timezone", () => {
    // 23:30 in New York on the 30th is already the 31st in UTC.
    const code = generateReferenceCode(at("2026-07-31T03:30:00Z"), () => 0);
    expect(code).toBe("TMB-260731-AAA");
  });

  it("handles the century boundary", () => {
    expect(generateReferenceCode(at("2100-12-31T00:00:00Z"), () => 0)).toBe(
      "TMB-001231-AAA",
    );
  });

  it("always produces exactly three suffix characters", () => {
    // A random() returning its maximum must not index past the alphabet.
    for (const value of [0, 0.5, 0.999999, 1]) {
      const code = generateReferenceCode(at("2026-07-30T12:00:00Z"), () => value);
      expect(code).toMatch(REFERENCE_CODE_PATTERN);
      expect(code.split("-")[2]).toHaveLength(3);
    }
  });

  it("omits characters that are misread when dictated", () => {
    // I, O, 0 and 1 are excluded, so no generated code may contain them.
    let sequence = 0;
    const cycling = () => (sequence++ % 64) / 64;
    for (let i = 0; i < 500; i += 1) {
      const suffix = generateReferenceCode(new Date(), cycling).split("-")[2];
      expect(suffix).not.toMatch(/[IO01]/);
    }
  });

  it("varies the suffix across submissions", () => {
    const codes = new Set(
      Array.from({ length: 200 }, () => generateReferenceCode()),
    );
    expect(codes.size).toBeGreaterThan(150);
  });
});

describe("isValidReferenceCode", () => {
  it("accepts a generated code", () => {
    expect(isValidReferenceCode(generateReferenceCode())).toBe(true);
  });

  it.each([
    ["", "empty"],
    ["TMB-260730", "no suffix"],
    ["TMB-26073-ABC", "short date"],
    ["TMB-260730-AB", "short suffix"],
    ["TMB-260730-ABCD", "long suffix"],
    ["tmb-260730-ABC", "lowercase prefix"],
    ["TMB-260730-abc", "lowercase suffix"],
    ["TMB-260730-A0C", "excluded character"],
    ["XYZ-260730-ABC", "wrong prefix"],
  ])("rejects %s (%s)", (code) => {
    expect(isValidReferenceCode(code)).toBe(false);
  });
});
