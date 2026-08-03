import { describe, expect, it } from "vitest";

import { CASES } from "@/content/cases";
import {
  NEUTRAL_IDENTITY,
  SCULPTURE_IDENTITIES,
  type SculptureIdentity,
  identityFor,
  lerpIdentity,
} from "./sculptureIdentity";

const featured = CASES.filter((entry) => entry.featured);

function signature(identity: SculptureIdentity): string {
  return [
    identity.frequency,
    identity.ripple,
    identity.swell,
    identity.elongation,
    identity.square,
    identity.taper,
    identity.solid,
    identity.accentR,
    identity.accentG,
    identity.accentB,
  ].join("/");
}

describe("sculpture identities", () => {
  it("gives every featured case its own identity", () => {
    // A featured case with no identity is not a build error — it silently falls
    // back to neutral, and the rail simply stops morphing at that card. This is
    // the only thing that catches it.
    for (const entry of featured) {
      expect(SCULPTURE_IDENTITIES[entry.slug]).toBeDefined();
    }
  });

  it("does not carry identities for cases that no longer exist", () => {
    const slugs = new Set(CASES.map((entry) => entry.slug));
    for (const key of Object.keys(SCULPTURE_IDENTITIES)) {
      expect(slugs.has(key)).toBe(true);
    }
  });

  it("makes every case visibly distinct", () => {
    // Four identical identities would still pass every other test here while
    // making the whole feature pointless.
    const seen = new Set(
      Object.values(SCULPTURE_IDENTITIES).map((identity) =>
        signature(identity),
      ),
    );
    expect(seen.size).toBe(Object.keys(SCULPTURE_IDENTITIES).length);
  });

  it("keeps every value inside the range the tuning was measured over", () => {
    // Signal coverage was read off the live canvas at every one of these
    // identities; the table is in sculptureIdentity. Outside these bounds the
    // 4% ceiling in §3.1 rule 1 is unverified, not merely risky — and ripple is
    // the one that moves it most, so 2.0 is a real ceiling rather than a round
    // number.
    for (const identity of Object.values(SCULPTURE_IDENTITIES)) {
      expect(identity.frequency).toBeGreaterThanOrEqual(0.9);
      expect(identity.frequency).toBeLessThanOrEqual(2.8);
      expect(identity.ripple).toBeGreaterThanOrEqual(0);
      expect(identity.ripple).toBeLessThanOrEqual(2.0);
      expect(identity.swell).toBeGreaterThanOrEqual(0.8);
      expect(identity.swell).toBeLessThanOrEqual(1.3);
      expect(identity.elongation).toBeGreaterThanOrEqual(0.7);
      expect(identity.elongation).toBeLessThanOrEqual(1.35);

      for (const axis of [
        identity.square,
        identity.taper,
        identity.solid,
      ] as const) {
        expect(axis).toBeGreaterThanOrEqual(0);
        expect(axis).toBeLessThanOrEqual(1);
      }
    }
  });

  it("gives each case a distinct solid", () => {
    // Cube, cone, cylinder and pyramid are the four corners of (square, taper),
    // so distinct shapes means distinct corners. Two cases landing on the same
    // pair would render identically however different their colours were.
    const corners = Object.values(SCULPTURE_IDENTITIES).map(
      (identity) => `${identity.square}/${identity.taper}`,
    );
    expect(new Set(corners).size).toBe(corners.length);

    // And every one of them is a solid rather than the sphere, which is the
    // neutral state the rail morphs away from.
    for (const identity of Object.values(SCULPTURE_IDENTITIES)) {
      expect(identity.solid).toBe(1);
    }
    expect(NEUTRAL_IDENTITY.solid).toBe(0);
  });

  it("keeps the accents clear of the colours that carry meaning", () => {
    // `ok` (#5BE3A5) marks success and `peak` (#FF4A1F) marks errors and
    // clipping, including a brief form that fails validation. A sculpture
    // wearing either would make those states ambiguous exactly where being
    // unambiguous matters.
    const reserved = [
      [0x5b, 0xe3, 0xa5],
      [0xff, 0x4a, 0x1f],
    ];
    const toByte = (linear: number) =>
      Math.round(
        (linear <= 0.0031308
          ? linear * 12.92
          : 1.055 * Math.pow(linear, 1 / 2.4) - 0.055) * 255,
      );

    for (const identity of Object.values(SCULPTURE_IDENTITIES)) {
      const rgb = [
        toByte(identity.accentR),
        toByte(identity.accentG),
        toByte(identity.accentB),
      ];
      for (const other of reserved) {
        const gap = Math.hypot(
          rgb[0] - other[0],
          rgb[1] - other[1],
          rgb[2] - other[2],
        );
        expect(gap).toBeGreaterThan(60);
      }
    }
  });

  it("falls back to neutral for an unknown slug", () => {
    expect(identityFor("no-such-case")).toEqual(NEUTRAL_IDENTITY);
  });
});

describe("identity interpolation", () => {
  const a = SCULPTURE_IDENTITIES.kestrel;
  const b = SCULPTURE_IDENTITIES.solene;

  it("returns the endpoints exactly", () => {
    expect(lerpIdentity(a, b, 0)).toEqual(a);
    expect(lerpIdentity(a, b, 1)).toEqual(b);
  });

  it("sits halfway at the midpoint", () => {
    const mid = lerpIdentity(a, b, 0.5);
    expect(mid.frequency).toBeCloseTo((a.frequency + b.frequency) / 2, 10);
    expect(mid.accentR).toBeCloseTo((a.accentR + b.accentR) / 2, 10);
    // Cube to cylinder passes through every rounded-corner box between them.
    expect(mid.square).toBeCloseTo((a.square + b.square) / 2, 10);
  });

  it("clamps rather than extrapolating", () => {
    // ScrollTrigger can hand back progress slightly outside 0..1 on a fast
    // flick, and an extrapolated frequency would push the form outside the
    // range coverage was measured over.
    expect(lerpIdentity(a, b, -0.5)).toEqual(a);
    expect(lerpIdentity(a, b, 1.5)).toEqual(b);
  });

  it("treats neutral as a fixed point", () => {
    expect(lerpIdentity(NEUTRAL_IDENTITY, NEUTRAL_IDENTITY, 0.37)).toEqual(
      NEUTRAL_IDENTITY,
    );
  });
});
