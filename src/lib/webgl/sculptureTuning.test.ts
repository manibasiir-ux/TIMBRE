import { describe, expect, it } from "vitest";

import {
  BASE_CAMERA_Z,
  DISPLACEMENT,
  LOUDEST_FRAME,
  REFERENCE_ASPECT,
  SCULPTURE_RADIUS,
  SIGNAL_RAMP,
  cameraDistanceForAspect,
  peakDisplacement,
} from "./sculptureTuning";

/**
 * Guards on the sculpture calibration.
 *
 * Pixel coverage itself needs a GPU and is measured in the browser, so these
 * assert the properties that made the measured values correct. If someone
 * restores the specification §7.4 constants, or nudges these for taste, the
 * failures here explain what rule was broken rather than leaving a silent
 * regression against §3.1 rule 1.
 */

describe("displacement stays sculptural", () => {
  it("never pushes the surface past a sixth of the radius", () => {
    // At ±0.83, the published §7.4 values displaced by more than half the
    // radius and rendered as a spike ball.
    const peak = peakDisplacement(LOUDEST_FRAME);
    expect(peak).toBeLessThanOrEqual(SCULPTURE_RADIUS / 6);
  });

  it("still moves noticeably at the loudest frame", () => {
    expect(peakDisplacement(LOUDEST_FRAME)).toBeGreaterThan(0.1);
  });

  it("keeps a baseline swell in silence so the form is never a bare sphere", () => {
    const silent = peakDisplacement({ low: 0, mid: 0, high: 0 });
    expect(silent).toBeCloseTo(DISPLACEMENT.base, 5);
    expect(silent).toBeGreaterThan(0);
  });

  it("responds most to bass, least to treble", () => {
    expect(DISPLACEMENT.lowGain).toBeGreaterThan(DISPLACEMENT.midGain);
    expect(DISPLACEMENT.midGain).toBeGreaterThan(DISPLACEMENT.highGain);
  });
});

describe("signal ramp keeps the accent rationed", () => {
  it("ramps upward over a real range", () => {
    expect(SIGNAL_RAMP.start).toBeLessThan(SIGNAL_RAMP.end);
  });

  it("only lights outward displacement", () => {
    // The published ramp started at -0.1, so inward troughs also tinted toward
    // signal. The accent marks what is pushing out, not the whole surface.
    expect(SIGNAL_RAMP.start).toBeGreaterThan(0);
  });

  it("reaches full signal below the loudest peak, so the accent can appear", () => {
    expect(SIGNAL_RAMP.end).toBeLessThan(peakDisplacement(LOUDEST_FRAME));
  });

  it("starts above the silent baseline, so silence is not fully lit", () => {
    const silent = peakDisplacement({ low: 0, mid: 0, high: 0 });
    expect(SIGNAL_RAMP.start).toBeGreaterThanOrEqual(silent);
  });

  it("holds the measured signal ramp", () => {
    // Sampled at 1280x720: 0.38% coverage at the quietest frame, 2.41% at the
    // median, 3.85% at the loudest, against the 4% cap in §3.1 rule 1.
    expect(SIGNAL_RAMP).toEqual({ start: 0.05, end: 0.12 });
    expect(DISPLACEMENT).toEqual({
      base: 0.05,
      lowGain: 0.16,
      midGain: 0.03,
      highGain: 0.02,
    });
  });
});

describe("camera compensation keeps the calibration true off 16:9", () => {
  it("leaves the reference aspect untouched", () => {
    expect(cameraDistanceForAspect(REFERENCE_ASPECT)).toBeCloseTo(
      BASE_CAMERA_Z,
      10,
    );
  });

  it("pulls back as the viewport narrows", () => {
    const desktop = cameraDistanceForAspect(1280 / 720);
    const tablet = cameraDistanceForAspect(768 / 1024);
    const phone = cameraDistanceForAspect(375 / 812);
    expect(tablet).toBeGreaterThan(desktop);
    expect(phone).toBeGreaterThan(tablet);
  });

  it("never moves closer than the reference on wide viewports", () => {
    // Pulling in on ultrawide would overfill vertically. §9 widens the field of
    // view there instead.
    for (const aspect of [2, 21 / 9, 3440 / 1440, 32 / 9]) {
      expect(cameraDistanceForAspect(aspect)).toBe(BASE_CAMERA_Z);
    }
  });

  it("scales with the square root of the aspect shortfall", () => {
    // Projected area falls with the square of distance, so halving the aspect
    // must multiply distance by sqrt(2) to hold area constant.
    const wide = cameraDistanceForAspect(REFERENCE_ASPECT);
    const half = cameraDistanceForAspect(REFERENCE_ASPECT / 2);
    expect(half / wide).toBeCloseTo(Math.SQRT2, 10);
  });

  it("survives a degenerate aspect rather than producing NaN", () => {
    // Canvases are measured at zero size for a frame before layout settles.
    for (const bad of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(cameraDistanceForAspect(bad)).toBe(BASE_CAMERA_Z);
    }
  });
});
