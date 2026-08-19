"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { WaveformRule } from "@/components/primitives/WaveformRule";
import { audioEngine } from "@/lib/audio/AudioEngine";
import { createDuckHandle } from "@/lib/audio/duckHandle";
import { previewVoice } from "@/lib/audio/voices";
import {
  CASES,
  type Sector,
  casesInSector,
  populatedSectors,
  stemFor,
} from "@/content/cases";
import { useExperience } from "@/store/useExperience";

/**
 * The work index, specification §6.2 and FR-14.
 *
 * Filtering is client-side and never changes route: the URL is updated through
 * history.replaceState so a filtered view is shareable without the grid
 * remounting or the canvas being torn down.
 *
 * The column spans are a fixed irregular cycle rather than a uniform grid. §6.2
 * asks that no two rows share a layout, which a repeating 3-column grid cannot
 * do; the cycle length is deliberately coprime with the row length so the
 * pattern does not resolve.
 */

const SPAN_CYCLE = [7, 5, 4, 6, 5, 7, 6, 4];
const PREVIEW_SECONDS = 4;
/** §6.2: previews duck well below the bed so they read as an audition. */
const PREVIEW_GAIN = 0.35;

function initialSector(raw: string | null): Sector | "All" {
  return raw && (populatedSectors() as string[]).includes(raw)
    ? (raw as Sector)
    : "All";
}

