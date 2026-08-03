/**
 * Synthesises TIMBRE's placeholder audio and the baked FFT envelope.
 *
 * The studio's real bed and stems do not exist yet, and the whole product rests
 * on a sculpture reacting to live analysis, so there has to be something real to
 * analyse. This produces genuine WAV files rather than faking the analysis, so
 * the audio path is exercised end to end and swapping in the real masters later
 * changes no code.
 *
 * Deliberately dependency-free: WAV encoding, K-weighted loudness and the FFT
 * are all a page of maths each, and none of it is worth an npm dependency in a
 * build that has to stay auditable.
 *
 * Output:
 *   public/audio/*.wav        git-ignored, regenerated on demand
 *   src/data/fft-envelope.json committed, drives the sound-off sculpture (E2)
 *
 * Usage: node scripts/generate-audio.mjs [--force]
 */

import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const AUDIO_DIR = join(ROOT, "public", "audio");
const DATA_DIR = join(ROOT, "src", "data");

const SAMPLE_RATE = 32_000;
const TARGET_LUFS = -18; // specification §Phase 2, the bed sits at -18 LUFS
const ENVELOPE_FPS = 60;
const FFT_SIZE = 2048;

/**
 * Must stay identical to BAND_RANGES in src/lib/audio/bands.ts, or the baked
 * motion will not match the live motion. The ranges are written into the JSON
 * and a unit test asserts the two agree.
 */
const BAND_RANGES = {
  low: [20, 250],
  mid: [250, 2000],
  high: [2000, 8000],
};

// AnalyserNode's byte conversion range. Matching it keeps the baked envelope's
// dynamics in step with the live analyser's.
const MIN_DECIBELS = -100;
const MAX_DECIBELS = -30;

const force = process.argv.includes("--force");

/* ------------------------------------------------------------------ *
 * Deterministic noise
 * ------------------------------------------------------------------ */

