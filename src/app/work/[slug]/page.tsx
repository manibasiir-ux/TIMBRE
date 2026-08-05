import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { WaveformRule } from "@/components/primitives/WaveformRule";
import { BreadcrumbSchema } from "@/components/seo/StructuredData";
import { CaseAudio } from "@/components/work/CaseAudio";
import { CASES, caseBySlug, nextCase } from "@/content/cases";

/**
 * Case study detail, specification §6.3.
 *
 * Statically generated per case, and the narrative is server-rendered: NFR-11
 * requires every indexable word — including the case copy — in the initial
 * HTML. Only the playable inventory and the context players are client-side.
 */

export function generateStaticParams() {
  return CASES.map((entry) => ({ slug: entry.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const entry = caseBySlug(slug);
  if (!entry) return { title: "Not found" };

  return {
    title: `${entry.client} — ${entry.tier}`,
    description: entry.summary,
    alternates: { canonical: `/work/${entry.slug}` },
    openGraph: {
      title: `${entry.client} · TIMBRE`,
      description: entry.summary,
      type: "article",
    },
  };
}

export default async function CaseStudyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const entry = caseBySlug(slug);
  if (!entry) notFound();

  const next = nextCase(entry.slug);

  return (
    <>
      <BreadcrumbSchema
        trail={[
          { name: "Work", path: "/work" },
          { name: entry.client, path: `/work/${entry.slug}` },
        ]}
      />

      <section className="shell pt-[14vh] pb-12">
        <p className="font-mono text-mono-xs text-ink-70">Case study</p>
        <h1 className="mt-6 font-display text-mega text-ink">{entry.client}</h1>

        <dl className="mt-12 grid grid-cols-2 gap-6 font-mono text-mono-xs lg:grid-cols-4">
          {[
            ["Sector", entry.sector],
            ["Package", entry.tier],
            ["Year", String(entry.year)],
            ["Territories", entry.territories],
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="text-ink-70">{label}</dt>
              <dd className="mt-2 text-ink">{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <WaveformRule seed={5} />

      <section className="shell section-rhythm grid grid-cols-4 gap-4 lg:grid-cols-12">
        <div className="col-span-4 lg:col-span-6 lg:col-start-2">
          <h2 className="font-mono text-mono-xs text-ink-70">The brief</h2>
          <p className="mt-6 text-lead text-ink-70">{entry.brief}</p>
        </div>
      </section>

      <section className="shell section-rhythm grid grid-cols-4 gap-4 lg:grid-cols-12">
        <blockquote className="col-span-4 lg:col-span-9 lg:col-start-2">
          <p className="font-display text-h1 text-ink">
            <span aria-hidden="true" className="text-signal">
              “
            </span>
            {entry.insight}
          </p>
        </blockquote>
      </section>

      <CaseAudio
        slug={entry.slug}
        client={entry.client}
        inventory={entry.inventory}
        contexts={entry.contexts}
      />

      <WaveformRule seed={9} />

      <section className="shell section-rhythm">
        <h2 className="font-display text-h2 text-ink">Results</h2>
        <ul className="mt-12 grid grid-cols-4 gap-8 lg:grid-cols-12">
          {entry.results.map((metric) => (
            <li key={metric.label} className="col-span-4">
              <p className="font-display text-display text-signal tabular-nums">
                {metric.value}
              </p>
              <p className="mt-4 max-w-[32ch] text-body text-ink-70">
                {metric.label}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section className="shell section-rhythm">
        <h2 className="font-mono text-mono-xs text-ink-70">Credits</h2>
        <dl className="mt-8 grid grid-cols-4 gap-x-4 gap-y-4 font-mono text-mono-xs lg:grid-cols-12">
          {entry.credits.map((credit) => (
            <div key={credit.role} className="col-span-4 lg:col-span-6">
              <dt className="text-ink-70">{credit.role}</dt>
              <dd className="mt-1 text-ink">{credit.name}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="shell section-rhythm border-t border-ink-15">
        <p className="font-mono text-mono-xs text-ink-70">Next project</p>
        <Link
          href={`/work/${next.slug}`}
          className="group mt-6 block max-w-[20ch]"
        >
          <span className="font-display text-display text-ink transition-colors duration-[var(--dur-base)] group-hover:text-signal">
            {next.client}
          </span>
        </Link>
      </section>
    </>
  );
}
