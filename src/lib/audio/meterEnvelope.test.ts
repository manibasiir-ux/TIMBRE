import { describe, expect, it } from "vitest";

import {
  ATTACK_MS,
  PEAK_FALL_PER_SECOND,
  PEAK_HOLD_MS,
  PeakHold,
  RELEASE_MS,
  envelopeStep,
  stereoSpread,
} from "./meterEnvelope";

describe("envelopeStep", () => {
  it("rises faster than it falls", () => {
    const rise = envelopeStep(0, 1, 16);
    const fall = 1 - envelopeStep(1, 0, 16);
    expect(rise).toBeGreaterThan(fall);
  });

  it("never overshoots the target", () => {
    let value = 0;
    for (let i = 0; i < 500; i += 1) value = envelopeStep(value, 1, 16);
    expect(value).toBeLessThanOrEqual(1);
    expect(value).toBeGreaterThan(0.99);
  });

  it("converges toward silence without reaching it early", () => {
    let value = 1;
    for (let i = 0; i < 5; i += 1) value = envelopeStep(value, 0, 16);
    expect(value).toBeGreaterThan(0);
    expect(value).toBeLessThan(1);
  });

  it("is frame-rate independent", () => {
    // One 32 ms frame must land in the same place as two 16 ms frames.
    const coarse = envelopeStep(0, 1, 32);
    const fine = envelopeStep(envelopeStep(0, 1, 16), 1, 16);
    expect(coarse).toBeCloseTo(fine, 10);
  });

  it("holds still when no time has passed", () => {
    expect(envelopeStep(0.4, 1, 0)).toBe(0.4);
  });

  it("snaps when the time constant is zero", () => {
    expect(envelopeStep(0, 1, 16, 0, 0)).toBe(1);
  });

  it("uses the documented ballistics by default", () => {
    expect(ATTACK_MS).toBe(30);
    expect(RELEASE_MS).toBe(300);
    expect(ATTACK_MS).toBeLessThan(RELEASE_MS);
  });
});

describe("PeakHold", () => {
  it("jumps immediately to a new peak", () => {
    const peak = new PeakHold();
    expect(peak.update(0.8, 16)).toBe(0.8);
  });

  it("holds the cap while the hold window is open", () => {
    const peak = new PeakHold();
    peak.update(0.9, 16);
    peak.update(0, PEAK_HOLD_MS / 2);
    expect(peak.value).toBe(0.9);
  });

  it("falls once the hold window expires", () => {
    const peak = new PeakHold();
    peak.update(0.9, 16);
    peak.update(0, PEAK_HOLD_MS + 1);
    peak.update(0, 100);
    expect(peak.value).toBeLessThan(0.9);
  });

  it("falls at the documented rate", () => {
    const peak = new PeakHold();
    peak.update(1, 16);
    peak.update(0, PEAK_HOLD_MS);
    const before = peak.value;
    peak.update(0, 1000);
    expect(before - peak.value).toBeCloseTo(PEAK_FALL_PER_SECOND, 2);
  });

  it("never falls below the live level", () => {
    const peak = new PeakHold();
    peak.update(1, 16);
    for (let i = 0; i < 200; i += 1) peak.update(0.3, 50);
    expect(peak.value).toBeGreaterThanOrEqual(0.3);
  });

  it("resets to silence", () => {
    const peak = new PeakHold();
    peak.update(1, 16);
    peak.reset();
    expect(peak.value).toBe(0);
  });
});

describe("stereoSpread", () => {
  it("returns a pair that is not identical", () => {
    const [left, right] = stereoSpread(0.8);
    expect(left).not.toBe(right);
  });

  it("stays silent on silence", () => {
    expect(stereoSpread(0)).toEqual([0, 0]);
  });

  it("never returns a negative level", () => {
    const [left, right] = stereoSpread(0);
    expect(left).toBeGreaterThanOrEqual(0);
    expect(right).toBeGreaterThanOrEqual(0);
  });
});
