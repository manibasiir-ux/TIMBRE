import type { Metadata } from "next";
import Link from "next/link";

import { WaveformRule } from "@/components/primitives/WaveformRule";
import { allPosts, formatJournalDate } from "@/lib/journal";

/**
 * The journal index, specification §6.7.
 *
 * Reverse-chronological rows: date in mono, title at h2, reading time, and a
 * signal flag on the audio essays. Hovering fills the row and slides the title
 * right, which is the only motion here — the rest is a list, and a list of
 * writing should look like one.
 *
 * FR-19 asks for ISR at an hour. Nothing here changes without a deploy, so the
 * revalidation is really only insurance against a rebuild being missed.
 */

export const revalidate = 3600;

export const metadata: Metadata = {
  alternates: { canonical: "/journal" },
  title: "Journal — TIMBRE",
  description:
    "Writing on sonic identity: what the work involves, what it costs, and what makes it survive handover.",
};

export default function JournalIndex() {
  const posts = allPosts();

  return (
    <>
      <section className="shell pt-[14vh] pb-12">
        <h1 className="font-display text-h1 text-ink">Journal</h1>
        <p className="mt-6 max-w-[56ch] text-lead text-ink-70">
          What we have learned building sonic identities, written down while it
          is still specific enough to be useful.
        </p>
        <p className="mt-6 font-mono text-mono-xs text-ink-70">
          {String(posts.length).padStart(2, "0")}{" "}
          {posts.length === 1 ? "entry" : "entries"}
        </p>
      </section>

      <WaveformRule seed={5} />

      <section className="shell section-rhythm">
        {posts.length === 0 ? (
          <p className="text-lead text-ink-70">Nothing published yet.</p>
        ) : (
          <ul className="border-t border-ink-15">
            {posts.map((post) => (
              <li key={post.slug} className="border-b border-ink-15">
                <Link
                  href={`/journal/${post.slug}`}
                  className="group flex flex-wrap items-baseline gap-x-8 gap-y-2 px-4 py-8 transition-colors duration-[var(--dur-base)] hover:bg-ground-lift focus-visible:outline-2"
                >
                  <time
                    dateTime={post.date}
                    className="w-32 shrink-0 font-mono text-mono-xs text-ink-70"
                  >
                    {formatJournalDate(post.date)}
                  </time>

                  <span className="flex-1 font-display text-h2 text-ink transition-transform duration-[var(--dur-base)] group-hover:translate-x-4 motion-reduce:group-hover:translate-x-0">
                    {post.title}
                  </span>

                  {post.audioEssay && (
                    <span className="shrink-0 font-mono text-mono-xs text-signal">
                      ◉ AUDIO ESSAY
                    </span>
                  )}

                  <span className="w-24 shrink-0 text-right font-mono text-mono-xs text-ink-70 tabular-nums">
                    {post.readingMinutes} min
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
