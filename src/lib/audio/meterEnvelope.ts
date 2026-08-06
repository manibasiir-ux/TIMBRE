/**
 * Ballistics for the transport meters, specification §7.
 *
 * The roadmap records four days spent on this: every meter had been snapping to
 * zero on silence, which read as digital and cheap. A 30 ms attack with a 300 ms
 * release and peak-hold caps is what made the bar feel like hardware. It is a
 * detail nobody consciously notices and everybody feels.
 *
 * Exponential rather than linear, because that is how an analogue meter's
 * rectifier and ballistics actually behave — a linear ramp reads as a
 * progress bar, not a meter.
 */

export const ATTACK_MS = 30;
export const RELEASE_MS = 300;
export const PEAK_HOLD_MS = 900;
/** How fast a released peak cap falls, in full-scale units per second. */
export const PEAK_FALL_PER_SECOND = 0.55;

/**
 * Advances a meter one frame toward `target`.
 *
 * Rises fast and falls slow: the asymmetry is the whole point, so transients
 * register but the eye is not asked to follow a flicker back down.
 */
export function envelopeStep(
  current: number,
  target: number,
  deltaMs: number,
  attackMs: number = ATTACK_MS,
  releaseMs: number = RELEASE_MS,
): number {
  if (deltaMs <= 0) return current;

  const tau = target > current ? attackMs : releaseMs;
  if (tau <= 0) return target;

  // Frame-rate independent: the same wall-clock time produces the same
  // movement whether the browser delivered 30 or 144 frames in it.
  const alpha = 1 - Math.exp(-deltaMs / tau);
  return current + (target - current) * alpha;
}

/**
 * A peak-hold cap: jumps to any new maximum, sits there, then falls.
 *
 * Separate from the bar itself because they have different jobs — the bar shows
 * what is happening now, the cap shows what just happened.
 */
export class PeakHold {
  private level = 0;
  private holdRemainingMs = 0;

  get value(): number {
    return this.level;
  }

  update(input: number, deltaMs: number): number {
    if (input >= this.level) {
      this.level = input;
      this.holdRemainingMs = PEAK_HOLD_MS;
      return this.level;
    }

    if (deltaMs > 0) {
      // Only the part of this frame left over after the hold expired may fall.
      // Charging the whole frame would make the cap drop faster than the
      // documented rate, by up to one frame's worth every time a hold ends.
      const fallingMs = deltaMs - Math.max(0, this.holdRemainingMs);
      this.holdRemainingMs = Math.max(0, this.holdRemainingMs - deltaMs);

      if (fallingMs > 0) {
        const fall = (PEAK_FALL_PER_SECOND * fallingMs) / 1000;
        this.level = Math.max(input, this.level - fall);
      }
    }

    return this.level;
  }

  reset(): void {
    this.level = 0;
    this.holdRemainingMs = 0;
  }
}

/**
 * A note on `AudioEngine.getLevel()`, kept because it has now misled twice.
 *
 * It is an RMS across all 1024 FFT bins. Tonal material is a handful of narrow
 * peaks in a mostly empty spectrum, so the mean can never approach 1: a
 * full-scale reference oscillator reads **0.064**, and the bed sits around
 * **0.15** with only 5% of travel across a whole loop. It is a poor driver for
 * anything visual. Drive meters from `averageBand` in bands.ts instead, which
 * is what the sound toggle does.
 */

/** Splits a mono level into a stereo pair with a small fixed offset. */
export function stereoSpread(level: number): [number, number] {
  // The generated audio is mono, so a true stereo reading is not available.
  // Rather than draw two identical bars and imply information that is not
  // there, the right channel is offset slightly so the pair reads as a pair.
  return [level, Math.max(0, level * 0.94)];
}
