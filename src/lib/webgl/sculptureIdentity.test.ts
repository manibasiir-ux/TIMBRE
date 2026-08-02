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
    identity.warmth,
    identity.patina,
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
      expect(identity.frequency).toBeGreaterThanOrEqual(1.0);
      expect(identity.frequency).toBeLessThanOrEqual(2.4);
      expect(identity.ripple).toBeGreaterThanOrEqual(0);
      expect(identity.ripple).toBeLessThanOrEqual(2.0);
      expect(identity.swell).toBeGreaterThanOrEqual(0.8);
      expect(identity.swell).toBeLessThanOrEqual(1.3);
      expect(identity.warmth).toBeGreaterThanOrEqual(0);
      expect(identity.warmth).toBeLessThanOrEqual(1);
      expect(identity.patina).toBeGreaterThanOrEqual(0);
      expect(identity.patina).toBeLessThanOrEqual(1);
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
    expect(mid.warmth).toBeCloseTo((a.warmth + b.warmth) / 2, 10);
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
