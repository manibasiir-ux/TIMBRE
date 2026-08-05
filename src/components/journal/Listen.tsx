import { WaveformRule } from "@/components/primitives/WaveformRule";

/**
 * The `<Listen>` embed, specification §6.7.
 *
 * A full-width dark panel with a waveform, a timecode and a transcript. It is
 * deliberately not a player: FR-01 forbids audio without an explicit gesture,
 * and a post can be read from a search result before the consent gate has ever
 * been answered. The real per-asset audio does not exist yet either.
 *
 * The transcript is not a fallback. FR-23 requires every audio moment to carry
 * a written equivalent, and here it is the primary content — the panel works
 * completely with no sound at all, which is the same standard the rest of the
 * site holds itself to.
 */
export function Listen({
  label,
  seconds,
  lufs,
  transcript,
}: {
  label: string;
  seconds: number;
  lufs: number;
  transcript: string;
}) {
  const timecode =
    seconds >= 60
      ? `${Math.floor(seconds / 60)}:${String(Math.round(seconds % 60)).padStart(2, "0")}`
      : `0:${String(Math.round(seconds)).padStart(2, "0")}`;

  return (
    <figure className="my-12 border border-ink-15 bg-ground-lift p-6 sm:p-8">
      <figcaption className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
        <span className="font-mono text-mono-xs text-signal">◉ LISTEN</span>
        <span className="font-body text-h3 text-ink">{label}</span>
        <span className="ml-auto font-mono text-mono-xs text-ink-70 tabular-nums">
          {timecode} · {lufs} LUFS
        </span>
      </figcaption>

      <WaveformRule seed={label.length + seconds} className="mt-6 h-16" />

      <details className="mt-6 border-t border-ink-15 pt-4">
        <summary className="min-h-11 cursor-pointer font-mono text-mono-xs text-ink-70">
          Read a description of this recording
        </summary>
        <p className="mt-3 max-w-[64ch] text-body text-ink-70">{transcript}</p>
      </details>
    </figure>
  );
}
