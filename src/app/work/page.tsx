import type { Metadata } from "next";
import { Suspense } from "react";

import { WorkIndex } from "@/components/work/WorkIndex";

export const metadata: Metadata = {
  alternates: { canonical: "/work" },
  title: "Work",
  description:
    "Sonic identity work across fintech, mobility, hospitality and aviation. Each case study plays its own system in the context it was built for.",
};

/**
 * The grid reads its filter from the query string, and useSearchParams opts a
 * statically rendered route out of prerendering unless it sits behind a
 * boundary. The fallback is the page's own heading rather than a spinner, so
 * the shell is identical either way and nothing moves when it resolves.
 */
export default function WorkPage() {
  return (
    <Suspense
      fallback={
        <section className="shell pt-[14vh] pb-12">
          <h1 className="font-display text-h1 text-ink">Work</h1>
        </section>
      }
    >
      <WorkIndex />
    </Suspense>
  );
}
