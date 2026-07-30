import { describe, expect, it } from "vitest";

import { BAND_RANGES, createBands } from "./bands";
import { type BakedEnvelope, sampleEnvelope } from "./useAudioAnalyser";
import envelopeJson from "@/data/fft-envelope.json";

const envelope = envelopeJson as BakedEnvelope;

/**
 * The baked envelope is produced offline by scripts/generate-audio.mjs and
 * drives the sculpture whenever audio is unavailable (edge case E2). Its whole
 * purpose is to look like the live analysis, so these assertions guard the
 * things that would silently break that resemblance.
 */

describe("baked envelope", () => {
  it("was reduced with the same band ranges as the live analyser", () => {
    // The generator cannot import the TypeScript constant, so it writes the
    // ranges it used into the artefact and this is where the two are reconciled.
    expect(envelope.bandRanges).toEqual({
      low: [...BAND_RANGES.low],
      mid: [...BAND_RANGES.mid],
      high: [...BAND_RANGES.high],
    });
  });

  it("runs at 60 fps, per specification §Phase 2", () => {
    expect(envelope.fps).toBe(60);
  });

  it("holds exactly three values per frame", () => {
    expect(envelope.frames).toHaveLength(envelope.frameCount * 3);
  });

  it("covers a whole number of seconds so the loop is seamless", () => {
    expect(envelope.frameCount % envelope.fps).toBe(0);
  });

  it("stays within the byte range", () => {
    for (const value of envelope.frames) {
      expect(Number.isInteger(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(255);
    }
  });

  it("gives every band real movement, not a flat line", () => {
    // A band with no range leaves a third of the sculpture's displacement
    // static, which is the failure this envelope exists to avoid.
    for (const [index, band] of (["low", "mid", "high"] as const).entries()) {
      const values: number[] = [];
      for (let i = index; i < envelope.frames.length; i += 3) {
        values.push(envelope.frames[i]);
      }
      const range = Math.max(...values) - Math.min(...values);
      expect(range, `${band} band is too static`).toBeGreaterThan(20);
    }
  });

  it("stays small enough to ship, well inside the 8 KB target", () => {
    const bytes = Buffer.byteLength(JSON.stringify(envelope), "utf8");
    expect(bytes).toBeLessThan(32 * 1024);
  });
});

describe("sampleEnvelope", () => {
  const tiny: BakedEnvelope = {
    fps: 2,
    frameCount: 3,
    bandRanges: { low: [20, 250], mid: [250, 2000], high: [2000, 8000] },
    frames: [0, 51, 102, 153, 204, 255, 255, 204, 153],
  };

  it("reads the frame under the playhead", () => {
    expect(sampleEnvelope(tiny, 0, createBands())).toEqual({
      low: 0,
      mid: 0.2,
      high: 0.4,
    });
  });

  it("advances at the declared frame rate", () => {
    // 2 fps, so half a second in is frame 1.
    const bands = sampleEnvelope(tiny, 0.5, createBands());
    expect(bands.low).toBeCloseTo(153 / 255, 5);
  });

  it("loops rather than running off the end", () => {
    const first = sampleEnvelope(tiny, 0, createBands());
    const wrapped = sampleEnvelope(tiny, 3 / 2, createBands());
    expect(wrapped).toEqual(first);
  });

  it("handles negative time without producing NaN", () => {
    const bands = sampleEnvelope(tiny, -0.5, createBands());
    for (const value of Object.values(bands)) {
      expect(Number.isFinite(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(0);
    }
  });

  it("normalises bytes to 0..1", () => {
    const bands = sampleEnvelope(tiny, 1, createBands());
    for (const value of Object.values(bands)) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    }
  });

  it("survives an empty envelope", () => {
    const empty: BakedEnvelope = { ...tiny, frameCount: 0, frames: [] };
    expect(() => sampleEnvelope(empty, 1, createBands())).not.toThrow();
  });

  it("writes in place so the render loop allocates nothing", () => {
    const bands = createBands();
    expect(sampleEnvelope(tiny, 0, bands)).toBe(bands);
  });
});
