import type { Metadata } from "next";
import Link from "next/link";

import { WaveformRule } from "@/components/primitives/WaveformRule";
import {
  BreadcrumbSchema,
  ServiceSchema,
} from "@/components/seo/StructuredData";
import {
  FAQ,
  LICENSING,
  PACKAGES,
  RETAINER,
  SERVICE_LINES,
} from "@/content/services";

/**
 * Services, specification §6.4.
 *
 * Price bands are published on purpose. The roadmap records the argument: bands
 * make a studio a commodity, silence makes it a phone call, and phone calls
 * take three weeks to schedule. Identity is highlighted to anchor the middle.
 *
 * Server-rendered and static. This is the page pricing searches land on, so
 * every number has to be in the initial HTML.
 */

export const metadata: Metadata = {
  alternates: { canonical: "/services" },
  title: "Services",
  description:
    "Three packages with published price bands, six service lines, and a guardianship retainer. Mnemonic from £45k, Identity from £110k, System from £220k.",
};

export default function ServicesPage() {
  return (
    <>
      <ServiceSchema />
      <BreadcrumbSchema trail={[{ name: "Services", path: "/services" }]} />

      <section className="shell pt-[14vh] pb-12">
        <h1 className="font-display text-h1 text-ink">Services</h1>
        <p className="mt-8 max-w-[48ch] text-lead text-ink-70">
          Six lines of work, three packages, one retainer. Prices are bands
          rather than quotes, so you can decide whether to talk to us before you
          spend an hour finding out.
        </p>
      </section>

      <WaveformRule seed={4} />

      <section className="shell section-rhythm">
        <h2 className="sr-only">Service lines</h2>
        <ul className="border-t border-ink-15">
          {SERVICE_LINES.map((line) => (
            <li key={line.number} className="border-b border-ink-15">
              {/* Native disclosure rather than scripted accordion: it is
                  keyboard-operable, announced correctly and works before
                  hydration. §7's 0.45s expansion is applied to the panel. */}
              <details className="group">
                <summary className="flex min-h-11 cursor-pointer items-baseline gap-6 py-6">
                  <span className="font-mono text-mono-xs text-ink-70">
                    {line.number}
                  </span>
                  <span className="flex-1 font-display text-h2 text-ink">
                    {line.name}
                  </span>
                  <span
                    aria-hidden="true"
                    className="font-mono text-mono text-signal transition-transform duration-[var(--dur-base)] group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>

                <div className="grid grid-cols-4 gap-4 pb-10 lg:grid-cols-12">
                  <p className="col-span-4 max-w-[56ch] text-body text-ink-70 lg:col-span-6 lg:col-start-2">
                    {line.description}
                  </p>
                  <div className="col-span-4 lg:col-span-4">
                    <p className="font-mono text-mono-xs text-ink-70">
                      Deliverables
                    </p>
                    <ul className="mt-3 space-y-2">
                      {line.deliverables.map((item) => (
                        <li key={item} className="text-small text-ink">
                          {item}
                        </li>
                      ))}
                    </ul>
                    <p className="mt-6 font-mono text-mono-xs text-ink-70">
                      {line.duration} · {line.inPackages.join(" · ")}
                    </p>
                  </div>
                </div>
              </details>
            </li>
          ))}
        </ul>
      </section>

      <section className="shell section-rhythm">
        <h2 className="font-display text-h2 text-ink">Packages</h2>
        <ul className="mt-12 grid grid-cols-4 gap-4 lg:grid-cols-12">
          {PACKAGES.map((pack) => {
            const highlighted = pack.highlighted;
            return (
              <li
                key={pack.name}
                className={`col-span-4 flex flex-col border bg-ground-lift p-8 ${
                  highlighted ? "border-t-2 border-signal" : "border-ink-15"
                }`}
              >
                <div className="flex items-baseline justify-between gap-4">
                  <h3 className="font-display text-h3 text-ink">{pack.name}</h3>
                  {highlighted && (
                    <span className="font-mono text-mono-xs text-signal">
                      Most common
                    </span>
                  )}
                </div>

                <p className="mt-6 font-mono text-h3 text-ink tabular-nums">
                  {pack.band}
                </p>
                <p className="mt-2 font-mono text-mono-xs text-ink-70">
                  {pack.duration}
                </p>

                <p className="mt-6 flex-1 text-body text-ink-70">{pack.scope}</p>

                <p className="mt-8 border-t border-ink-15 pt-4 text-small text-ink-70">
                  {pack.buyer}
                </p>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="shell section-rhythm">
        <div className="border border-signal/40 p-8 lg:p-12">
          <h2 className="font-display text-h2 text-ink">{RETAINER.name}</h2>
          <p className="mt-6 font-mono text-h3 text-signal tabular-nums">
            {RETAINER.band}
          </p>
          <p className="mt-2 font-mono text-mono-xs text-ink-70">
            {RETAINER.minimum}
          </p>
          <ul className="mt-8 grid grid-cols-1 gap-2 md:grid-cols-2">
            {RETAINER.covers.map((item) => (
              <li key={item} className="text-body text-ink-70">
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="shell section-rhythm">
        <h2 className="font-display text-h2 text-ink">Licensing, plainly</h2>
        <dl className="mt-10 grid grid-cols-4 gap-8 lg:grid-cols-12">
          {LICENSING.map((item) => (
            <div key={item.title} className="col-span-4">
              <dt className="font-body text-h3 text-ink">{item.title}</dt>
              <dd className="mt-3 text-body text-ink-70">{item.body}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="shell section-rhythm">
        <h2 className="font-display text-h2 text-ink">Questions</h2>
        <ul className="mt-10 border-t border-ink-15">
          {FAQ.map((item) => (
            <li key={item.q} className="border-b border-ink-15">
              <details>
                <summary className="min-h-11 cursor-pointer py-5 font-body text-h3 text-ink">
                  {item.q}
                </summary>
                <p className="max-w-[64ch] pb-6 text-body text-ink-70">
                  {item.a}
                </p>
              </details>
            </li>
          ))}
        </ul>
      </section>

      <section className="shell section-rhythm border-t border-ink-15">
        <Link
          href="/brief"
          className="inline-block min-h-11 bg-signal px-8 py-4 font-mono text-mono text-ground"
        >
          Brief us
        </Link>
      </section>
    </>
  );
}
