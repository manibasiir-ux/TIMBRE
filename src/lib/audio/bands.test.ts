import { describe, expect, it } from "vitest";

import {
  BAND_RANGES,
  METER_BAND_COUNT,
  METER_BAND_EDGES_HZ,
  averageBand,
  computeBands,
  createBands,
  dbToGain,
  gainToDb,
  lerp,
  smoothBandsInto,
} from "./bands";

const SAMPLE_RATE = 48_000;
const FFT_SIZE = 2048;
const BIN_COUNT = FFT_SIZE / 2; // 1024 bins spanning 0..24 kHz
const HZ_PER_BIN = SAMPLE_RATE / 2 / BIN_COUNT; // 23.4375 Hz

/** Builds analyser-shaped data with energy only in the given Hz window. */
function spectrumWithEnergyAt(fromHz: number, toHz: number, value = 255) {
  const data = new Uint8Array(BIN_COUNT);
  const start = Math.floor(fromHz / HZ_PER_BIN);
  const end = Math.ceil(toHz / HZ_PER_BIN);
  for (let i = start; i < end && i < BIN_COUNT; i += 1) data[i] = value;
  return data;
}

describe("averageBand", () => {
  it("normalises a full-scale band to 1", () => {
    const data = new Uint8Array(BIN_COUNT).fill(255);
    expect(averageBand(data, SAMPLE_RATE, FFT_SIZE, 250, 2000)).toBeCloseTo(1, 5);
  });

  it("returns 0 for silence", () => {
    const data = new Uint8Array(BIN_COUNT);
    expect(averageBand(data, SAMPLE_RATE, FFT_SIZE, 20, 250)).toBe(0);
  });

  it("returns the midpoint for half-scale energy", () => {
    const data = new Uint8Array(BIN_COUNT).fill(128);
    expect(averageBand(data, SAMPLE_RATE, FFT_SIZE, 20, 250)).toBeCloseTo(
      128 / 255,
      5,
    );
  });

  it("maps Hz to bins rather than reading raw indices", () => {
    // Energy at 1 kHz must not appear in the 20-250 Hz window.
    const data = spectrumWithEnergyAt(900, 1100);
    expect(averageBand(data, SAMPLE_RATE, FFT_SIZE, 20, 250)).toBe(0);
    expect(
      averageBand(data, SAMPLE_RATE, FFT_SIZE, 900, 1100),
    ).toBeGreaterThan(0.9);
  });

  it("clamps a range that runs past Nyquist", () => {
    const data = new Uint8Array(BIN_COUNT).fill(255);
    expect(averageBand(data, SAMPLE_RATE, FFT_SIZE, 20_000, 90_000)).toBeCloseTo(
      1,
      5,
    );
  });

  it("never divides by zero on a degenerate range", () => {
    const data = new Uint8Array(BIN_COUNT).fill(255);
    const result = averageBand(data, SAMPLE_RATE, FFT_SIZE, 500, 500);
    expect(Number.isFinite(result)).toBe(true);
  });

  it("survives empty or invalid input", () => {
    expect(averageBand(new Uint8Array(0), SAMPLE_RATE, FFT_SIZE, 20, 250)).toBe(0);
    expect(averageBand([1, 2, 3], 0, FFT_SIZE, 20, 250)).toBe(0);
    expect(averageBand([1, 2, 3], SAMPLE_RATE, 0, 20, 250)).toBe(0);
  });
});

describe("computeBands", () => {
  it("routes bass energy to low only", () => {
    const bands = computeBands(
      spectrumWithEnergyAt(40, 120),
      SAMPLE_RATE,
      FFT_SIZE,
    );
    expect(bands.low).toBeGreaterThan(0.3);
    expect(bands.mid).toBe(0);
    expect(bands.high).toBe(0);
  });

  it("routes presence energy to high only", () => {
    const bands = computeBands(
      spectrumWithEnergyAt(3000, 6000),
      SAMPLE_RATE,
      FFT_SIZE,
    );
    expect(bands.high).toBeGreaterThan(0.3);
    expect(bands.low).toBe(0);
    expect(bands.mid).toBe(0);
  });

  it("keeps every band within 0..1", () => {
    const data = new Uint8Array(BIN_COUNT).fill(255);
    const bands = computeBands(data, SAMPLE_RATE, FFT_SIZE);
    for (const value of Object.values(bands)) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    }
  });

  it("uses non-overlapping, ascending ranges", () => {
    expect(BAND_RANGES.low[1]).toBe(BAND_RANGES.mid[0]);
    expect(BAND_RANGES.mid[1]).toBe(BAND_RANGES.high[0]);
    for (const [from, to] of Object.values(BAND_RANGES)) {
      expect(to).toBeGreaterThan(from);
    }
  });
});

