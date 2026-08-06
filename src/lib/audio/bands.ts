/**
 * Frequency-band reduction, FR-03.
 *
 * The sculpture's vertex shader takes three scalars, not 1024 FFT bins, so the
 * analyser output is collapsed into low / mid / high. Kept as pure functions
 * with no Web Audio types so the maths is testable without a browser, and so
 * the offline envelope generator in scripts/generate-audio.mjs can reproduce
 * exactly the same reduction. Those two paths agreeing is what makes the
 * sound-off experience feel like the sound-on one.
 */

export type Bands = { low: number; mid: number; high: number };
export type BandName = keyof Bands;

/**
 * Hz boundaries. Low covers bass fundamentals, mid the range that carries most
 * musical energy and voice, high the presence and air that reads as detail.
 * The upper bound stops at 8 kHz because above it there is rarely enough
 * energy to drive visible displacement.
 */
export const BAND_RANGES: Record<BandName, readonly [number, number]> = {
  low: [20, 250],
  mid: [250, 2000],
  high: [2000, 8000],
} as const;

export function createBands(value = 0): Bands {
  return { low: value, mid: value, high: value };
}

/**
 * Band edges for the five-bar sound toggle, log-spaced over 40 Hz–2.8 kHz.
 *
 * Separate from `BAND_RANGES` because the two answer different questions. Those
 * three bands drive a vertex shader and are chosen to describe a sound; these
 * five drive a 16px meter and are chosen so that every bar has something to
 * show on this site's own material.
 *
 * Measured on the bed across a full loop, median per band:
 *
 *     40-94 Hz    0.945      512-1198 Hz   0.280
 *     94-219 Hz   0.848      1198-2800 Hz  0.119
 *     219-512 Hz  0.688
 *
 * with 9-21% of travel each. The first attempt reached 8 kHz and left the top
 * bar at a median of 0.003 — the air in this bed is quiet by design — which
 * reads as a dead pixel rather than as an honest lack of treble. Re-measure
 * these if the bed is ever retuned.
 */
export const METER_BAND_EDGES_HZ = [40, 94, 219, 512, 1198, 2800] as const;

/** How many bars `METER_BAND_EDGES_HZ` describes. */
export const METER_BAND_COUNT = METER_BAND_EDGES_HZ.length - 1;

/**
 * Mean magnitude of the bins covering [fromHz, toHz], normalised to 0..1.
 *
 * `frequencyData` is the byte output of an AnalyserNode: one entry per bin,
 * 0..255, covering 0 Hz to sampleRate / 2 across fftSize / 2 bins.
 */
export function averageBand(
  frequencyData: Uint8Array | number[],
  sampleRate: number,
  fftSize: number,
  fromHz: number,
  toHz: number,
): number {
  if (frequencyData.length === 0 || sampleRate <= 0 || fftSize <= 0) return 0;

  const binCount = frequencyData.length;
  const nyquist = sampleRate / 2;
  const hzPerBin = nyquist / binCount;

  let start = Math.floor(fromHz / hzPerBin);
  let end = Math.ceil(toHz / hzPerBin);

  start = Math.max(0, Math.min(start, binCount - 1));
  end = Math.max(start + 1, Math.min(end, binCount));

  let sum = 0;
  for (let i = start; i < end; i += 1) sum += frequencyData[i];

  return sum / (end - start) / 255;
}

export function computeBands(
  frequencyData: Uint8Array | number[],
  sampleRate: number,
  fftSize: number,
): Bands {
  return {
    low: averageBand(
      frequencyData,
      sampleRate,
      fftSize,
      ...BAND_RANGES.low,
    ),
    mid: averageBand(
      frequencyData,
      sampleRate,
      fftSize,
      ...BAND_RANGES.mid,
    ),
    high: averageBand(
      frequencyData,
      sampleRate,
      fftSize,
      ...BAND_RANGES.high,
    ),
  };
}

export function lerp(from: number, to: number, amount: number): number {
  return from + (to - from) * amount;
}

/**
 * Per-band smoothing factors, matching the lerp rates in design specification
 * §7.4. Low is slowest so bass movement reads as weight; high is fastest so
 * transients still register.
 */
export const SMOOTHING: Bands = { low: 0.18, mid: 0.22, high: 0.3 };

/** Eases `current` toward `target` in place, returning the same object. */
export function smoothBandsInto(
  current: Bands,
  target: Bands,
  factors: Bands = SMOOTHING,
): Bands {
  current.low = lerp(current.low, target.low, factors.low);
  current.mid = lerp(current.mid, target.mid, factors.mid);
  current.high = lerp(current.high, target.high, factors.high);
  return current;
}

/** Decibels to a linear gain multiplier. -12 dB is roughly 0.251. */
export function dbToGain(db: number): number {
  return 10 ** (db / 20);
}

export function gainToDb(gain: number): number {
  return 20 * Math.log10(Math.max(gain, 1e-6));
}
