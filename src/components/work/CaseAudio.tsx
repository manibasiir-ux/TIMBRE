"use client";

import { useEffect, useState } from "react";

import { audioEngine } from "@/lib/audio/AudioEngine";
import { stemForCase } from "@/lib/audio/manifest";
import type { ContextPlayer, InventoryItem } from "@/content/cases";
import { useExperience } from "@/store/useExperience";

/**
 * The playable half of a case study, §6.3 and FR-12.
 *
 * Kept apart from the page so the narrative stays server-rendered: NFR-11 wants
 * every indexable word in the initial HTML, and none of this markup is
 * indexable. It is also the only part that needs the store.
 *
 * There is exactly one stem per case rather than one file per inventory row, so
 * selecting a row auditions the case's stem and the row's own metadata stands
 * as the written equivalent. When real per-asset audio exists, only the id
 * passed to play() changes.
 */

function seconds(value: number): string {
  if (value >= 60) {
    const m = Math.floor(value / 60);
    const s = Math.round(value % 60);
    return `${m}:${String(s).padStart(2, "0")}`;
  }
  return `${value.toFixed(1)}s`;
}

export function CaseAudio({
  slug,
  client,
  inventory,
  contexts,
}: {
  slug: string;
  client: string;
  inventory: readonly InventoryItem[];
  contexts: readonly ContextPlayer[];
}) {
  const setActiveCase = useExperience((state) => state.setActiveCase);
  const consent = useExperience((state) => state.consent);
  const markUnavailable = useExperience((state) => state.markStemUnavailable);
  const unavailable = useExperience((state) => state.unavailableStems);

  const [active, setActive] = useState<string | null>(null);
  const asset = stemForCase(slug);
  const missing = asset ? unavailable.includes(asset.id) : true;

  // Tells the sculpture and its accessible name which case is on screen, and
  // hands both back on the way out so the next route does not inherit them.
  useEffect(() => {
    setActiveCase(slug);
    return () => setActiveCase(null);
  }, [slug, setActiveCase]);

  useEffect(
    () => () => {
      if (asset) audioEngine.stop(asset.id, 0.3);
      audioEngine.releaseDuck();
    },
    [asset],
  );

  const audition = async (id: string) => {
    if (!asset || consent !== "granted") return;

    if (active === id) {
      audioEngine.stop(asset.id, 0.3);
      audioEngine.releaseDuck();
      setActive(null);
      return;
    }

    const buffer = await audioEngine.load(asset.id, asset.url);
    if (!buffer) {
      // Edge case E6: the page keeps working, the control says why it cannot.
      markUnavailable(asset.id);
      return;
    }

    // FR-12: the bed ducks 12dB while a contextual player is active.
    audioEngine.duck();
    audioEngine.play(asset.id, { bus: "sfx", fadeSeconds: 0.2 });
    setActive(id);
  };

  const disabled = consent !== "granted" || missing;
  const disabledReason = missing
    ? "Stem unavailable"
    : "Enable sound to audition";

  return (
    <>
      <section className="shell section-rhythm">
        <h2 className="font-display text-h2 text-ink">The system</h2>
        <p className="mt-4 max-w-[64ch] text-body text-ink-70">
          Every asset delivered, named as it ships. Loudness and format are the
          contract; the naming convention is what makes it maintainable.
        </p>

        <ul className="mt-12 border-t border-ink-15">
          {inventory.map((item) => {
            const isActive = active === item.name;
            return (
              <li key={item.name} className="border-b border-ink-15">
                <button
                  type="button"
                  onClick={() => void audition(item.name)}
                  disabled={disabled}
                  aria-pressed={isActive}
                  className={`flex min-h-11 w-full flex-wrap items-center gap-x-6 gap-y-1 px-4 py-4 text-left transition-colors duration-[var(--dur-quick)] ${
                    isActive
                      ? "border-l-2 border-l-signal bg-ground-lift"
                      : "border-l-2 border-l-transparent hover:bg-ground-lift"
                  } ${disabled ? "cursor-not-allowed" : ""}`}
                >
                  <span
                    aria-hidden="true"
                    className={`font-mono text-mono-xs ${isActive ? "text-signal" : "text-ink-70"}`}
                  >
                    {isActive ? "❚❚" : "▶"}
                  </span>
                  <span className="flex-1 font-mono text-mono-xs text-ink">
                    {item.name}
                  </span>
                  <span className="font-mono text-mono-xs text-ink-70 tabular-nums">
                    {seconds(item.seconds)}
                  </span>
                  <span className="font-mono text-mono-xs text-ink-70 tabular-nums">
                    {item.lufs} LUFS
                  </span>
                  <span className="font-mono text-mono-xs text-ink-70">
                    {item.format}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        {disabled && (
          <p className="mt-4 font-mono text-mono-xs text-ink-70">
            {disabledReason}. The inventory above is the full delivered list
            either way.
          </p>
        )}
      </section>

      <section className="shell section-rhythm">
        <h2 className="font-display text-h2 text-ink">In context</h2>
        <p className="mt-4 max-w-[64ch] text-body text-ink-70">
          The same system in the three places it has to work. A tone that reads
          in a studio and disappears in a cabin has not been delivered.
        </p>

        <ul className="mt-12 grid grid-cols-4 gap-4 lg:grid-cols-12">
          {contexts.map((context) => {
            const isActive = active === context.id;
            return (
              <li key={context.id} className="col-span-4">
                <button
                  type="button"
                  onClick={() => void audition(context.id)}
                  disabled={disabled}
                  aria-pressed={isActive}
                  className={`flex h-full min-h-44 w-full flex-col justify-between border p-6 text-left transition-colors duration-[var(--dur-base)] ${
                    isActive
                      ? "border-signal bg-ground-lift"
                      : "border-ink-15 hover:border-ink-40"
                  } ${disabled ? "cursor-not-allowed" : ""}`}
                >
                  <span
                    aria-hidden="true"
                    className={`font-mono text-mono ${isActive ? "text-signal" : "text-ink-70"}`}
                  >
                    {isActive ? "◉" : "◎"}
                  </span>
                  <span>
                    <span className="block font-body text-h3 text-ink">
                      {context.label}
                    </span>
                    <span className="mt-2 block text-small text-ink-70">
                      {context.description}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        {/* §10 and FR-23: every audio moment carries a written equivalent that
            stands on its own. This is the sound-off path, not a fallback. */}
        <details className="mt-8 border-t border-ink-15 pt-6">
          <summary className="min-h-11 cursor-pointer font-mono text-mono-xs text-ink-70">
            Read a description of these recordings
          </summary>
          <ul className="mt-4 space-y-3">
            {contexts.map((context) => (
              <li key={context.id} className="max-w-[64ch] text-body text-ink-70">
                <span className="text-ink">{context.label}.</span>{" "}
                {context.description} Recorded for {client}.
              </li>
            ))}
          </ul>
        </details>
      </section>
    </>
  );
}