describe("smoothing", () => {
  it("lerps toward the target without overshooting", () => {
    expect(lerp(0, 1, 0.25)).toBe(0.25);
    expect(lerp(0, 1, 0)).toBe(0);
    expect(lerp(0, 1, 1)).toBe(1);
  });

  it("converges on the target when applied repeatedly", () => {
    const current = createBands(0);
    const target = createBands(1);
    for (let i = 0; i < 200; i += 1) smoothBandsInto(current, target);
    expect(current.low).toBeCloseTo(1, 3);
    expect(current.high).toBeCloseTo(1, 3);
  });

  it("mutates in place so the render loop allocates nothing", () => {
    const current = createBands(0);
    const returned = smoothBandsInto(current, createBands(1));
    expect(returned).toBe(current);
  });

  it("moves high faster than low, per specification §7.4", () => {
    const current = createBands(0);
    smoothBandsInto(current, createBands(1));
    expect(current.high).toBeGreaterThan(current.low);
  });
});

describe("decibel conversion", () => {
  it("treats 0 dB as unity gain", () => {
    expect(dbToGain(0)).toBeCloseTo(1, 10);
  });

  it("converts the -12 dB duck specified in FR-12", () => {
    expect(dbToGain(-12)).toBeCloseTo(0.2512, 4);
  });

  it("halves amplitude at about -6 dB", () => {
    expect(dbToGain(-6)).toBeCloseTo(0.5012, 4);
  });

  it("round-trips through gainToDb", () => {
    for (const db of [-24, -18, -12, -6, 0]) {
      expect(gainToDb(dbToGain(db))).toBeCloseTo(db, 6);
    }
  });

  it("does not return -Infinity for silence", () => {
    expect(Number.isFinite(gainToDb(0))).toBe(true);
  });
});

describe("METER_BAND_EDGES_HZ", () => {
  /**
   * The sound toggle's five bars. These edges were chosen against measurements
   * of the real bed rather than picked for tidiness, so the properties worth
   * asserting are the ones that would silently produce a dead bar.
   */

  it("describes five bands", () => {
    expect(METER_BAND_COUNT).toBe(5);
    expect(METER_BAND_EDGES_HZ).toHaveLength(6);
  });

  it("ascends without gaps or overlaps", () => {
    for (let i = 1; i < METER_BAND_EDGES_HZ.length; i += 1) {
      expect(METER_BAND_EDGES_HZ[i]).toBeGreaterThan(METER_BAND_EDGES_HZ[i - 1]);
    }
  });

  it("gives every band at least one FFT bin at common sample rates", () => {
    /**
     * The failure this exists for: a band narrower than the analyser's
     * resolution resolves to zero bins, and `averageBand` widens it to one
     * rather than dividing by zero — so the bar silently reads a neighbouring
     * band instead of its own. At 48 kHz a bin is 23.4 Hz wide, and the lowest
     * band here is 54 Hz wide, which is the tight one.
     */
    for (const rate of [44_100, 48_000]) {
      const hzPerBin = rate / 2 / BIN_COUNT;
      for (let i = 0; i < METER_BAND_COUNT; i += 1) {
        const from = METER_BAND_EDGES_HZ[i];
        const to = METER_BAND_EDGES_HZ[i + 1];
        const bins = Math.ceil(to / hzPerBin) - Math.floor(from / hzPerBin);
        expect(
          bins,
          `band ${from}-${to}Hz resolves to ${bins} bins at ${rate}Hz`,
        ).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it("reads each band independently", () => {
    // Energy placed in one band must not light the others, or the meter draws
    // five copies of the same number and the spectrum shape is a fiction.
    for (let i = 0; i < METER_BAND_COUNT; i += 1) {
      const from = METER_BAND_EDGES_HZ[i];
      const to = METER_BAND_EDGES_HZ[i + 1];
      const data = spectrumWithEnergyAt(from, to);

      const own = averageBand(data, SAMPLE_RATE, FFT_SIZE, from, to);
      expect(own, `band ${from}-${to}Hz is deaf to its own energy`).toBeGreaterThan(0);

      for (let j = 0; j < METER_BAND_COUNT; j += 1) {
        if (j === i) continue;
        const other = averageBand(
          data,
          SAMPLE_RATE,
          FFT_SIZE,
          METER_BAND_EDGES_HZ[j],
          METER_BAND_EDGES_HZ[j + 1],
        );
        expect(other).toBeLessThan(own);
      }
    }
  });

  it("stays inside the range the bed actually occupies", () => {
    // Reaching to 8 kHz left the top bar at a median of 0.003 across a whole
    // loop, which is a bar that never moves.
    expect(METER_BAND_EDGES_HZ[0]).toBeGreaterThanOrEqual(20);
    expect(METER_BAND_EDGES_HZ[METER_BAND_COUNT]).toBeLessThanOrEqual(4000);
  });
});
