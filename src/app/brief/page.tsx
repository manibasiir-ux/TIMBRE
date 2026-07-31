import type { Metadata } from "next";

import { BriefFormMount } from "@/components/brief/BriefFormMount";
import { WaveformRule } from "@/components/primitives/WaveformRule";

/**
 * Brief us, specification §6.8.
 *
 * The page around the form is server-rendered; the form itself is the only
 * client component, so what happens next and how to reach us without a form are
 * in the initial HTML regardless of whether the form ever hydrates.
 */

export const metadata: Metadata = {
  title: "Brief us",
  description:
    "Tell us what you are making audible. Two working days to a reply, and a technical scoping call if that is what you need.",
};

const NEXT_STEPS = [
  {
    number: "01",
    title: "We read it",
    body: "A person, within two working days. Not an autoresponder pretending to be one.",
  },
  {
    number: "02",
    title: "A call, scoped to you",
    body: "Commercial if you need bands and timelines, technical if you need file trees and formats.",
  },
  {
    number: "03",
    title: "A written proposal",
    body: "Scope, phases, price and what we would need from your side, in one document.",
  },
] as const;

export default function BriefPage() {
  return (
    <>
      <section className="shell pt-[14vh] pb-12">
        <h1 className="font-display text-h1 text-ink">Brief us</h1>
        <p className="mt-8 max-w-[48ch] text-lead text-ink-70">
          Tell us what you are making audible, roughly what it is worth to you,
          and when it has to exist.
        </p>
      </section>

      <WaveformRule seed={11} />

      <BriefFormMount />

      <section className="shell section-rhythm">
        <h2 className="font-display text-h2 text-ink">What happens next</h2>
        <ol className="mt-12 grid grid-cols-4 gap-8 lg:grid-cols-12">
          {NEXT_STEPS.map((step) => (
            <li key={step.number} className="col-span-4">
              <p className="font-mono text-mono-xs text-signal">{step.number}</p>
              <h3 className="mt-4 font-body text-h3 text-ink">{step.title}</h3>
              <p className="mt-3 text-body text-ink-70">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}
