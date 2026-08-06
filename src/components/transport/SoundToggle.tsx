"use client";

import { useEffect, useRef } from "react";

import { FFT_SIZE, audioEngine } from "@/lib/audio/AudioEngine";
import {
  METER_BAND_COUNT,
  METER_BAND_EDGES_HZ,
  averageBand,
} from "@/lib/audio/bands";
import { BED } from "@/lib/audio/manifest";
import { envelopeStep } from "@/lib/audio/meterEnvelope";
import { getDictionary } from "@/lib/i18n";
import { onTick } from "@/lib/motion/ticker";
import { usePrefersReducedMotion } from "@/lib/usePrefersReducedMotion";
import { selectAudible, useExperience } from "@/store/useExperience";

/**
 * The sound control, and the only audio control on the site.
 *
 * It replaces a seven-element transport bar: play/pause, a stereo meter, a stem
 * label, a timecode, a scrub track, mute and a desk toggle. Six of those either
 * restated something already visible or answered a question nobody asks of a
 * studio's own showreel — the timecode in particular, since the bed is a
 * seamless loop and its position carries no meaning. What is left is the single
 * question a visitor actually has: is this making noise, and how do I stop it.
 *
 * The bars are the answer to the first half. They move with the real signal
 * rather than looping a canned animation, so a still frame is never lying about
 * whether anything is playing.
 *
 * Each bar is a **frequency band**, not a copy of one overall level. The first
 * version drew all five from `getLevel()`, an RMS across the whole spectrum;
 * measured on the real bed over a full 16-second loop, that number moves
 * through 0.87px of a 16px meter — 5.4% of its travel. The bed is a
 * deliberately calm drone with almost no amplitude variation, so a level meter
 * on it is a static icon that happens to be recalculated sixty times a second.
 * Correct, and useless.
 *
 * Per band the same material moves 9–21%, because bands differ from each other
 * far more than the total varies over time. What the meter draws is therefore a
 * spectrum shape characteristic of what is playing: a descending staircase for
 * the bed, a different profile when a case stem takes over. The edges and the
 * measurements behind them are in bands.ts.
 */

/**
 * Release per band, slowest at the bottom.
 *
 * Mirrors the reasoning behind `SMOOTHING` in bands.ts: bass movement should
 * read as weight, so it settles slowly; the top band is quick so a transient
 * still registers. They share an attack, so a sound lifts the group at once.
 *
 * One entry per band, low to high. A short array is not a crash: `envelopeStep`
 * falls back to its own RELEASE_MS when handed undefined, so an extra band
 * degrades to the default ballistics rather than to NaN.
 */
const RELEASES_MS = [340, 300, 260, 220, 180];

/**
 * Bar height at rest, as a fraction of the full 16px.
 *
 * Never zero: a meter that vanishes reads as broken rather than as quiet. It
 * sits below the quietest band reading for real audio, so the resting pose is
 * unambiguously "nothing playing" rather than "playing something very quiet".
 */
const REST = 0.1;

export function SoundToggle() {
  const ui = getDictionary();
  const consent = useExperience((state) => state.consent);
  const grantConsent = useExperience((state) => state.grantConsent);
  const toggleMute = useExperience((state) => state.toggleMute);
  const audible = useExperience(selectAudible);
  // Edge case E6: the bed failed every retry. A control that cannot do the one
  // thing it offers should say so rather than click silently.
  const unavailable = useExperience((state) =>
    state.unavailableStems.includes(BED.id),
  );
  const reducedMotion = usePrefersReducedMotion();

  const bars = useRef<(HTMLSpanElement | null)[]>([]);

  useEffect(() => {
    const paint = (index: number, value: number) => {
      const bar = bars.current[index];
      if (bar) bar.style.transform = `scaleY(${Math.max(REST, value)})`;
    };

    // §10: no continuous animation under reduced motion. The bars still carry
    // the state — raised when sound is on, at the floor when it is off — they
    // simply hold that pose instead of moving.
    if (reducedMotion) {
      for (let index = 0; index < METER_BAND_COUNT; index += 1) {
        paint(index, audible ? 0.55 : REST);
      }
      return;
    }

    const levels = new Array<number>(METER_BAND_COUNT).fill(0);

    // The shared ticker, not a private requestAnimationFrame. The whole app
    // drives from one loop; adding a second would put this control's frames in
    // a different order to the sculpture's.
    return onTick((delta) => {
      // One read per frame, shared across all five bands. getFrequencyData
      // returns the engine's own buffer, so this allocates nothing.
      const data = audible ? audioEngine.getFrequencyData() : null;

      for (let index = 0; index < levels.length; index += 1) {
        const target = data
          ? averageBand(
              data,
              audioEngine.sampleRate,
              FFT_SIZE,
              METER_BAND_EDGES_HZ[index],
              METER_BAND_EDGES_HZ[index + 1],
            )
          : 0;

        levels[index] = envelopeStep(
          levels[index],
          target,
          delta,
          undefined,
          RELEASES_MS[index],
        );
        paint(index, levels[index]);
      }
    });
  }, [audible, reducedMotion]);

  /**
   * One control, three situations.
   *
   * Someone who chose silence at the gate has to be able to change their mind —
   * §10 requires the choice be reversible, and this is where it reverses. The
   * grant path also resumes the AudioContext, which has to happen inside the
   * click: browsers refuse to start audio outside a real gesture.
   */
  const onToggle = () => {
    if (consent !== "granted") {
      void grantConsent();
      return;
    }
    toggleMute();
  };

  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={unavailable}
      data-sound-toggle
      data-audible={audible}
      aria-label={
        unavailable
          ? ui.a11y.soundUnavailable
          : audible
            ? ui.a11y.soundOff
            : ui.a11y.soundOn
      }
      className="grid size-11 place-items-center transition-opacity duration-[var(--dur-quick)] hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-40"
    >
      <span
        className="flex h-4 items-center gap-[3px]"
        aria-hidden="true"
        data-testid="sound-meter"
      >
        {Array.from({ length: METER_BAND_COUNT }, (_, index) => (
          <span
            key={index}
            ref={(node) => {
              bars.current[index] = node;
            }}
            className={`block h-full w-[2px] origin-center transition-colors duration-[var(--dur-quick)] ${
              audible ? "bg-signal" : "bg-ink-40"
            }`}
            style={{ transform: `scaleY(${REST})` }}
          />
        ))}
      </span>
    </button>
  );
}