export function WorkIndex() {
  // Read once as the initial value rather than synced from an effect. Pulling
  // it in afterwards renders the unfiltered grid first and the filtered one a
  // frame later, which is both a wasted render and a visible flash.
  const searchParams = useSearchParams();
  const [sector, setSector] = useState<Sector | "All">(() =>
    initialSector(searchParams.get("sector")),
  );

  const [previewing, setPreviewing] = useState<string | null>(null);
  const previewTimer = useRef<number | null>(null);
  const duck = useRef(createDuckHandle());
  /**
   * What the pointer is on, and what is actually sounding.
   *
   * `wanted` is written before the buffer is awaited and cleared when the
   * pointer leaves, so a load that resolves after the visitor has moved on can
   * tell that nobody is waiting for it any more. `voice` is what to silence,
   * which unmount needs and cannot work out from a slug it no longer has.
   */
  const preview = useRef<{ wanted: string | null; voice: string | null }>({
    wanted: null,
    voice: null,
  });

  const consent = useExperience((state) => state.consent);
  const muted = useExperience((state) => state.muted);
  const canPreview = consent === "granted" && !muted;

  const visible = casesInSector(sector);

  const applySector = (next: Sector | "All") => {
    setSector(next);
    const url = new URL(window.location.href);
    if (next === "All") url.searchParams.delete("sector");
    else url.searchParams.set("sector", next);
    window.history.replaceState(null, "", url);
  };

  const stopPreview = useCallback((slug: string) => {
    if (previewTimer.current) {
      window.clearTimeout(previewTimer.current);
      previewTimer.current = null;
    }
    preview.current.wanted = null;
    const entry = CASES.find((item) => item.slug === slug);
    const asset = entry ? stemFor(entry) : null;
    if (asset) audioEngine.stop(previewVoice(asset.id), 0.3);
    preview.current.voice = null;
    // The duck is released here as well as on the timer. Leaving a card before
    // the preview ran out used to clear the timeout and skip the release, so
    // every early pointer-leave leaked one — and the bed those ducks hold down
    // is the desk's own bus.
    duck.current.release();
    setPreviewing((current) => (current === slug ? null : current));
  }, []);

  const startPreview = useCallback(
    async (slug: string) => {
      if (!canPreview) return;
      const entry = CASES.find((item) => item.slug === slug);
      const asset = entry ? stemFor(entry) : null;
      if (!asset) return;

      preview.current.wanted = slug;
      const buffer = await audioEngine.load(asset.id, asset.url);
      if (!buffer) return;

      // The first load of a stem is long enough for the pointer to leave the
      // card, and starting anyway would sound a preview over a card nobody is
      // on — with a duck held for it that only the timer would release.
      if (preview.current.wanted !== slug || !canPreview) return;

      duck.current.take();
      // Under a scoped name: the desk holds this same buffer as a channel, and
      // playing it under the bare id would evict the channel and leave its
      // fader driving a voice that no longer exists. See voices.ts.
      audioEngine.play(asset.id, {
        as: previewVoice(asset.id),
        bus: "sfx",
        fadeSeconds: 0.25,
        gain: PREVIEW_GAIN,
      });
      preview.current.voice = previewVoice(asset.id);
      setPreviewing(slug);

      previewTimer.current = window.setTimeout(() => {
        previewTimer.current = null;
        audioEngine.stop(previewVoice(asset.id), 0.4);
        preview.current.voice = null;
        duck.current.release();
        setPreviewing(null);
      }, PREVIEW_SECONDS * 1000);
    },
    [canPreview],
  );

  // A pointer can leave the page without ever firing pointerleave, and the
  // component can unmount mid-preview. Either would leave a stem looping under
  // a page nobody is looking at.
  useEffect(
    () => () => {
      if (previewTimer.current) window.clearTimeout(previewTimer.current);
      // The comment above promised this and did not do it: clearing the timer
      // cancelled the stop as well as the release, so a route change mid-hover
      // carried the preview onto the next page.
      if (preview.current.voice) audioEngine.stop(preview.current.voice, 0.3);
      duck.current.release();
    },
    [],
  );

  return (
    <>
      <section className="shell pt-[14vh] pb-12">
        <h1 className="font-display text-h1 text-ink">Work</h1>

        <div className="mt-12 flex flex-wrap items-center gap-2">
          {(["All", ...populatedSectors()] as const).map((option) => {
            const active = sector === option;
            return (
              <button
                key={option}
                type="button"
                onClick={() => applySector(option)}
                aria-pressed={active}
                className={`min-h-11 border px-4 py-2 font-mono text-mono-xs transition-colors duration-[var(--dur-quick)] ${
                  active
                    ? "border-signal bg-signal text-ground"
                    : "border-ink-15 text-ink-70 hover:border-ink-40"
                }`}
              >
                {option}
              </button>
            );
          })}

          <p
            className="ml-auto font-mono text-mono-xs text-ink-70"
            aria-live="polite"
          >
            {visible.length} {visible.length === 1 ? "project" : "projects"}
          </p>
        </div>
      </section>

      <WaveformRule seed={3} />

      <section className="shell section-rhythm">
        <ul className="grid grid-cols-4 gap-x-4 gap-y-16 lg:grid-cols-12">
          {visible.map((entry, index) => {
            const span = SPAN_CYCLE[index % SPAN_CYCLE.length];
            const isPreviewing = previewing === entry.slug;

            return (
              <li
                key={entry.slug}
                className="col-span-4"
                style={{ gridColumn: `span ${span} / span ${span}` }}
              >
                <Link
                  href={`/work/${entry.slug}`}
                  className="group block focus-visible:outline-2"
                  onPointerEnter={() => void startPreview(entry.slug)}
                  onPointerLeave={() => stopPreview(entry.slug)}
                  onFocus={() => void startPreview(entry.slug)}
                  onBlur={() => stopPreview(entry.slug)}
                >
                  <div className="relative overflow-hidden border border-ink-15 bg-ground-lift p-6 transition-transform duration-[var(--dur-base)] group-hover:-translate-y-2">
                    <div className="flex items-start justify-between gap-4">
                      <p className="font-mono text-mono-xs text-ink-70">
                        {entry.sector} · {entry.tier} · {entry.year}
                      </p>
                      {isPreviewing && (
                        <p className="shrink-0 font-mono text-mono-xs text-signal">
                          Previewing
                        </p>
                      )}
                    </div>

                    <p className="mt-6 font-display text-h2 text-ink">
                      {entry.client}
                    </p>

                    <WaveformRule
                      seed={index + 2}
                      className={`mt-8 transition-colors duration-[var(--dur-base)] ${
                        isPreviewing ? "text-signal" : "text-ink-70"
                      }`}
                    />

                    <p className="mt-6 max-w-[48ch] text-body text-ink-70">
                      {entry.summary}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>

        {visible.length === 0 && (
          <p className="text-lead text-ink-70">
            No work published in that sector yet.
          </p>
        )}
      </section>
    </>
  );
}