/** mulberry32: same output every run, so builds are reproducible. */
function makeRandom(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ------------------------------------------------------------------ *
 * Synthesis
 * ------------------------------------------------------------------ */

/**
 * Every partial and LFO uses a frequency that completes a whole number of
 * cycles across the loop, which is what makes the loop seamless at the zero
 * crossing. With an integer duration in seconds, any integer frequency
 * qualifies, and LFO rates are written as k/duration for the same reason.
 */
function synthesiseBed(seconds, seed = 1) {
  const n = Math.floor(seconds * SAMPLE_RATE);
  const out = new Float64Array(n);
  const random = makeRandom(seed);

  // Content is spread deliberately across all three analysis bands. A bed
  // weighted only towards its fundamentals leaves the mid and high bands
  // reading a noise floor, which makes two thirds of the sculpture's
  // displacement sit still. Every partial gets its own LFO rate so the bands
  // move independently rather than pumping together.
  //
  // This is the second tuning. The first put six partials between 2.2 and 7 kHz
  // and a flat white-noise floor on top of them, which is the region the ear is
  // most sensitive to and the reason the bed was tiring after a few minutes.
  // Fatigue is not loudness — it was already at -16 LUFS — it is where the
  // energy sits and how fast it moves.
  //
  // Three changes. The upper partials come down to a ceiling of 3.3 kHz and
  // lose most of their gain, keeping enough above 2 kHz for the analyser's high
  // band to have something to read without any of it landing in the glare. The
  // low end gains a partial and takes more weight, so the bed has body to sit
  // on rather than being all edge. And every modulation rate is halved, so it
  // breathes at walking pace instead of shimmering.
  // Depth is per band, not global. The first attempt at a calmer bed shallowed
  // every modulation at once and the envelope test caught what that costs: the
  // low band's range fell to 13 against the 20 it needs, so the sculpture's
  // bass-driven swell would have gone nearly static. Comfort and movement are
  // not the same axis — glare lives in the high partials, and motion lives in
  // the low ones. The lows keep their depth, the highs lose theirs.
  const partials = [
    // Low, 20-250 Hz: the weight, and where the movement is allowed to live
    { hz: 41.25, gain: 0.34, lfo: 0.5 / seconds, depth: 0.45 },
    { hz: 55, gain: 0.42, lfo: 1 / seconds, depth: 0.5 },
    { hz: 110, gain: 0.26, lfo: 1.5 / seconds, depth: 0.45 },
    { hz: 165, gain: 0.15, lfo: 2 / seconds, depth: 0.4 },
    // Mid, 250-2000 Hz: the body.
    //
    // Depth here is doing a different job from depth in the lows. Quietening
    // this band for calm took its movement with it and the envelope's mid range
    // fell to 18 against the 20 the sculpture needs. Depth is variation, not
    // energy: these move more than they used to while being no brighter, which
    // is the only way to have both.
    // Two rates, not eight. Eight partials each drifting on their own rate
    // cancel in aggregate — raising every depth moved the band's range from 18
    // to 19 and no further, because while one partial rose another fell. In
    // two groups they reinforce, so the band breathes as a body. This is the
    // one place coherence is wanted: the sculpture reads total band energy, and
    // total band energy is exactly what independent modulation flattens.
    { hz: 220, gain: 0.15, lfo: 1.5 / seconds, depth: 0.46 },
    { hz: 330, gain: 0.14, lfo: 2.5 / seconds, depth: 0.44 },
    { hz: 440, gain: 0.11, lfo: 1.5 / seconds, depth: 0.44 },
    { hz: 554, gain: 0.085, lfo: 1.5 / seconds, depth: 0.42 },
    { hz: 660, gain: 0.075, lfo: 2.5 / seconds, depth: 0.42 },
    { hz: 880, gain: 0.055, lfo: 1.5 / seconds, depth: 0.4 },
    { hz: 1320, gain: 0.038, lfo: 2.5 / seconds, depth: 0.4 },
    { hz: 1760, gain: 0.026, lfo: 1.5 / seconds, depth: 0.38 },
    // High, 2000-8000 Hz: a suggestion of presence. The band's movement does
    // not come from here — see the air below.
    { hz: 2200, gain: 0.012, lfo: 1.5 / seconds, depth: 0.5 },
    { hz: 2640, gain: 0.008, lfo: 1.5 / seconds, depth: 0.5 },
  ];

  // The air is what moves the high band, and it took three failed attempts to
  // work out why.
  //
  // `averageBand` averages every FFT bin between 2 and 8 kHz — about 384 of
  // them at this resolution — after converting each to decibels. Three pure
  // tones occupy three bins; the remaining 381 sit at the floor and dominate
  // the mean. Raising or deepening those tones moved the band's range from 6 to
  // 8 against the 20 it needs, because tones cannot shift an average taken over
  // hundreds of bins they are not in.
  //
  // Broadband noise is in all of them, which is why the original tuning passed
  // and why removing its hiss broke this. The resolution is that the scale is
  // logarithmic: quiet noise modulated deeply swings just as far in decibels as
  // loud noise modulated shallowly. So the air is quieter than it has ever been
  // and breathes almost to silence and back, which reads as a room rather than
  // as tape while giving the sculpture a high band that genuinely moves.
  const noiseCoefficient = Math.exp((-2 * Math.PI * 5000) / SAMPLE_RATE);
  let noiseState = 0;

  for (let i = 0; i < n; i += 1) {
    const t = i / SAMPLE_RATE;
    let sample = 0;

    for (const { hz, gain, lfo, depth } of partials) {
      const swing = 1 - depth + depth * Math.sin(2 * Math.PI * lfo * t);
      sample += Math.sin(2 * Math.PI * hz * t) * gain * swing;
    }

    // A slow swell so the low band has something to move against.
    sample *= 0.74 + 0.26 * Math.sin(2 * Math.PI * (0.5 / seconds) * t);

    // Air, itself modulated, so the high band breathes rather than sitting on
    // a constant noise floor.
    const air = 0.08 + 0.92 * Math.sin(2 * Math.PI * (1.5 / seconds) * t) ** 2;
    noiseState =
      noiseState * noiseCoefficient +
      (random() * 2 - 1) * (1 - noiseCoefficient);
    sample += noiseState * 0.0055 * air;

    out[i] = sample;
  }

  return out;
}

/**
 * Short per-case stem: a chord with a character, not a harmonic stack.
 *
 * The first version stacked partials 1, 2, 3, 4, 6 and 8 of a root, which is
 * most of a sawtooth: at a 293 Hz root the eighth partial lands at 2.3 kHz and
 * the result buzzes rather than rings. It also added `(random() * 2 - 1) * 0.01`
 * of unfiltered white noise to every sample, which is the wind heard under each
 * case — broadband hiss, straight over the top of the tone.
 *
 * The noise is gone entirely. Purity was the point: a studio that sells sonic
 * identity cannot audition its work through a layer of hiss. What is left is a
 * set of intervals chosen per case, weighted so the fundamental carries and
 * everything above it supports rather than competes.
 *
 * Every frequency is rounded to a whole number of cycles across the stem, so
 * the loop closes without a click. `voices` are ratios against the root, which
 * is what lets each case have a different chord rather than a different pitch
 * of the same one.
 */
function synthesiseStem(seconds, rootHz, voices) {
  const n = Math.floor(seconds * SAMPLE_RATE);
  const out = new Float64Array(n);

  // A cycle count rather than a frequency: an integer here is the guarantee
  // that the waveform arrives back where it started.
  const tuned = voices.map(({ ratio, gain, lfo }) => ({
    cycles: Math.max(1, Math.round(rootHz * ratio * seconds)),
    gain,
    lfo,
  }));

  for (let i = 0; i < n; i += 1) {
    const t = i / SAMPLE_RATE;
    const phase = t / seconds;
    let sample = 0;

    for (const { cycles, gain, lfo } of tuned) {
      // Shallow, slow, and different per voice, so the chord breathes from the
      // inside instead of pulsing as one block.
      const swing = 0.78 + 0.22 * Math.sin(2 * Math.PI * lfo * phase);
      sample += Math.sin(2 * Math.PI * cycles * phase) * gain * swing;
    }

    // A single arc over the whole stem, zero at both ends. It loops silently by
    // construction, and it gives each case an arrival rather than a switch.
    sample *= Math.pow(Math.sin(Math.PI * phase), 1.4);

    out[i] = sample;
  }

  return out;
}

/**
 * The 1.4s confirmation mnemonic played on brief submission (flow C step 5).
 * A rising perfect fifth into an octave, each note decaying, so it reads as
 * resolution rather than alert.
 */
function synthesiseMnemonic(seconds = 1.4) {
  const n = Math.floor(seconds * SAMPLE_RATE);
  const out = new Float64Array(n);
  const notes = [
    { hz: 440, start: 0.0, length: 0.5 },
    { hz: 660, start: 0.28, length: 0.6 },
    { hz: 880, start: 0.56, length: 0.84 },
  ];

  for (let i = 0; i < n; i += 1) {
    const t = i / SAMPLE_RATE;
    let sample = 0;

    for (const { hz, start, length } of notes) {
      if (t < start || t > start + length) continue;
      const local = (t - start) / length;
      // Fast attack, exponential decay: struck, not swelled.
      const envelope = Math.min(1, local * 40) * Math.exp(-4 * local);
      sample +=
        (Math.sin(2 * Math.PI * hz * t) +
          Math.sin(2 * Math.PI * hz * 2 * t) * 0.3) *
        envelope *
        0.35;
    }

    out[i] = sample;
  }

  return out;
}

/* ------------------------------------------------------------------ *
 * Loudness — ITU-R BS.1770 K-weighting, ungated
 * ------------------------------------------------------------------ */

function biquad(samples, b, a) {
  const out = new Float64Array(samples.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;

  for (let i = 0; i < samples.length; i += 1) {
    const x0 = samples[i];
    const y0 =
      (b[0] / a[0]) * x0 +
      (b[1] / a[0]) * x1 +
      (b[2] / a[0]) * x2 -
      (a[1] / a[0]) * y1 -
      (a[2] / a[0]) * y2;
    out[i] = y0;
    x2 = x1; x1 = x0;
    y2 = y1; y1 = y0;
  }

  return out;
}

function highShelf(f0, gainDb, q, fs) {
  const A = 10 ** (gainDb / 40);
  const w0 = (2 * Math.PI * f0) / fs;
  const cos = Math.cos(w0);
  const alpha = Math.sin(w0) / (2 * q);
  const sqrtA2alpha = 2 * Math.sqrt(A) * alpha;

  return {
    b: [
      A * (A + 1 + (A - 1) * cos + sqrtA2alpha),
      -2 * A * (A - 1 + (A + 1) * cos),
      A * (A + 1 + (A - 1) * cos - sqrtA2alpha),
    ],
    a: [
      A + 1 - (A - 1) * cos + sqrtA2alpha,
      2 * (A - 1 - (A + 1) * cos),
      A + 1 - (A - 1) * cos - sqrtA2alpha,
    ],
  };
}

function highPass(f0, q, fs) {
  const w0 = (2 * Math.PI * f0) / fs;
  const cos = Math.cos(w0);
  const alpha = Math.sin(w0) / (2 * q);

  return {
    b: [(1 + cos) / 2, -(1 + cos), (1 + cos) / 2],
    a: [1 + alpha, -2 * cos, 1 - alpha],
  };
}

/**
 * Integrated loudness in LUFS.
 *
 * This is the K-weighting and mean-square stage of BS.1770 with the RBJ
 * cookbook used to design the two filters at the working sample rate, and
 * without the -70/-10 LUFS relative gating of the full standard. For material
 * this uniform the gate would change little, but the number is an approximation
 * and is reported as such.
 */
function measureLufs(samples) {
  const shelf = highShelf(1681.97, 3.999, 0.7071, SAMPLE_RATE);
  const pass = highPass(38.13, 0.5003, SAMPLE_RATE);
  const weighted = biquad(biquad(samples, shelf.b, shelf.a), pass.b, pass.a);

  let sum = 0;
  for (let i = 0; i < weighted.length; i += 1) sum += weighted[i] * weighted[i];
  const meanSquare = sum / weighted.length;

  if (meanSquare <= 0) return -Infinity;
  return -0.691 + 10 * Math.log10(meanSquare);
}

function normaliseToLufs(samples, targetLufs) {
  const current = measureLufs(samples);
  if (!Number.isFinite(current)) return { samples, measured: current, gain: 1 };

  let gain = 10 ** ((targetLufs - current) / 20);

  // Never let loudness matching cause clipping; back off to leave 0.5 dB of
  // headroom and report the true resulting loudness.
  let peak = 0;
  for (let i = 0; i < samples.length; i += 1) {
    peak = Math.max(peak, Math.abs(samples[i]));
  }
  const ceiling = 0.944 / (peak || 1); // -0.5 dBFS
  if (gain > ceiling) gain = ceiling;

  const out = new Float64Array(samples.length);
  for (let i = 0; i < samples.length; i += 1) out[i] = samples[i] * gain;

  return { samples: out, measured: measureLufs(out), gain };
}

/* ------------------------------------------------------------------ *
 * WAV
 * ------------------------------------------------------------------ */

function encodeWav(samples, sampleRate) {
  const bytes = samples.length * 2;
  const buffer = Buffer.alloc(44 + bytes);

  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + bytes, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(1, 22); // mono
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(bytes, 40);

  for (let i = 0; i < samples.length; i += 1) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    buffer.writeInt16LE(Math.round(clamped * 32767), 44 + i * 2);
  }

  return buffer;
}

/* ------------------------------------------------------------------ *
 * FFT and the baked envelope
 * ------------------------------------------------------------------ */

/** In-place iterative radix-2 Cooley-Tukey. Length must be a power of two. */
function fft(re, im) {
  const n = re.length;

  for (let i = 1, j = 0; i < n; i += 1) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }

  for (let len = 2; len <= n; len <<= 1) {
    const angle = (-2 * Math.PI) / len;
    const wRe = Math.cos(angle);
    const wIm = Math.sin(angle);

    for (let i = 0; i < n; i += len) {
      let curRe = 1;
      let curIm = 0;

      for (let k = 0; k < len / 2; k += 1) {
        const aRe = re[i + k];
        const aIm = im[i + k];
        const bRe = re[i + k + len / 2] * curRe - im[i + k + len / 2] * curIm;
        const bIm = re[i + k + len / 2] * curIm + im[i + k + len / 2] * curRe;

        re[i + k] = aRe + bRe;
        im[i + k] = aIm + bIm;
        re[i + k + len / 2] = aRe - bRe;
        im[i + k + len / 2] = aIm - bIm;

        const nextRe = curRe * wRe - curIm * wIm;
        curIm = curRe * wIm + curIm * wRe;
        curRe = nextRe;
      }
    }
  }
}

