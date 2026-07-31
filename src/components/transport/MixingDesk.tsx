"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { SECTIONS, channelNumber, faderValueText } from "@/lib/sections";
import { scrollToProgress } from "@/lib/useScrollProgress";
import { useExperience } from "@/store/useExperience";

/**
 * The mixing desk overlay, specification §8 and FR-08/FR-09.
 *
 * The roadmap records three attempts. Vertical strips fought the vertically
 * scrolling page. A full-screen console trapped keyboard users in a mode they
 * had not noticed entering — "I got in. I could not get out." What shipped is
 * horizontal strips in a bottom sheet with the transport bar still visible
 * above them as the persistent anchor, so the desk always reads as a panel over
 * the page rather than a mode replacing it.
 *
 * Each fader is a real slider: role, min, max, now, and crucially aria-valuetext,
 * because a bare "40" told VoiceOver nothing about what was at forty or of what.
 */

const FADER_STEP = 0.05;
const DETENTS = [0, 0.25, 0.5, 0.75, 1];

function snapToDetent(value: number): number {
  return DETENTS.reduce((best, detent) =>
    Math.abs(detent - value) < Math.abs(best - value) ? detent : best,
  );
}

export function MixingDesk({
  returnFocusTo,
}: {
  returnFocusTo: React.RefObject<HTMLButtonElement | null>;
}) {
  const deskOpen = useExperience((state) => state.deskOpen);
  const setDeskOpen = useExperience((state) => state.setDeskOpen);
  const scrollProgress = useExperience((state) => state.scrollProgress);

  const panel = useRef<HTMLDivElement>(null);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [dragging, setDragging] = useState<string | null>(null);

  const close = useCallback(() => {
    setDeskOpen(false);
    returnFocusTo.current?.focus();
  }, [setDeskOpen, returnFocusTo]);

  useEffect(() => {
    if (!deskOpen) return;

    const strips = () =>
      Array.from(
        panel.current?.querySelectorAll<HTMLElement>('[role="slider"]') ?? [],
      );

    strips()[0]?.focus();

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
    const strips = panel.current?.querySelectorAll<HTMLElement>(
      '[role="slider"]',
    );
    strips?.[next]?.focus();
  };

  const commit = (value: number) => {
    scrollToProgress(snapToDetent(value));
  };

  const onFaderKeyDown = (
    event: React.KeyboardEvent,
    index: number,
    available: boolean,
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
        if (!available) return;
        event.preventDefault();
        scrollToProgress(scrollProgress - FADER_STEP);
        break;
      case "ArrowRight":
        if (!available) return;
        event.preventDefault();
        scrollToProgress(scrollProgress + FADER_STEP);
        break;
      case "Home":
        if (!available) return;
        event.preventDefault();
        scrollToProgress(0);
        break;
      case "End":
        if (!available) return;
        event.preventDefault();
        scrollToProgress(1);
        break;
      case "Enter":
        if (!available) return;
        event.preventDefault();
        commit(scrollProgress);
        break;
      default:
    }
  };

  const onFaderPointerDown = (
    event: React.PointerEvent<HTMLDivElement>,
    id: string,
    available: boolean,
  ) => {
    if (!available) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(id);
    scrubFromPointer(event);
  };

  const scrubFromPointer = (event: React.PointerEvent<HTMLDivElement>) => {
    const rail = event.currentTarget.getBoundingClientRect();
    if (rail.width === 0) return;
    scrollToProgress((event.clientX - rail.left) / rail.width);
  };

  if (!deskOpen) return null;

  return (
    <div
      ref={panel}
      role="dialog"
      aria-modal="true"
      aria-label="Mixing desk navigation"
      className="fixed inset-x-0 bottom-[calc(64px+env(safe-area-inset-bottom))] z-[8000] max-h-[min(70vh,620px)] overflow-y-auto border-t border-ink-15 bg-ground-lift/95 backdrop-blur-md"
    >
      <ul className="divide-y divide-ink-15">
        {SECTIONS.map((section, index) => {
          const progress = section.available ? scrollProgress : 0;

          return (
            <li key={section.id} className="shell flex items-center gap-6 py-4">
              <span className="w-8 shrink-0 font-mono text-mono-xs text-ink-40">
                {channelNumber(index)}
              </span>

              <span
                className={`w-40 shrink-0 font-body text-h3 ${
                  section.available ? "text-ink" : "text-ink-40"
                }`}
              >
                {section.label}
              </span>

              {/* Six-segment position readout, §8. */}
              <span className="hidden shrink-0 gap-1 md:flex" aria-hidden="true">
                {Array.from({ length: 6 }, (_, segment) => (
                  <span
                    key={segment}
                    className={`block h-3 w-1 ${
                      progress * 6 > segment ? "bg-signal" : "bg-ink-15"
                    }`}
                  />
                ))}
              </span>

              <div
                role="slider"
                tabIndex={index === focusedIndex ? 0 : -1}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(progress * 100)}
                aria-valuetext={faderValueText(section.label, progress)}
                aria-label={`${section.label} position`}
                aria-disabled={!section.available}
                onKeyDown={(event) =>
                  onFaderKeyDown(event, index, section.available)
                }
                onPointerDown={(event) =>
                  onFaderPointerDown(event, section.id, section.available)
                }
                onPointerMove={(event) =>
                  dragging === section.id ? scrubFromPointer(event) : undefined
                }
                onPointerUp={() => {
                  setDragging(null);
                  commit(scrollProgress);
                }}
                onFocus={() => setFocusedIndex(index)}
                className={`relative flex h-11 flex-1 items-center ${
                  section.available ? "cursor-pointer" : "cursor-not-allowed"
                }`}
              >
                <span className="block h-1 w-full bg-ink-15" />
                <span
                  className={`absolute top-1/2 h-6 w-12 -translate-y-1/2 border border-ink-15 ${
                    dragging === section.id ? "bg-signal" : "bg-ground-lift"
                  }`}
                  style={{ left: `calc(${progress * 100}% - ${progress * 48}px)` }}
                />
              </div>

              {section.available ? (
                // Next's Link, not a bare anchor. A plain href triggers a full
                // document load, which tears down and rebuilds the WebGL
                // context — FR-05 requires the canvas to survive every
                // client-side route change, and the desk is the primary way
                // people move between routes.
                <Link
                  href={section.href}
                  onClick={close}
                  className="shrink-0 font-mono text-mono-xs text-signal underline-offset-4 hover:underline"
                >
                  Go
                </Link>
              ) : (
                <span className="shrink-0 font-mono text-mono-xs text-ink-40">
                  Soon
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
