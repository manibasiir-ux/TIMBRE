"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { track } from "@/lib/analytics";
import {
  MIX_CHANNELS,
  engageMixer,
  mixLevel,
  setMixLevel,
} from "@/lib/audio/mixer";
import { focusAfterCommit } from "@/lib/focusAfterCommit";
import { SECTIONS, faderValueText } from "@/lib/sections";
import { useExperience } from "@/store/useExperience";

/**
 * The mixing desk overlay, specification §8 and FR-08/FR-09.
 *
 * The roadmap records three attempts. Vertical strips fought the vertically
 * scrolling page. A full-screen console trapped keyboard users in a mode they
 * had not noticed entering — "I got in. I could not get out." What shipped is
 * horizontal strips in a bottom sheet that covers at most 70% of the viewport,
 * so the page is always visible behind it and the desk reads as a panel over
 * the page rather than a mode replacing it.
 *
 * It sat above the transport bar until that bar was removed; it now sits on the
 * bottom edge. The trigger moved to the top corner with the other controls, so
 * the sheet no longer rises from beneath its own button — acceptable because
 * the panel is what takes focus, and a menu opening from the bottom edge is the
 * more familiar shape on the phones most of this traffic arrives on.
 *
 * Each fader is a real slider: role, min, max, now, and crucially aria-valuetext,
 * because a bare "40" told VoiceOver nothing about what was at forty or of what.
 *
 * ## The faders mix audio, not scroll position
 *
 * They used to set scroll progress, which meant a fader only did anything on
 * the page you were already on — six of the seven were inert, and the seventh
 * duplicated the scrollbar. A console that mixed nothing.
 *
 * They now ride real gain nodes: the room, and the four client stems the work
 * rail auditions. You can hold two identities against each other, or against
 * the room, from anywhere on the site. The analyser sits after the master gain,
 * so the sculpture reshapes itself against whatever mix you make — no wiring
 * between the two, that path already existed and had nothing interesting to
 * say to it.
 *
 * Navigation did not go away; it moved to the row beneath. That row is also the
 * whole desk for anyone who declined sound, where faders are meaningless.
 */