function averageBand(bins, fromHz, toHz) {
  const hzPerBin = SAMPLE_RATE / 2 / bins.length;
  let start = Math.floor(fromHz / hzPerBin);
  let end = Math.ceil(toHz / hzPerBin);
  start = Math.max(0, Math.min(start, bins.length - 1));
  end = Math.max(start + 1, Math.min(end, bins.length));

  let sum = 0;
  for (let i = start; i < end; i += 1) sum += bins[i];
  return sum / (end - start) / 255;
}

/**
 * Analyses the bed at ENVELOPE_FPS and reduces each frame to three bytes,
 * reproducing what the live AnalyserNode plus computeBands would produce.
 */
function bakeEnvelope(samples) {
  const hop = Math.floor(SAMPLE_RATE / ENVELOPE_FPS);
  const frameCount = Math.floor(samples.length / hop);
  const frames = [];

  const window = new Float64Array(FFT_SIZE);
  for (let i = 0; i < FFT_SIZE; i += 1) {
    window[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (FFT_SIZE - 1)));
  }

  const bins = new Uint8Array(FFT_SIZE / 2);

  for (let f = 0; f < frameCount; f += 1) {
    const re = new Float64Array(FFT_SIZE);
    const im = new Float64Array(FFT_SIZE);

    for (let i = 0; i < FFT_SIZE; i += 1) {
      // Wrap rather than zero-pad: the source loops, so the analysis should too.
      re[i] = samples[(f * hop + i) % samples.length] * window[i];
    }

    fft(re, im);

    for (let i = 0; i < bins.length; i += 1) {
      const magnitude =
        Math.sqrt(re[i] * re[i] + im[i] * im[i]) / (FFT_SIZE / 2);
      const db = 20 * Math.log10(magnitude || 1e-12);
      const scaled =
        ((db - MIN_DECIBELS) / (MAX_DECIBELS - MIN_DECIBELS)) * 255;
      bins[i] = Math.max(0, Math.min(255, Math.round(scaled)));
    }

    frames.push(
      Math.round(averageBand(bins, ...BAND_RANGES.low) * 255),
      Math.round(averageBand(bins, ...BAND_RANGES.mid) * 255),
      Math.round(averageBand(bins, ...BAND_RANGES.high) * 255),
    );
  }

  return { fps: ENVELOPE_FPS, frameCount, bandRanges: BAND_RANGES, frames };
}

