"use client";

import dynamic from "next/dynamic";

/**
 * Mounts the brief form on the client only.
 *
 * The form seeds itself from a draft in localStorage, which does not exist
 * during server rendering. Rendering it on the server would emit an empty form
 * and then hydrate a filled one, and React would rightly complain about the
 * disagreement.
 *
 * The cost is that the form is absent until JavaScript runs, which is why the
 * page around it — what happens next, the response-time promise, the direct
 * email — is server-rendered and the form itself carries a noscript route out.
 * Nobody arrives at a page with no way to reach the studio.
 */
const Form = dynamic(
  () => import("./BriefForm").then((module) => module.BriefForm),
  {
    ssr: false,
    loading: () => (
      <section className="shell section-rhythm">
        <p className="font-mono text-mono-xs text-ink-40">Loading the form…</p>
      </section>
    ),
  },
);

export function BriefFormMount() {
  return <Form />;
}
