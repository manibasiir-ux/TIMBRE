import type { Metadata } from "next";

import { WaveformRule } from "@/components/primitives/WaveformRule";

/**
 * Process, specification §6.6.
 *
 * The five-phase pinned timeline and the file-tree component are the horizontal
 * scrub work and arrive with it. What is present now is the part that converts
 * technical evaluators on its own: the phases named, and the naming convention
 * and format matrix stated plainly enough to be checked.
 */

export const metadata: Metadata = {
  alternates: { canonical: "/process" },
  title: "Process",
  description:
    "Five phases from Listen to Guardianship, the delivery manifest, naming convention and format matrix. Written for the people who have to implement it.",
};

const PHASES = [
  {
    number: "01",
    name: "Listen",
    body: "Audit of what exists, where it plays and who owns it. Usually the first time anyone has inventoried it.",
  },
  {
    number: "02",
    name: "Territories",
    body: "Three directions, deliberately rough. The point is to react to a direction, not to a finish.",
  },
  {
    number: "03",
    name: "Development",
    body: "One territory taken to master, with the adaptations that let it survive every surface it has to live on.",
  },
  {
    number: "04",
    name: "System",
    body: "Guidelines, naming, formats and handoff. The part that makes the work outlast the engagement.",
  },
  {
    number: "05",
    name: "Guardianship",
    body: "Quarterly audits and a sound-check on every new surface, so the system does not decay after handover.",
  },
] as const;

const NAMING_EXAMPLE = [
  "tmb_<client>_<surface>_<state>_v<NN>_<LUFS>_<rate><depth>.wav",
  "",
  "tmb_kestrel_ui_confirm_v03_-16LUFS_48k24.wav",
  "tmb_kestrel_ui_error_v02_-16LUFS_48k24.wav",
  "tmb_halcyon_startup_v08_-18LUFS_48k24.wav",
].join("\n");

const FORMAT_MATRIX = [
  { platform: "Master", format: "WAV 48k/24", loudness: "-16 LUFS" },
  { platform: "iOS", format: "CAF / AAC", loudness: "-16 LUFS" },
  { platform: "Android", format: "OGG Vorbis", loudness: "-16 LUFS" },
  { platform: "Web", format: "AAC / Opus", loudness: "-16 LUFS" },
  { platform: "Broadcast", format: "WAV 48k/24", loudness: "-23 LUFS" },
  { platform: "In-store", format: "WAV 48k/24", loudness: "-20 LUFS" },
] as const;

export default function ProcessPage() {
  return (
    <>
      <section className="shell pt-[14vh] pb-12">
        <h1 className="font-display text-h1 text-ink">Process</h1>
        <p className="mt-8 max-w-[48ch] text-lead text-ink-70">
          Five phases. The interesting ones are the last two, because they decide
          whether any of the first three still exists in a year.
        </p>
      </section>

      <WaveformRule seed={6} />

      <section className="shell section-rhythm">
        <ol className="border-t border-ink-15">
          {PHASES.map((phase) => (
            <li
              key={phase.number}
              className="grid grid-cols-4 gap-4 border-b border-ink-15 py-10 lg:grid-cols-12"
            >
              <p className="col-span-4 font-mono text-mono-xs text-signal lg:col-span-2">
                {phase.number}
              </p>
              {/* Four columns, not three, and the row now adds to twelve.
                  At 2 + 3 + 6 the heading had about 360px at the reference
                  width while "Guardianship" and "Development" set wider than
                  that at text-h2's 52px ceiling — so they overflowed their
                  track and ran underneath the description beside them. Display
                  type does not wrap out of a collision; it just leaves. */}
              <h2 className="col-span-4 font-display text-h2 text-balance text-ink lg:col-span-4">
                {phase.name}
              </h2>
              <p className="col-span-4 max-w-[52ch] text-body text-ink-70 lg:col-span-6">
                {phase.body}
              </p>
            </li>
          ))}
        </ol>
      </section>

      <section className="shell section-rhythm">
        <h2 className="font-display text-h2 text-ink">Delivery manifest</h2>
        <p className="mt-6 max-w-[64ch] text-body text-ink-70">
          Every file is named the same way, every time. If you cannot tell what
          an asset is, which version it is and how loud it is from its filename,
          it has not been delivered.
        </p>

        <pre className="mt-10 overflow-x-auto border border-ink-15 bg-ground-lift p-6 font-mono text-mono-xs text-ink">
          {NAMING_EXAMPLE}
        </pre>

        <h3 className="mt-16 font-body text-h3 text-ink">Format matrix</h3>
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[32rem] border-collapse text-left">
            <thead>
              <tr className="border-b border-ink-15">
                <th
                  scope="col"
                  className="py-3 font-mono text-mono-xs text-ink-70"
                >
                  Platform
                </th>
                <th
                  scope="col"
                  className="py-3 font-mono text-mono-xs text-ink-70"
                >
                  Format
                </th>
                <th
                  scope="col"
                  className="py-3 font-mono text-mono-xs text-ink-70"
                >
                  Target
                </th>
              </tr>
            </thead>
            <tbody>
              {FORMAT_MATRIX.map((row) => (
                <tr key={row.platform} className="border-b border-ink-15">
                  <td className="py-3 font-mono text-mono-xs text-ink">
                    {row.platform}
                  </td>
                  <td className="py-3 font-mono text-mono-xs text-ink-70">
                    {row.format}
                  </td>
                  <td className="py-3 font-mono text-mono-xs text-ink-70 tabular-nums">
                    {row.loudness}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h3 className="mt-16 font-body text-h3 text-ink">Handoff targets</h3>
        <p className="mt-4 font-mono text-mono-xs text-ink-70">
          Figma · Storybook · Unity · Wwise · FMOD
        </p>
      </section>
    </>
  );
}