/* ------------------------------------------------------------------ *
 * Main
 * ------------------------------------------------------------------ */

const BED_SECONDS = 16;

/**
 * A chord per case, chosen to say what the case study says.
 *
 * Ratios are just intonation rather than equal temperament — 3/2, 5/4, 9/8 and
 * so on — because these are sustained tones with no other instrument to be in
 * tune with, and pure ratios beat far less than tempered ones. Beating is what
 * makes a held chord feel restless.
 */
const STEMS = [
  {
    // Kestrel: a payment confirming. An octave and a fifth, nothing ambiguous.
    id: "kestrel",
    rootHz: 220,
    seconds: 8,
    voices: [
      { ratio: 1, gain: 0.5, lfo: 1 },
      { ratio: 2, gain: 0.26, lfo: 1.5 },
      { ratio: 3, gain: 0.12, lfo: 2 },
      { ratio: 4, gain: 0.05, lfo: 2.5 },
      { ratio: 6, gain: 0.02, lfo: 3 },
    ],
  },
  {
    // Halcyon: a vehicle waking. A suspended fourth resolving nowhere, which
    // is what a start-up chime is — an opening, not a full stop.
    id: "halcyon",
    rootHz: 165,
    seconds: 8,
    voices: [
      { ratio: 1, gain: 0.46, lfo: 1 },
      { ratio: 4 / 3, gain: 0.22, lfo: 1.5 },
      { ratio: 2, gain: 0.2, lfo: 2 },
      { ratio: 8 / 3, gain: 0.08, lfo: 2.5 },
      { ratio: 4, gain: 0.03, lfo: 3.5 },
    ],
  },
  {
    // Solene: a lobby at low volume. A major ninth, wide and unhurried, with
    // the weight an octave below everything else.
    id: "solene",
    rootHz: 146.5,
    seconds: 8,
    voices: [
      { ratio: 1, gain: 0.52, lfo: 0.5 },
      { ratio: 3 / 2, gain: 0.2, lfo: 1 },
      { ratio: 2, gain: 0.18, lfo: 1.5 },
      { ratio: 9 / 4, gain: 0.07, lfo: 2 },
      { ratio: 3, gain: 0.03, lfo: 2.5 },
    ],
  },
  {
    // The carrier: boarding a national airline. A minor third under a fifth —
    // formal, and the only chord in the set that is not entirely bright.
    id: "aviation",
    rootHz: 196,
    seconds: 8,
    voices: [
      { ratio: 1, gain: 0.48, lfo: 1 },
      { ratio: 6 / 5, gain: 0.18, lfo: 1.5 },
      { ratio: 3 / 2, gain: 0.16, lfo: 2 },
      { ratio: 2, gain: 0.14, lfo: 2.5 },
      { ratio: 3, gain: 0.04, lfo: 3 },
    ],
  },
];

