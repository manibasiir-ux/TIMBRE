"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { track } from "@/lib/analytics";
import { audioEngine } from "@/lib/audio/AudioEngine";
import { BED } from "@/lib/audio/manifest";
import { scrollToProgress, useScrollProgress } from "@/lib/useScrollProgress";
import { selectAudible, useExperience } from "@/store/useExperience";

import { Meter } from "./Meter";
import { MixingDesk } from "./MixingDesk";

/**
 * The master transport, specification §8 and FR-06/FR-07.
 *
 * Persistent on every route at every breakpoint, occupying the 64px band the
 * layout has reserved since Phase 1 so nothing reflows when it appears.
 *
 * The scrub track shows **document scroll progress, not audio position**. That
 * was offered half-jokingly at 11pm and it solved the "where am I" problem the
 * first two navigation attempts could not: one strip answers both "how far
 * through the page" and "what is playing", so the desk never has to.
 */

function timecode(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const whole = Math.floor(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

export function TransportBar() {
  useScrollProgress();

  const consent = useExperience((state) => state.consent);
  const isPlaying = useExperience((state) => state.isPlaying);
  const muted = useExperience((state) => state.muted);
  const toggleMute = useExperience((state) => state.toggleMute);
  const setPlaying = useExperience((state) => state.setPlaying);
  const deskOpen = useExperience((state) => state.deskOpen);
  const toggleDesk = useExperience((state) => state.toggleDesk);
  const scrollProgress = useExperience((state) => state.scrollProgress);
  const audible = useExperience(selectAudible);

  const deskToggle = useRef<HTMLButtonElement>(null);
  const audibleSeconds = useRef(0);
  const reelMilestone = useRef(false);
  const [elapsed, setElapsed] = useState(0);
  const [duration, setDuration] = useState(0);
  const [bedFailed, setBedFailed] = useState(false);

  // The bed loads only once consent is granted. Fetching it earlier would pull
  // a megabyte for a visitor who may never ask for sound.
  useEffect(() => {
    if (consent !== "granted") return;
    let cancelled = false;

    void (async () => {
      const buffer = await audioEngine.load(BED.id, BED.url);
      if (cancelled) return;
      if (!buffer) {
        setBedFailed(true);
        return;
      }
      setDuration(buffer.duration);
      if (!audioEngine.isPlaying(BED.id)) {
        audioEngine.play(BED.id, { loop: true, fadeSeconds: 1.2 });
        setPlaying(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [consent, setPlaying]);

  // Elapsed is sampled on a timer rather than per frame: it changes once a
  // second and the meters already own the animation frame.
  useEffect(() => {
    if (!isPlaying || duration === 0) return;
    const id = window.setInterval(() => {
      setElapsed(audioEngine.currentTime % duration);
    }, 250);
    return () => window.clearInterval(id);
  }, [isPlaying, duration]);

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

  const togglePlayback = useCallback(() => {
    if (consent !== "granted") return;
    if (audioEngine.isPlaying(BED.id)) {
      audioEngine.stop(BED.id, 0.2);
      setPlaying(false);
    } else {
      audioEngine.play(BED.id, { loop: true, fadeSeconds: 0.4 });
      setPlaying(true);
    }
  }, [consent, setPlaying]);

  // §8 and §10: M toggles the desk, Shift+M mutes globally.
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
      event.preventDefault();
      if (event.shiftKey) toggleMute();
      else toggleDesk();
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [toggleDesk, toggleMute]);

  const stemLabel = bedFailed
    ? "Stem unavailable"
    : consent === "granted"
      ? BED.label
      : "Silent";

  return (
    <>
      <MixingDesk returnFocusTo={deskToggle} />

      <div
        data-transport
        className="fixed inset-x-0 bottom-0 z-[8500] h-16 border-t border-ink-15 bg-ground-lift/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md"
      >
        <div className="shell flex h-16 items-center gap-4">
          <button
            type="button"
            onClick={togglePlayback}
            disabled={consent !== "granted"}
            aria-label={isPlaying ? "Pause the reel" : "Play the reel"}
            className="grid size-11 shrink-0 place-items-center font-mono text-mono text-ink disabled:text-ink-40"
          >
            {isPlaying ? "❚❚" : "▶"}
          </button>

          <Meter active={audible} />

          <span className="hidden w-40 shrink-0 truncate font-mono text-mono-xs text-ink-70 sm:block">
            {stemLabel}
          </span>

          <span className="shrink-0 font-mono text-mono-xs text-ink-70 tabular-nums">
            {timecode(elapsed)} / {timecode(duration)}
          </span>

          {/* The scrub track is the scroll-progress indicator, §8. */}
          <div
            role="slider"
            tabIndex={0}
            aria-label="Scroll progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(scrollProgress * 100)}
            aria-valuetext={`${Math.round(scrollProgress * 100)} percent through the page`}
            onKeyDown={(event) => {
              if (event.key === "ArrowLeft") {
                event.preventDefault();
                scrollToProgress(scrollProgress - 0.05);
              } else if (event.key === "ArrowRight") {
                event.preventDefault();
                scrollToProgress(scrollProgress + 0.05);
              } else if (event.key === "Home") {
                event.preventDefault();
                scrollToProgress(0);
              } else if (event.key === "End") {
                event.preventDefault();
                scrollToProgress(1);
              }
            }}
            onPointerDown={(event) => {
              const rail = event.currentTarget.getBoundingClientRect();
              if (rail.width > 0) {
                scrollToProgress((event.clientX - rail.left) / rail.width);
              }
            }}
            className="flex h-11 flex-1 cursor-pointer items-center"
          >
            <span className="relative block h-px w-full bg-ink-15">
              <span
                className="absolute inset-y-0 left-0 block bg-signal"
                style={{ width: `${scrollProgress * 100}%` }}
              />
            </span>
          </div>

          <button
            type="button"
            onClick={toggleMute}
            disabled={consent !== "granted"}
            aria-pressed={muted}
            aria-label={muted ? "Unmute" : "Mute"}
            className="grid size-11 shrink-0 place-items-center font-mono text-mono-xs text-ink disabled:text-ink-40"
          >
            {muted ? "MUTE" : "ON"}
          </button>

          <button
            ref={deskToggle}
            type="button"
            onClick={toggleDesk}
            aria-expanded={deskOpen}
            aria-label="Mixing desk navigation"
            className="grid h-11 shrink-0 place-items-center px-2 font-mono text-mono-xs text-ink"
          >
            ≡ Desk
          </button>
        </div>
      </div>
    </>
  );
}
