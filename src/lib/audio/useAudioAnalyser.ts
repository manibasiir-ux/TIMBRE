"use client";

import { useEffect, useRef } from "react";

import { FFT_SIZE, audioEngine } from "./AudioEngine";
import {
  type Bands,
  computeBands,
  createBands,
  smoothBandsInto,
} from "./bands";
import { onTick } from "@/lib/motion/ticker";
import envelope from "@/data/fft-envelope.json";

/**
 * Normalised low / mid / high bands for the current frame, FR-03.
 *
 * Returns a ref, never state. These values change every frame; putting them in
 * React state would re-render the tree sixty times a second. The consumer reads
 * `bands.current` inside its own render loop.
 *
 * Edge case E2: when consent is declined or the context never started, the
 * bands are driven from a baked envelope analysed offline from the same bed,
 * using the same band ranges. The sculpture keeps moving to the shape of music
 * the visitor cannot hear, so the sound-off experience is a designed one rather
 * than a frozen one.
 */

export type BakedEnvelope = {
  fps: number;
  frameCount: number;
  /** The Hz windows the generator reduced with; asserted against BAND_RANGES. */
  bandRanges: Record<"low" | "mid" | "high", [number, number]>;
  /** Flat triples of low, mid, high, quantised to 0..255. */
  frames: number[];
};

const baked = envelope as BakedEnvelope;

export function sampleEnvelope(
  data: BakedEnvelope,
  elapsedSeconds: number,
  into: Bands,
): Bands {
  if (data.frameCount === 0) return into;

  const frame =
    ((Math.floor(elapsedSeconds * data.fps) % data.frameCount) +
      data.frameCount) %
    data.frameCount;
  const offset = frame * 3;

  into.low = (data.frames[offset] ?? 0) / 255;
  into.mid = (data.frames[offset + 1] ?? 0) / 255;
  into.high = (data.frames[offset + 2] ?? 0) / 255;
  return into;
}

export function useAudioAnalyser() {
  const bands = useRef<Bands>(createBands(0));

  useEffect(() => {
    const target = createBands(0);
    let start: number | null = null;

    // Subscribed to the shared ticker rather than requestAnimationFrame: R4
    // wants exactly one frame loop, and the bands the sculpture reads must come
    // from the same timestamp that rendered it.
    return onTick((_deltaMs, timeSeconds) => {
      if (start === null) start = timeSeconds;

      if (audioEngine.isInitialised) {
        const data = audioEngine.getFrequencyData();
        const next = computeBands(data, audioEngine.sampleRate, FFT_SIZE);
        target.low = next.low;
        target.mid = next.mid;
        target.high = next.high;
      } else {
        sampleEnvelope(baked, timeSeconds - start, target);
      }

      smoothBandsInto(bands.current, target);
    });
  }, []);

  return { bands };
}
