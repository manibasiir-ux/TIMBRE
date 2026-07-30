import type { Bands } from "@/lib/audio/bands";

/**
 * Displacement and colour calibration for the sound sculpture.
 *
 * Separate from the component so it can be tested without a GPU, and because
 * these numbers were derived by measurement rather than taste.
 *
 * They replace the constants printed in specification §7.4, which were written
 * before the analyser existed. Rendered at 1280x720 with the real band data,
 * the published values put fully saturated signal yellow across **14.63% of the
 * viewport**, against the 4% ceiling §3.1 rule 1 sets for the accent. They also
 * displaced the surface by roughly ±0.83 on a radius-1.6 form — over half the
 * radius, which reads as a spike ball rather than a breathing surface.
 *
 * Recalibrated against pixel coverage sampled from a rendered frame at the
 * quietest, median and loudest frames of the baked envelope:
 *
 * | ramp        | quietest | median | loudest |
 * |-------------|----------|--------|---------|
 * | 0.03 -> 0.10 | 1.90%   | 4.77%  | 6.48%   |
 * | 0.04 -> 0.11 | 0.97%   | 3.47%  | 5.09%   |
 * | **0.05 -> 0.12** | **0.38%** | **2.41%** | **3.85%** |
 * | 0.06 -> 0.13 | 0.13%   | 1.50%  | 2.83%   |
 *
 * 0.05 -> 0.12 is the only pair that stays under 4% at the loudest frame while
 * still showing an accent at the quietest. Tighter ramps breach the rule on
 * peaks; looser ones let the accent disappear in quiet passages, and an accent
 * that marks "the thing currently making sound" has to survive quiet music.
 */

export const DISPLACEMENT = {
  /** Baseline swell present even in silence. */
  base: 0.05,
  /** How far the bass band pushes the surface out. */
  lowGain: 0.16,
  /** Amplitude of the standing wave the mids ripple up the vertical axis. */
  midGain: 0.03,
  /** Uniform lift from the highs. */
  highGain: 0.02,
} as const;

/** Displacement values mapping to no signal and to full signal. */
export const SIGNAL_RAMP = { start: 0.05, end: 0.12 } as const;

/** Radius of the icosahedron the displacement is applied to. */
export const SCULPTURE_RADIUS = 1.6;

/**
 * Largest outward displacement possible for the given bands, taking simplex
 * noise and the sine term at their maxima of 1.
 */
export function peakDisplacement(bands: Bands, gain = 1): number {
  return (
    (DISPLACEMENT.base + bands.low * DISPLACEMENT.lowGain) * gain +
    bands.mid * DISPLACEMENT.midGain +
    bands.high * DISPLACEMENT.highGain
  );
}

/** Band values at the loudest frame of the baked envelope. */
export const LOUDEST_FRAME: Bands = { low: 0.85, mid: 0.49, high: 0.39 };
