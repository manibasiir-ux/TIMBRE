import type { Metadata } from "next";

import { WaveformRule } from "@/components/primitives/WaveformRule";
import { BreadcrumbSchema } from "@/components/seo/StructuredData";

/**
 * Privacy, NFR-13.
 *
 * The requirement names specific commitments — 24-month retention, a DSAR route
 * with a 30-day SLA, EU processing, a DPA on request — and until now the site
 * made none of them anywhere a visitor could read. A brief form that collects a
 * name, an email and a budget with no statement of what happens to any of it is
 * the gap this closes.
 *
 * Written plainly and deliberately short. A privacy page nobody finishes is the
 * same as no privacy page, and everything here is a real commitment rather than
 * a hedge.
 *
 * **This is not legal advice and has not been reviewed by a lawyer.** It states
 * what the system actually does, which is the part an engineer can be sure of.
 * The retention window, the DSAR address and the DPA offer all need signing off
 * by someone qualified before launch.
 */

export const metadata: Metadata = {
  title: "Privacy",
  description:
    "What TIMBRE collects when you send a brief, how long it is kept, where it is processed, and how to have it deleted.",
  alternates: { canonical: "/privacy" },
};

const SECTIONS = [
  {
    heading: "What we collect",
    body: "Only what you type into the brief form: your name, your company, your email address, the shape of the project, and a budget band. Nothing else is collected, and there is no account to create.",
  },
  {
    heading: "What we do with it",
    body: "We read it and reply. Submissions are delivered to our inbox and mirrored to our internal Slack so that whoever is on enquiries sees it the same day. It is not sold, shared with advertisers, or used to build a profile.",
  },
  {
    heading: "How long we keep it",
    body: "Brief submissions are held for 24 months and then deleted. That window is deliberate: sonic identity projects are frequently budgeted a year before they start, and a brief that arrives in one financial year often becomes a project in the next.",
  },
  {
    heading: "Where it is processed",
    body: "In the EU. The site is served from Frankfurt and email is processed in the EU region. Nothing about a brief leaves the EU in normal operation.",
  },
  {
    heading: "Cookies and measurement",
    body: "No cookies are set before you agree to anything, and audio never plays until you ask for it. Analytics, when enabled, are cookieless by default and measure pages rather than people. A banner appears only if you opt in to anything beyond that.",
  },
  {
    heading: "Your rights",
    body: "You can ask for a copy of what we hold, ask us to correct it, or ask us to delete it. Write to privacy@timbre.studio and we will respond within 30 days. You do not need to explain why, and asking does not affect a live enquiry.",
  },
  {
    heading: "Data processing agreements",
    body: "Available on request for clients and prospective clients. Ask the same address.",
  },
];

export default function PrivacyPage() {
  return (
    <>
      <BreadcrumbSchema trail={[{ name: "Privacy", path: "/privacy" }]} />

      <section className="shell pt-[14vh] pb-12">
        <h1 className="font-display text-h1 text-ink">Privacy</h1>
        <p className="mt-6 max-w-[60ch] text-lead text-ink-70">
          What we collect when you send us a brief, how long we keep it, and how
          to have it removed. It is short because there is not much of it.
        </p>
      </section>

      <WaveformRule seed={9} />

      <section className="shell section-rhythm grid grid-cols-4 gap-y-12 lg:grid-cols-12">
        <div className="col-span-4 lg:col-span-8 lg:col-start-3">
          {SECTIONS.map((section) => (
            <div key={section.heading} className="mb-12">
              <h2 className="font-body text-h3 text-ink">{section.heading}</h2>
              <p className="mt-4 max-w-[64ch] text-body text-ink-70">
                {section.body}
              </p>
            </div>
          ))}

          <p className="mt-16 border-t border-ink-15 pt-6 font-mono text-mono-xs text-ink-70">
            Questions about any of this go to{" "}
            <a
              href="mailto:privacy@timbre.studio"
              className="text-signal underline underline-offset-4"
            >
              privacy@timbre.studio
            </a>
            .
          </p>
        </div>
      </section>
    </>
  );
}
