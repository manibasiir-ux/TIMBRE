import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  WCAG,
  contrastHex,
  contrastHexAlpha,
  hexToRgb,
} from "./contrast";
import { INK_ALPHA, PALETTE } from "./palette";

/**
 * Design specification §3.2 publishes a measured contrast table. If a token is
 * ever nudged for aesthetic reasons, these assertions are what stops the change
 * silently dropping the palette below WCAG 2.2 AA.
 *
 * The `documented` column is what §3.2 claims; `measured` is what the WCAG
 * formula actually produces. Five rows disagree by more than rounding, the
 * worst by 1.74. The implementation here was cross-checked against an
 * independent reimplementation and against three reference cases (black on
 * white is 21:1, a colour against itself is 1:1, the ratio is order
 * independent), so the specification table is the thing that is wrong.
 *
 * No palette change follows from this: every pair still meets the verdict §3.2
 * assigns it, and several clear it by more than claimed. Only the published
 * numbers are inaccurate. Assertions below therefore run against `measured`,
 * with `documented` retained so the discrepancy stays visible.
 */

const P = PALETTE;

type Row = {
  label: string;
  ratio: number;
  /** Verified by the WCAG formula. */
  measured: number;
  /** As printed in specification §3.2. */
  documented: number;
  floor: number;
};

const TABLE: Row[] = [
  {
    label: "ink on ground",
    ratio: contrastHex(P.ink, P.ground),
    measured: 17.84,
    documented: 18.4,
    floor: WCAG.AAA_NORMAL,
  },
  {
    label: "ink 70% on ground",
    ratio: contrastHexAlpha(P.ink, INK_ALPHA.ink70, P.ground),
    measured: 8.86,
    documented: 9.7,
    floor: WCAG.AAA_NORMAL,
  },
  {
    label: "ink 40% on ground",
    ratio: contrastHexAlpha(P.ink, INK_ALPHA.ink40, P.ground),
    measured: 3.54,
    documented: 3.6,
    floor: WCAG.NON_TEXT,
  },
  {
    label: "signal on ground",
    ratio: contrastHex(P.signal, P.ground),
    measured: 17.58,
    documented: 15.9,
    floor: WCAG.AAA_NORMAL,
  },
  {
    label: "ground on signal",
    ratio: contrastHex(P.ground, P.signal),
    measured: 17.58,
    documented: 15.9,
    floor: WCAG.AAA_NORMAL,
  },
  {
    label: "ink on ground-lift",
    ratio: contrastHex(P.ink, P.groundLift),
    measured: 16.69,
    documented: 17.0,
    floor: WCAG.AAA_NORMAL,
  },
  {
    label: "peak on ground",
    ratio: contrastHex(P.peak, P.ground),
    measured: 5.86,
    documented: 5.4,
    floor: WCAG.AA_NORMAL,
  },
  {
    label: "ok on ground",
    ratio: contrastHex(P.ok, P.ground),
    measured: 12.16,
    documented: 11.8,
    floor: WCAG.AAA_NORMAL,
  },
  {
    label: "signal on ground-lift",
    ratio: contrastHex(P.signal, P.groundLift),
    measured: 16.44,
    documented: 14.7,
    floor: WCAG.AAA_NORMAL,
  },
];

describe("contrast maths", () => {
  it("returns 21:1 for black on white", () => {
    expect(contrastHex("#000000", "#FFFFFF")).toBeCloseTo(21, 5);
  });

  it("returns 1:1 for a colour against itself", () => {
    expect(contrastHex(P.signal, P.signal)).toBeCloseTo(1, 5);
  });

  it("is order-independent", () => {
    expect(contrastHex(P.ink, P.ground)).toBeCloseTo(
      contrastHex(P.ground, P.ink),
      10,
    );
  });

  it("expands three-digit hex", () => {
    expect(hexToRgb("#FFF")).toEqual({ r: 255, g: 255, b: 255 });
  });

  it("rejects malformed hex", () => {
    expect(() => hexToRgb("#12345")).toThrow();
  });
});

describe("palette meets its accessibility floor", () => {
  it.each(TABLE)("$label clears $floor:1", ({ ratio, floor }) => {
    expect(ratio).toBeGreaterThanOrEqual(floor);
  });
});

describe("palette holds its verified measurements", () => {
  it.each(TABLE)("$label is $measured:1", ({ ratio, measured }) => {
    expect(ratio).toBeCloseTo(measured, 1);
  });
});

describe("specification §3.2 is inaccurate but never optimistic about compliance", () => {
  // A published ratio being wrong is a documentation defect. A published ratio
  // being wrong in a way that hides a compliance failure would be a real one,
  // so that case is asserted separately and must never appear.
  it.each(TABLE)(
    "$label still clears its floor despite §3.2 claiming $documented:1",
    ({ ratio, floor }) => {
      expect(ratio).toBeGreaterThanOrEqual(floor);
    },
  );
});

describe("ink-40 is unusable for text, as specification §3.1 requires", () => {
  it("fails AA for normal text", () => {
    const ratio = contrastHexAlpha(P.ink, INK_ALPHA.ink40, P.ground);
    expect(ratio).toBeLessThan(WCAG.AA_NORMAL);
  });

  it("still clears the non-text component threshold", () => {
    const ratio = contrastHexAlpha(P.ink, INK_ALPHA.ink40, P.ground);
    expect(ratio).toBeGreaterThanOrEqual(WCAG.NON_TEXT);
  });
});

describe("CSS tokens agree with the TypeScript palette", () => {
  const css = readFileSync(
    join(process.cwd(), "src/app/globals.css"),
    "utf8",
  );

  const cssToken = (name: string): string => {
    const match = css.match(new RegExp(`--color-${name}:\\s*([^;]+);`));
    if (!match) throw new Error(`--color-${name} missing from globals.css`);
    return match[1].trim().toUpperCase();
  };

  it.each([
    ["ground", P.ground],
    ["ground-lift", P.groundLift],
    ["ground-deep", P.groundDeep],
    ["ink", P.ink],
    ["signal", P.signal],
    ["signal-dim", P.signalDim],
    ["warm-shade", P.warmShade],
    ["peak", P.peak],
    ["ok", P.ok],
  ])("--color-%s is %s", (token, expected) => {
    expect(cssToken(token)).toBe(expected.toUpperCase());
  });
});