function main() {
  mkdirSync(AUDIO_DIR, { recursive: true });
  mkdirSync(DATA_DIR, { recursive: true });

  const bedPath = join(AUDIO_DIR, "bed.wav");
  const envelopePath = join(DATA_DIR, "fft-envelope.json");

  if (!force && existsSync(bedPath) && existsSync(envelopePath)) {
    console.log("audio: already generated, skipping (pass --force to rebuild)");
    return;
  }

  console.log(`audio: ${SAMPLE_RATE} Hz mono, target ${TARGET_LUFS} LUFS`);

  const rawBed = synthesiseBed(BED_SECONDS);
  const bed = normaliseToLufs(rawBed, TARGET_LUFS);
  writeFileSync(bedPath, encodeWav(bed.samples, SAMPLE_RATE));
  console.log(
    `  bed.wav            ${BED_SECONDS}s  ${bed.measured.toFixed(2)} LUFS`,
  );

  for (const { id, rootHz, seconds, voices } of STEMS) {
    const stem = normaliseToLufs(
      synthesiseStem(seconds, rootHz, voices),
      TARGET_LUFS,
    );
    writeFileSync(
      join(AUDIO_DIR, `stem-${id}.wav`),
      encodeWav(stem.samples, SAMPLE_RATE),
    );
    console.log(
      `  stem-${id}.wav`.padEnd(21) +
        `${seconds}s  ${stem.measured.toFixed(2)} LUFS`,
    );
  }

  // Left louder than the bed on purpose: it is a confirmation, and it plays
  // against a ducked background.
  const mnemonic = normaliseToLufs(synthesiseMnemonic(), TARGET_LUFS + 4);
  writeFileSync(
    join(AUDIO_DIR, "mnemonic-confirm.wav"),
    encodeWav(mnemonic.samples, SAMPLE_RATE),
  );
  console.log(
    `  mnemonic-confirm.wav 1.4s  ${mnemonic.measured.toFixed(2)} LUFS`,
  );

  const envelope = bakeEnvelope(bed.samples);
  writeFileSync(envelopePath, JSON.stringify(envelope));
  const kb = (JSON.stringify(envelope).length / 1024).toFixed(1);
  console.log(
    `  fft-envelope.json  ${envelope.frameCount} frames @ ${envelope.fps}fps  ${kb} KB`,
  );
}

main();
