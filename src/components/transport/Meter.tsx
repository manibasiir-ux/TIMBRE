"use client";

import { useEffect, useRef } from "react";

import { audioEngine } from "@/lib/audio/AudioEngine";
import {
  PeakHold,
  envelopeStep,
  stereoSpread,
} from "@/lib/audio/meterEnvelope";
import { onTick } from "@/lib/motion/ticker";

/**
 * The stereo VU pair, specification §8.
 *
 * Driven straight from the DOM in an animation frame rather than through React
 * state. At sixty frames a second a state update per frame would re-render the
 * whole transport bar; writing the transform directly costs nothing and keeps
 * the meters off the reconciler entirely.
 *
 * §10: amplitude-mapped, never strobing, and nothing flashes above 3 Hz.
 */
export function Meter({ active }: { active: boolean }) {
  const left = useRef<HTMLSpanElement>(null);
  const right = useRef<HTMLSpanElement>(null);
  const leftCap = useRef<HTMLSpanElement>(null);
  const rightCap = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let levelL = 0;
    let levelR = 0;
    const peakL = new PeakHold();
    const peakR = new PeakHold();

    const paint = (
      bar: HTMLSpanElement | null,
      cap: HTMLSpanElement | null,
      level: number,
      peak: number,
    ) => {
      if (bar) bar.style.transform = `scaleY(${Math.max(0.02, level)})`;
      if (cap) cap.style.transform = `translateY(${-peak * 100}%)`;
    };

    // Shared ticker, not requestAnimationFrame: see lib/motion/ticker.
    return onTick((delta) => {
      const source = active ? audioEngine.getLevel() : 0;
      const [targetL, targetR] = stereoSpread(source);

      levelL = envelopeStep(levelL, targetL, delta);
      levelR = envelopeStep(levelR, targetR, delta);

      paint(left.current, leftCap.current, levelL, peakL.update(levelL, delta));
      paint(
        right.current,
        rightCap.current,
        levelR,
        peakR.update(levelR, delta),
      );
    });
  }, [active]);

  return (
    <div
      className="flex h-6 items-end gap-1"
      aria-hidden="true"
      data-testid="transport-meter"
    >
      {(
        [
          [left, leftCap],
          [right, rightCap],
        ] as const
      ).map(([bar, cap], index) => (
        <span key={index} className="relative block h-full w-1 bg-ink-15">
          <span
            ref={bar}
            className="absolute inset-x-0 bottom-0 block h-full origin-bottom bg-ink-40"
            style={{ transform: "scaleY(0.02)" }}
          />
          <span
            ref={cap}
            className="absolute inset-x-0 bottom-0 block h-px bg-signal"
            style={{ transform: "translateY(0%)" }}
          />
        </span>
      ))}
    </div>
  );
}
