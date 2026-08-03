import { beforeEach, describe, expect, it } from "vitest";

import {
  RAIL_RECEDE,
  RECEDE,
  RECEDE_CURVE,
  SCULPTURE_SCROLL,
  recedeAt,
  recedeState,
  resetSculptureMotion,
  sculptureMotion,
  sculptureMotionAt,
} from "./sculptureMotion";

describe("the recede curve down the home page", () => {
  it("leaves the sculpture fully present as the range opens", () => {
    // The defect this replaces: recede sat at 1 at scroll position zero, so the
    // hero's own scrub — gain 1 to 2.4, orbit 0 to 0.9 — happened entirely
    // behind a fade and nobody ever saw it.
    expect(recedeAt(0)).toBe(0);
  });

  it("withdraws fully before the manifesto is read", () => {
    expect(recedeAt(RECEDE_CURVE.withdrawEnd)).toBeCloseTo(1, 10);
  });

  it("holds at full withdraw while the copy is on screen", () => {
    const mid =
      (RECEDE_CURVE.withdrawEnd + RECEDE_CURVE.holdEnd) / 2;
    expect(recedeAt(mid)).toBe(1);
    expect(recedeAt(RECEDE_CURVE.holdEnd)).toBe(1);
  });

  it("returns to the rail's resting value by the end", () => {
    expect(recedeAt(1)).toBeCloseTo(RAIL_RECEDE, 10);
  });

  it("never doubles back", () => {
    // Two scrub tweens sharing the property produced 1.0, 0.50, 1.0, 0.80,
    // 0.48 down the page. Monotonic-until-the-hold, then monotonic-down, is the
    // property that was actually missing.
    let previous = -Infinity;
    for (let p = 0; p <= RECEDE_CURVE.holdEnd; p += 0.01) {
      const value = recedeAt(p);
      expect(value).toBeGreaterThanOrEqual(previous - 1e-9);
      previous = value;
    }

    previous = Infinity;
    for (let p = RECEDE_CURVE.holdEnd; p <= 1; p += 0.01) {
      const value = recedeAt(p);
      expect(value).toBeLessThanOrEqual(previous + 1e-9);
      previous = value;
    }
  });

  it("stays inside the range recedeState is defined over", () => {
    for (let p = -0.5; p <= 1.5; p += 0.01) {
      const value = recedeAt(p);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    }
  });

  it("clamps rather than extrapolating", () => {
    // ScrollTrigger hands back progress slightly outside 0..1 on a fast flick.
    expect(recedeAt(-1)).toBe(0);
    expect(recedeAt(2)).toBeCloseTo(RAIL_RECEDE, 10);
  });

  it("keeps the rail bright enough for a morph to read", () => {
    // At recede 1 the colour mix is 0.15, which is where the per-case morph
    // became invisible. The rail's resting value has to leave more than that.
    expect(recedeState(recedeAt(1)).mix).toBeGreaterThan(0.5);
  });
});

describe("scroll-linked sculpture motion", () => {
  beforeEach(() => {
    resetSculptureMotion();
  });

  it("starts at the top of the scrubbed range", () => {
    expect(sculptureMotionAt(0)).toEqual({
      gain: SCULPTURE_SCROLL.gainFrom,
      orbit: SCULPTURE_SCROLL.orbitFrom,
    });
  });

  it("reaches the far end of the range", () => {
    expect(sculptureMotionAt(1)).toEqual({
      gain: SCULPTURE_SCROLL.gainTo,
      orbit: SCULPTURE_SCROLL.orbitTo,
    });
  });

  it("interpolates linearly, as scrub-linked motion must", () => {
    // §4.3 rule 2: scroll-linked motion is always linear. An eased scrub would
    // move at a different rate than the scroll that drives it.
    const mid = sculptureMotionAt(0.5);
    expect(mid.gain).toBeCloseTo(
      (SCULPTURE_SCROLL.gainFrom + SCULPTURE_SCROLL.gainTo) / 2,
      10,
    );
    expect(mid.orbit).toBeCloseTo(
      (SCULPTURE_SCROLL.orbitFrom + SCULPTURE_SCROLL.orbitTo) / 2,
      10,
    );
  });

  it("clamps out-of-range progress rather than extrapolating", () => {
    // Rubber-band scrolling and Lenis overshoot both hand out values outside
    // 0..1. Extrapolating would push displacement past anything the signal
    // ramp was calibrated against.
    expect(sculptureMotionAt(-0.5)).toEqual(sculptureMotionAt(0));
    expect(sculptureMotionAt(1.5)).toEqual(sculptureMotionAt(1));
  });

  it("never reduces displacement below the calibrated baseline", () => {
    for (let p = 0; p <= 1; p += 0.05) {
      expect(sculptureMotionAt(p).gain).toBeGreaterThanOrEqual(1);
    }
  });

  it("resets the shared object back to the top of the page", () => {
    sculptureMotion.gain = 2.4;
    sculptureMotion.orbit = 0.9;
    resetSculptureMotion();
    expect(sculptureMotion.gain).toBe(SCULPTURE_SCROLL.gainFrom);
    expect(sculptureMotion.orbit).toBe(SCULPTURE_SCROLL.orbitFrom);
  });
});

describe("recede keeps editorial copy legible over the sculpture", () => {
  it("is fully present at the top of the page", () => {
    expect(recedeState(0)).toEqual({ scale: 1, mix: 1 });
  });

  it("pulls back and desaturates at full recede", () => {
    const far = recedeState(1);
    expect(far.scale).toBeLessThan(1);
    expect(far.mix).toBeLessThan(1);
    expect(far.scale).toBeCloseTo(1 - RECEDE.scale, 10);
    expect(far.mix).toBeCloseTo(1 - RECEDE.desaturate, 10);
  });

  it("never inverts or vanishes the form", () => {
    // A negative scale mirrors the geometry; zero would make it disappear
    // rather than recede, which §6.1 does not ask for.
    for (let r = 0; r <= 1; r += 0.05) {
      const state = recedeState(r);
      expect(state.scale).toBeGreaterThan(0);
      expect(state.mix).toBeGreaterThanOrEqual(0);
    }
  });

  it("leaves a trace of signal rather than going fully grey", () => {
    // The sculpture is still the thing making sound behind the manifesto.
    expect(recedeState(1).mix).toBeGreaterThan(0);
  });

  it("clamps rather than extrapolating past either end", () => {
    expect(recedeState(-1)).toEqual(recedeState(0));
    expect(recedeState(2)).toEqual(recedeState(1));
  });

  it("moves monotonically", () => {
    let previousScale = Infinity;
    let previousMix = Infinity;
    for (let r = 0; r <= 1; r += 0.1) {
      const state = recedeState(r);
      expect(state.scale).toBeLessThanOrEqual(previousScale);
      expect(state.mix).toBeLessThanOrEqual(previousMix);
      previousScale = state.scale;
      previousMix = state.mix;
    }
  });

  it("is included in the reset", () => {
    sculptureMotion.recede = 1;
    resetSculptureMotion();
    expect(sculptureMotion.recede).toBe(0);
  });
});
