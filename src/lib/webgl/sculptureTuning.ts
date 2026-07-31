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

/** Displacement values mapping to no signal and to full signal, at gain 1. */
export const SIGNAL_RAMP = { start: 0.05, end: 0.12 } as const;

/**
 * How the signal ramp tracks displacement gain.
 *
 * §7 scrubs displacement gain from 1 to 2.4 as the hero scrolls. Left against a
 * fixed ramp that is not a stylistic choice, it is a rule violation: measured
 * coverage went 3.85% -> 11.65% -> 18.54% across the scrub on desktop, against
 * the 4% cap in §3.1 rule 1. §7 and §3.1 cannot both be satisfied unless the
 * ramp moves with the gain.
 *
 * Scaling the ramp in proportion (exponent 1) is not quite enough — 4.99% at the
 * far end — because displacement also inflates the silhouette, so the object
 * covers more of the viewport as well as lighting more of itself. Measured
 * across desktop, tablet-portrait and phone at gains 1.0/1.4/1.8/2.4:
 *
 * | exponent | worst case | accent at scrub end |
 * |---|---|---|
 * | 1.0  | 4.99% (fails) | 4.99% |
 * | **1.2** | **3.85%** | **2.24%** |
 * | 1.35 | 3.85% | 0.67% |
 * | 1.5  | 3.85% | 0.09% |
 *
 * 1.2 is the shallowest exponent that holds the rule. The steeper ones also
 * pass, but by extinguishing the accent exactly when the sculpture is at its
 * most active, which inverts what the accent is for.
 */
export const RAMP_GAIN_EXPONENT = 1.2;

/** The signal ramp at a given total displacement gain. */
export function signalRampFor(gain: number): { start: number; end: number } {
  const safe = Number.isFinite(gain) && gain > 0 ? gain : 1;
  const scale = Math.pow(safe, RAMP_GAIN_EXPONENT);
  return { start: SIGNAL_RAMP.start * scale, end: SIGNAL_RAMP.end * scale };
}

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

/** The aspect the sculpture was framed and colour-calibrated against. */
export const REFERENCE_ASPECT = 16 / 9;
export const BASE_CAMERA_Z = 5.2;

/**
 * Camera distance that holds the sculpture at a constant fraction of the
 * viewport whatever its shape.
 *
 * A perspective camera fixes the *vertical* field of view, so a narrower
 * viewport shows the same vertical extent across fewer horizontal pixels and
 * the object swells to fill it. With the camera pinned at BASE_CAMERA_Z,
 * measured signal coverage ran 3.85% at 1280×720 but 7.97% on a tablet and
 * 10.19% on a 375×812 phone — two and a half times the 4% ceiling in §3.1
 * rule 1. The colour calibration above is only meaningful if the object
 * subtends a consistent area.
 *
 * Projected area falls with the square of distance, so distance scales with the
 * square root of the aspect shortfall. Measured after the change: 3.85 / 3.80 /
 * 3.57 / 3.56 / 3.47% across desktop, laptop, pane, tablet and phone.
 *
 * Viewports wider than the reference are left alone. Pulling the camera closer
 * would overfill them vertically, and §9 handles ultrawide by widening the
 * field of view instead.
 */
export function cameraDistanceForAspect(aspect: number): number {
  if (!Number.isFinite(aspect) || aspect <= 0) return BASE_CAMERA_Z;
  return BASE_CAMERA_Z * Math.sqrt(Math.max(REFERENCE_ASPECT / aspect, 1));
}
