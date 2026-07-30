"use client";

import { useEffect, useRef } from "react";

import { useExperience } from "@/store/useExperience";

/**
 * The audio consent gate, FR-01 and specification §6.1.
 *
 * No audio plays before an explicit gesture, and the two paths are genuinely
 * equal: §10 requires that declining is a real choice rather than a nudge, so
 * "Stay silent" is a full-size control beside the signal-filled one, not a
 * dismissive link. The choice persists for 180 days and is reversible from the
 * transport bar in one interaction.
 *
 * The specification has the preloader transform into this gate as its progress
 * bar completes. The progress half needs asset orchestration that does not
 * exist yet, so this is the gate alone; the transformation arrives with the
 * motion system.
 */
export function ConsentGate() {
  const consent = useExperience((state) => state.consent);
  const hydrateConsent = useExperience((state) => state.hydrateConsent);
  const grantConsent = useExperience((state) => state.grantConsent);
  const declineConsent = useExperience((state) => state.declineConsent);

  const dialog = useRef<HTMLDivElement>(null);
  const playButton = useRef<HTMLButtonElement>(null);

  // Storage is read after mount, never during render: doing it during render
  // would make the server and client markup disagree.
  useEffect(() => {
    hydrateConsent();
  }, [hydrateConsent]);

  useEffect(() => {
    if (consent !== "pending") return;

    playButton.current?.focus();

    // While the gate is open it is the only thing on the page, so focus is
    // trapped rather than allowed to wander into content behind it. There is
    // deliberately no Escape handler: dismissing without choosing would leave
    // the visitor in an undefined audio state.
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;

      const focusable = dialog.current?.querySelectorAll<HTMLElement>("button");
      if (!focusable || focusable.length === 0) return;

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
  }, [consent]);

  if (consent !== "pending") return null;

  return (
    <div
      ref={dialog}
      role="dialog"
      aria-modal="true"
      aria-labelledby="consent-title"
      aria-describedby="consent-note"
      className="fixed inset-0 z-[9000] flex flex-col items-center justify-center gap-12 bg-ground px-6"
    >
      <p
        id="consent-title"
        className="font-display text-display text-ink"
      >
        TIMBRE
      </p>

      <div className="flex flex-col items-stretch gap-3">
        <button
          ref={playButton}
          type="button"
          onClick={() => void grantConsent()}
          className="min-h-11 bg-signal px-8 py-4 font-mono text-mono text-ground transition-opacity duration-[var(--dur-quick)] hover:opacity-90"
        >
          ▶ Play the room
        </button>

        <button
          type="button"
          onClick={declineConsent}
          className="min-h-11 border border-ink-15 px-8 py-4 font-mono text-mono text-ink transition-colors duration-[var(--dur-quick)] hover:border-ink-40"
        >
          Stay silent
        </button>
      </div>

      <p
        id="consent-note"
        className="max-w-[42ch] text-center text-small text-ink-70"
      >
        Everything works without sound. You can change this at any time from the
        transport bar.
      </p>
    </div>
  );
}
