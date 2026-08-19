"use client";

import { useEffect, useRef } from "react";

import { track } from "@/lib/analytics";
import { audioEngine } from "@/lib/audio/AudioEngine";
import { BED } from "@/lib/audio/manifest";
import { getDictionary } from "@/lib/i18n";
import { useScrollProgress } from "@/lib/useScrollProgress";
import { selectAudible, useExperience } from "@/store/useExperience";

import { MixingDesk } from "./MixingDesk";
import { SoundToggle } from "./SoundToggle";

/**
 * The persistent site controls, replacing the transport bar of specification §8.
 *
 * §8 and FR-06 specify a 64px bar carrying play/pause, a stereo meter, the
 * playing stem's name, a timecode, a scrub track, mute and a desk toggle,
 * present on every route. That shipped, and then read as a media player bolted
 * to a studio's website — seven controls to say "there is sound here", holding
 * a band of every screen for the life of the page.
 *
 * What replaces it is two marks in a corner: sound, and the way to everywhere
 * else. Both are load-bearing. Neither restates anything.
 *
 * Removed deliberately, and why each was safe to remove:
 *
 * - **Timecode.** The bed is a seamless loop. Its position is not information.
 * - **Play/pause.** Two controls for one intent. Sound off is sound off.
 * - **Scrub track.** It showed scroll position, which the scrollbar, the page
 *   itself and the desk's own faders all already show.
 * - **Stem label.** "SHOWREEL BED" names an implementation detail.
 * - **Stereo meter.** Folded into the toggle, where it now doubles as the
 *   on/off indicator instead of sitting beside one.
 *
 * The desk survives intact. It is the site's only navigation, and deleting the
 * bar without it would have left every route but the homepage with no way out.
 */
export function SiteControls() {
  const ui = getDictionary();

  // The desk's faders read scroll position, so this has to keep running even
  // though nothing here draws it any more.
  useScrollProgress();

  const consent = useExperience((state) => state.consent);
  const setPlaying = useExperience((state) => state.setPlaying);
  const toggleMute = useExperience((state) => state.toggleMute);
  const deskOpen = useExperience((state) => state.deskOpen);
  const toggleDesk = useExperience((state) => state.toggleDesk);
  const markStemUnavailable = useExperience(
    (state) => state.markStemUnavailable,
  );
  const audible = useExperience(selectAudible);

  const deskToggle = useRef<HTMLButtonElement>(null);
  /** The shortcut is scoped to focus inside this, per WCAG 2.1.4. */
  const bar = useRef<HTMLDivElement>(null);
  const audibleSeconds = useRef(0);
  const reelMilestone = useRef(false);

  // The bed loads only once consent is granted. Fetching it earlier would pull
  // a megabyte for a visitor who may never ask for sound.
  useEffect(() => {
    if (consent !== "granted") return;
    let cancelled = false;

    void (async () => {
      const buffer = await audioEngine.load(BED.id, BED.url);
      if (cancelled) return;

      // Edge case E6. The toggle reads this and stops claiming to be a sound
      // control it cannot honour.
      if (!buffer) {
        markStemUnavailable(BED.id);
        return;
      }

      if (!audioEngine.isPlaying(BED.id)) {
        audioEngine.play(BED.id, { loop: true, fadeSeconds: 1.2 });
        setPlaying(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [consent, setPlaying, markStemUnavailable]);

  /**
   * `reel_played_30s`, NFR-14.
   *
   * Thirty seconds of *audible* audio, not thirty seconds on the page. Someone
   * who granted consent and then muted has not listened to the reel, and
   * counting them would flatter the one number that says whether the sound is
   * worth having built.
   *
   * Fires once per page load. `audible` going false pauses the count rather
   * than restarting it, so muting halfway through and coming back still adds up.
   */
  useEffect(() => {
    if (!audible || reelMilestone.current) return;

    const id = window.setInterval(() => {
      audibleSeconds.current += 1;
      if (audibleSeconds.current >= 30) {
        reelMilestone.current = true;
        track("reel_played_30s");
        window.clearInterval(id);
      }
    }, 1000);

    return () => window.clearInterval(id);
  }, [audible]);

  /**
   * §8 and §10: M toggles the desk, Shift+M toggles sound — but only while one
   * of these controls has focus.
   *
   * It used to listen on the whole document. WCAG 2.1.4 asks that a shortcut
   * made of a single character be remappable, switchable off, or active only
   * while its component has focus, and a global listener is none of those. The
   * practical version of the same problem: a screen reader claims single letters
   * for its own navigation, so under NVDA pressing M moved to the next frame and
   * the page never saw the key. The shortcut worked for sighted keyboard users
   * and silently did nothing for everyone else — found by running NVDA, not by
   * any automated check.
   *
   * Scoped to focus it satisfies the third route, and it now behaves the way a
   * shortcut on a control should: reach the control, then the letter works.
   * Everyone else reaches the desk the same way they always could, by
   * activating this button.
   */
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== "m" || event.metaKey || event.ctrlKey) {
        return;
      }
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.isContentEditable ||
          ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
      ) {
        return;
      }
      // Active only on focus, per SC 2.1.4.
      if (!target || !bar.current?.contains(target)) return;
      event.preventDefault();
      if (event.shiftKey) toggleMute();
      else toggleDesk();
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [toggleDesk, toggleMute]);

  return (
    <>
      <MixingDesk returnFocusTo={deskToggle} />

      {/*
        Top right, and floating rather than occupying a reserved band. The
        cluster carries its own ground and blur because the sculpture drifts
        under it: over a lit face of the solid, unbacked marks at this size
        would fall below the 3:1 that SC 1.4.11 asks of a control.

        Square, not rounded. Every edge on this site is square.
      */}
      <div
        ref={bar}
        data-site-controls
        className="fixed top-0 right-0 z-[8500] flex items-center border-b border-l border-ink-15 bg-ground/80 backdrop-blur-md"
        style={{
          marginTop: "env(safe-area-inset-top)",
          marginRight: "env(safe-area-inset-right)",
        }}
      >
        <SoundToggle />

        <span className="block h-6 w-px bg-ink-15" aria-hidden="true" />

        <button
          ref={deskToggle}
          type="button"
          onClick={toggleDesk}
          aria-expanded={deskOpen}
          aria-label={ui.a11y.deskLabel}
          className="grid size-11 place-items-center transition-opacity duration-[var(--dur-quick)] hover:opacity-80"
        >
          {/*
            Three faders rather than a hamburger. The panel it opens is a mixing
            desk, so the mark is a miniature of the thing itself — and it is
            distinguishable from the sound toggle beside it at a glance, which
            two generic icons would not be.
          */}
          <span className="flex w-4 flex-col gap-[5px]" aria-hidden="true">
            {[0.7, 0.25, 0.5].map((position, index) => (
              <span key={index} className="relative block h-px w-full bg-ink-40">
                <span
                  className="absolute -top-[2px] block h-[5px] w-[3px] bg-ink"
                  style={{ left: `calc(${position * 100}% - ${position * 3}px)` }}
                />
              </span>
            ))}
          </span>
        </button>
      </div>
    </>
  );
}