const FADER_STEP = 0.05;
export function MixingDesk({
  returnFocusTo,
}: {
  returnFocusTo: React.RefObject<HTMLButtonElement | null>;
}) {
  const deskOpen = useExperience((state) => state.deskOpen);
  const setDeskOpen = useExperience((state) => state.setDeskOpen);
  const consent = useExperience((state) => state.consent);
  const muted = useExperience((state) => state.muted);

  const panel = useRef<HTMLDivElement>(null);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [dragging, setDragging] = useState<string | null>(null);

  const close = useCallback(() => {
    setDeskOpen(false);
    focusAfterCommit(() => returnFocusTo.current);
  }, [setDeskOpen, returnFocusTo]);

  useEffect(() => {
    if (!deskOpen) return;

    const strips = () =>
      Array.from(
        panel.current?.querySelectorAll<HTMLElement>('[role="slider"]') ?? [],
      );

    // Deferred to after the commit, like every other focus move in this file.
    // Calling focus() synchronously here worked in Chromium and raced the DOM
    // in WebKit, where the panel is not always focusable by the time the effect
    // runs — so opening the desk sometimes left focus nowhere and the first
    // arrow key went to the page instead of the channel strips. It presented as
    // a flaky test for a long time before being read as what it was: the same
    // focus-versus-commit race focusAfterCommit was extracted to fix.
    focusAfterCommit(() => strips()[0]);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
        return;
      }

      if (event.key !== "Tab") return;

      // Focus stays inside while the sheet is open, and leaves the moment it
      // closes. The failure mode being avoided is a keyboard user tabbing into
      // page content they cannot see behind the overlay.
      const focusable = Array.from(
        panel.current?.querySelectorAll<HTMLElement>(
          '[role="slider"], a[href], button:not([disabled])',
        ) ?? [],
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [deskOpen, close]);

  const moveFocus = (from: number, delta: number) => {
    const next = Math.min(SECTIONS.length - 1, Math.max(0, from + delta));
    setFocusedIndex(next);
    // Roving tabindex leaves the target at tabindex="-1" until this render
    // lands, so the focus has to wait for the commit.
    focusAfterCommit(
      () =>
        panel.current?.querySelectorAll<HTMLElement>('[role="slider"]')?.[next],
    );
  };

  /**
   * Levels are mirrored into React state purely so the strips re-render. The
   * mixer module is the source of truth, because a mix has to survive the desk
   * being closed — component state would discard it on unmount, which is the
   * one behaviour that would make this feel like a toy rather than a control.
   */
  const [levels, setLevels] = useState<Record<string, number>>(() =>
    Object.fromEntries(MIX_CHANNELS.map((c) => [c.id, mixLevel(c.id)])),
  );

  const audible = consent === "granted" && !muted;

  // Loading is deferred to the first open: five files, about 2.9 MB, that most
  // visitors will never touch a fader on.
  useEffect(() => {
    if (!deskOpen || !audible) return;
    let cancelled = false;
    void engageMixer().then((ready) => {
      if (cancelled || !ready) return;
      setLevels(
        Object.fromEntries(MIX_CHANNELS.map((c) => [c.id, mixLevel(c.id)])),
      );
    });
    return () => {
      cancelled = true;
    };
  }, [deskOpen, audible]);

  const applyLevel = (id: string, value: number) => {
    const clamped = Math.max(0, Math.min(1, value));
    setMixLevel(id, clamped);
    setLevels((current) => ({ ...current, [id]: clamped }));
  };

  const onFaderKeyDown = (
    event: React.KeyboardEvent,
    index: number,
    id: string,
  ) => {
    switch (event.key) {
      case "ArrowUp":
        event.preventDefault();
        moveFocus(index, -1);
        break;
      case "ArrowDown":
        event.preventDefault();
        moveFocus(index, 1);
        break;
      case "ArrowLeft":
        if (!audible) return;
        event.preventDefault();
        applyLevel(id, (levels[id] ?? 0) - FADER_STEP);
        break;
      case "ArrowRight":
        if (!audible) return;
        event.preventDefault();
        applyLevel(id, (levels[id] ?? 0) + FADER_STEP);
        break;
      case "Home":
        if (!audible) return;
        event.preventDefault();
        applyLevel(id, 0);
        break;
      case "End":
        if (!audible) return;
        event.preventDefault();
        applyLevel(id, 1);
        break;
      default:
    }
  };

  const scrubFromPointer = (
    event: React.PointerEvent<HTMLDivElement>,
    id: string,
  ) => {
    const rail = event.currentTarget.getBoundingClientRect();
    if (rail.width === 0) return;
    applyLevel(id, (event.clientX - rail.left) / rail.width);
  };

  const onFaderPointerDown = (
    event: React.PointerEvent<HTMLDivElement>,
    id: string,
  ) => {
    if (!audible) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(id);
    scrubFromPointer(event, id);
    // NFR-14 measures this because a fader nobody moves is a metaphor that has
    // not landed.
    track("fader_dragged");
  };

  if (!deskOpen) return null;

  return (
    <div
      ref={panel}
      role="dialog"
      aria-modal="true"
      aria-label="Mixing desk navigation"
      className="fixed inset-x-0 bottom-0 z-[8000] max-h-[min(70vh,620px)] overflow-y-auto border-t border-ink-15 bg-ground-lift/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md"
    >
      <p className="shell pt-5 pb-2 font-mono text-mono-xs text-ink-70">
        {audible
          ? "The room, and four client systems. Bring them up against each other."
          : "Turn sound on to mix. The sections below work either way."}
      </p>

      <ul className="divide-y divide-ink-15">
        {MIX_CHANNELS.map((channel, index) => {
          const level = levels[channel.id] ?? 0;

          return (
            <li key={channel.id} className="shell flex items-center gap-6 py-4">
              <span className="w-8 shrink-0 font-mono text-mono-xs text-ink-70">
                {channel.number}
              </span>

              <span
                className={`w-32 shrink-0 font-body text-h3 ${
                  audible ? "text-ink" : "text-ink-70"
                }`}
              >
                {channel.label}
              </span>

              {/* Six-segment level readout, §8. It shows the fader's own value
                  rather than an analyser reading: a meter that moves when you
                  move the fader is legible, and one that jitters with the
                  music is decoration. */}
              <span className="hidden shrink-0 gap-1 md:flex" aria-hidden="true">
                {Array.from({ length: 6 }, (_, segment) => (
                  <span
                    key={segment}
                    className={`block h-3 w-1 ${
                      level * 6 > segment ? "bg-signal" : "bg-ink-15"
                    }`}
                  />
                ))}
              </span>

              <div
                role="slider"
                tabIndex={index === focusedIndex ? 0 : -1}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(level * 100)}
                aria-valuetext={faderValueText(channel.label, level)}
                aria-label={`${channel.label} level`}
                aria-disabled={!audible}
                onKeyDown={(event) => onFaderKeyDown(event, index, channel.id)}
                onPointerDown={(event) => onFaderPointerDown(event, channel.id)}
                onPointerMove={(event) =>
                  dragging === channel.id
                    ? scrubFromPointer(event, channel.id)
                    : undefined
                }
                onPointerUp={() => setDragging(null)}
                onFocus={() => setFocusedIndex(index)}
                className={`relative flex h-11 flex-1 items-center ${
                  audible ? "cursor-pointer" : "cursor-not-allowed"
                }`}
              >
                <span className="block h-1 w-full bg-ink-15" />
                <span
                  className={`absolute top-1/2 h-6 w-12 -translate-y-1/2 border border-ink-15 ${
                    dragging === channel.id ? "bg-signal" : "bg-ground-lift"
                  }`}
                  style={{ left: `calc(${level * 100}% - ${level * 48}px)` }}
                />
              </div>

              <span className="w-10 shrink-0 text-right font-mono text-mono-xs text-ink-70 tabular-nums">
                {Math.round(level * 100)}
              </span>
            </li>
          );
        })}
      </ul>

      {/* Navigation, and the whole desk for anyone who declined sound.
          Next's Link rather than a bare anchor: a plain href is a full document
          load, which tears down and rebuilds the WebGL context that FR-05
          requires to survive every client-side route change. */}
      <nav aria-label="Sections" className="shell border-t border-ink-15 py-5">
        <ul className="flex flex-wrap gap-x-6 gap-y-3">
          {SECTIONS.map((section) => (
            <li key={section.id}>
              {section.available ? (
                <Link
                  href={section.href}
                  onClick={close}
                  className="inline-flex min-h-11 items-center font-mono text-mono-xs text-ink-70 underline-offset-4 transition-colors duration-[var(--dur-quick)] hover:text-signal focus-visible:text-signal"
                >
                  {section.label}
                </Link>
              ) : (
                <span className="inline-flex min-h-11 items-center font-mono text-mono-xs text-ink-70">
                  {section.label}
                </span>
              )}
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
