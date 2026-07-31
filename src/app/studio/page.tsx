import type { Metadata } from "next";

import { WaveformRule } from "@/components/primitives/WaveformRule";

/**
 * Studio, specification §6.5.
 *
 * The team grid's per-person signature sound needs nine recorded assets that do
 * not exist, so the hover audio is absent rather than faked. Portrait frames
 * are placeholders for the same reason. Everything written here stands on its
 * own, which §10 requires of it regardless.
 */

export const metadata: Metadata = {
  title: "Studio",
  description:
    "A sonic identity studio in Hackney. Composers, sound designers and strategists who deliver systems rather than folders of files.",
};

const TEAM = [
  { name: "Ines Kovač", role: "Creative director" },
  { name: "Douglas Ferreiro", role: "Technical director" },
  { name: "Nour el-Amrani", role: "Product and strategy" },
  { name: "Wren Baptiste", role: "Composer" },
  { name: "Sam Okoye", role: "Motion and front-end" },
  { name: "Kiri Tanaka", role: "Quality and accessibility" },
] as const;

const KIT = [
  "Neve 1073 preamps",
  "AEA R84 ribbon",
  "Neumann U87",
  "Bricasti M7 reverb",
  "ATC SCM45A monitoring",
  "Anechoic measurement room",
] as const;

export default function StudioPage() {
  return (
    <>
      <section className="shell pt-[14vh] pb-12">
        <h1 className="font-display text-h1 text-ink">Studio</h1>
        <p className="mt-8 max-w-[52ch] text-lead text-ink-70">
          A live room in Hackney with a 1.9-second reverb tail, which is a poor
          choice for meetings and an excellent one for everything else.
        </p>
      </section>

      <WaveformRule seed={8} />

      <section className="shell section-rhythm">
        <h2 className="font-display text-h2 text-ink">People</h2>
        <ul className="mt-12 grid grid-cols-4 gap-8 lg:grid-cols-12">
          {TEAM.map((person) => (
            <li key={person.name} className="col-span-4">
              <div
                className="aspect-[4/5] border border-ink-15 bg-ground-lift"
                aria-hidden="true"
              />
              <p className="mt-4 font-body text-h3 text-ink">{person.name}</p>
              <p className="mt-1 font-mono text-mono-xs text-ink-40">
                {person.role}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section className="shell section-rhythm">
        <h2 className="font-display text-h2 text-ink">Kit</h2>
        <ul className="mt-10 grid grid-cols-2 gap-3 font-mono text-mono-xs text-ink-70 lg:grid-cols-3">
          {KIT.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
    </>
  );
}
