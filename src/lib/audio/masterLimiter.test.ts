import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  LIMITER_ATTACK_SECONDS,
  LIMITER_KNEE_DB,
  LIMITER_RATIO,
  LIMITER_RELEASE_SECONDS,
  LIMITER_THRESHOLD_DB,
} from "./AudioEngine";
import { MIX_CHANNELS } from "./mixer";

/**
 * Master limiting, and the levels it depends on.
 *
 * The reported bug was harsh static on louder parts of the desk mix. Each asset
 * is clean on its own — no file has a single sample at full scale — but the desk
 * is five channels summing into one master at unity, and `destination` hard
 * clips anything outside [-1, 1]. Hard clipping is broadband harmonic
 * distortion, which is what a listener hears as static, and it appears only as
 * the mix gets louder because that is when the sum crosses one.
 *
 * The graph now runs master -> limiter -> analyser -> destination. These tests
 * guard the three things that fix depends on, none of which is visible from
 * reading `AudioEngine`:
 *
 *  1. The default mix -- the bed alone, which is what a visitor hears unless
 *     they open the desk -- stays below the threshold, so it is untouched. That
 *     margin is about 0.14 dB.
 *  2. Stems do sit above the threshold, so a lone stem is peak-limited. That is
 *     a deliberate trade and it has to stay gentle.
 *  3. The worst mix the desk can build still lands under zero after limiting.
 *
 * All three are properties of the *audio files*, so re-rendering them through
 * `scripts/generate-audio.mjs` at a different level is exactly what would break
 * the assumption silently. That is what this file exists to catch.
 */

/** Minimal 16-bit PCM WAV reader: enough to find the data chunk and peak it. */
function peakDbfs(file: string): number {
  const buf = readFileSync(join(process.cwd(), "public", "audio", file));

  // Walk the RIFF chunks rather than assuming a 44-byte header, which is only
  // true of the simplest writers and is not guaranteed by the format.
  let offset = 12;
  let dataStart = -1;
  let dataLength = 0;
  while (offset + 8 <= buf.length) {
    const id = buf.toString("ascii", offset, offset + 4);
    const size = buf.readUInt32LE(offset + 4);
    if (id === "data") {
      dataStart = offset + 8;
      dataLength = size;
      break;
    }
    offset += 8 + size + (size % 2);
  }
  if (dataStart < 0) throw new Error(`no data chunk in ${file}`);

  let peak = 0;
  for (let i = dataStart; i + 1 < dataStart + dataLength; i += 2) {
    const sample = Math.abs(buf.readInt16LE(i)) / 32768;
    if (sample > peak) peak = sample;
  }
  return 20 * Math.log10(peak);
}

/** What a hard-knee compressor does to a peak above its threshold. */
function afterLimiting(inputDb: number): number {
  if (inputDb <= LIMITER_THRESHOLD_DB) return inputDb;
  return (
    LIMITER_THRESHOLD_DB + (inputDb - LIMITER_THRESHOLD_DB) / LIMITER_RATIO
  );
}

describe("master limiter settings", () => {
  it("is a limiter, not a compressor", () => {
    // A soft knee and a low ratio would shape dynamics rather than hold a
    // ceiling, which is not what this is for.
    expect(LIMITER_KNEE_DB).toBe(0);
    expect(LIMITER_RATIO).toBeGreaterThanOrEqual(12);
  });

  it("keeps margin below zero for overshoot", () => {
    // DynamicsCompressorNode has no lookahead, so a transient can exceed the
    // ceiling it is given. The threshold has to sit below zero, not at it.
    expect(LIMITER_THRESHOLD_DB).toBeLessThan(0);
  });

  it("moves gain slowly enough not to pump, fast enough to catch a peak", () => {
    expect(LIMITER_ATTACK_SECONDS).toBeLessThanOrEqual(0.01);
    expect(LIMITER_RELEASE_SECONDS).toBeGreaterThanOrEqual(0.1);
  });
});

describe("desk levels against the limiter", () => {
  const channelPeaks = MIX_CHANNELS.map((channel) => ({
    id: channel.id,
    label: channel.label,
    initial: channel.initial,
    peak: peakDbfs(channel.url.split("/").pop() as string),
  }));

  /** The one channel up before a visitor touches anything. */
  const defaultChannels = channelPeaks.filter((c) => c.initial > 0);

  it("has a default mix to protect", () => {
    expect(defaultChannels.length).toBeGreaterThan(0);
  });

  it.each(defaultChannels)(
    "$label is the default mix and never reaches the limiter",
    ({ peak }) => {
      // Most visitors never open the desk, so the default mix has to be
      // bit-identical to what shipped before the limiter existed. The margin
      // here is only about 0.14 dB, which is why this is asserted against the
      // real file rather than trusted: re-rendering the bed even slightly
      // hotter would start limiting the default experience, and nothing else
      // would tell you.
      expect(peak).toBeLessThan(LIMITER_THRESHOLD_DB);
    },
  );

  it("no asset is already clipped on disk", () => {
    // If this fails the problem is upstream in generate-audio.mjs, and no
    // amount of limiting downstream will undo it.
    for (const { peak } of channelPeaks) expect(peak).toBeLessThan(0);
  });

  it.each(channelPeaks.filter((c) => c.peak > LIMITER_THRESHOLD_DB))(
    "$label is only gently reduced when played alone",
    ({ peak }) => {
      // Stems sit above the threshold, so a lone stem is peak-limited. That is
      // acceptable only while it stays gentle; measured loudness change is
      // about -1.3 dB. Guard the peak reduction that produces it.
      const reduction = peak - afterLimiting(peak);
      expect(reduction).toBeLessThan(4);
    },
  );

  it("the loudest mix the desk can build lands under zero", () => {
    // Worst case: every fader at 100 and every peak landing together. The
    // channels are started in one pass and the generator writes whole cycles
    // per loop, so they stay phase locked -- alignment is not hypothetical.
    const summed = channelPeaks.reduce(
      (total, { peak }) => total + 10 ** (peak / 20),
      0,
    );
    const summedDb = 20 * Math.log10(summed);

    // The bug: without limiting this is comfortably above zero.
    expect(summedDb).toBeGreaterThan(0);

    // The fix: with limiting it is not, and with room to spare for the
    // overshoot a compressor with no lookahead always lets through.
    expect(afterLimiting(summedDb)).toBeLessThan(-3);
  });
});
