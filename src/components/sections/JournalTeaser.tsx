import Link from "next/link";

import { WaveformRule } from "@/components/primitives/WaveformRule";
import { formatJournalDate, latestPosts } from "@/lib/journal";

/**
 * The journal teaser, specification §6.1 item 8.
 *
 * Two posts in an editorial layout with a waveform rule between them. Held back
 * from the homepage until the journal route existed, because a teaser pointing
 * at a 404 is worse than a homepage with one fewer section.
 *
 * It renders nothing at all when there are no posts. A studio with an empty
 * journal is better served by not mentioning it than by an empty panel that
 * says the writing stopped.
 */
export function JournalTeaser() {
  const posts = latestPosts(2);
  if (posts.length === 0) return null;

  return (
    <section aria-labelledby="journal-teaser-title" className="shell section-rhythm">
      <div className="flex flex-wrap items-baseline justify-between gap-6">
        <h2 id="journal-teaser-title" className="font-display text-h2 text-ink">
          From the journal
        </h2>
        <Link
          href="/journal"
          className="font-mono text-mono-xs text-signal underline-offset-4 hover:underline"
        >
          All entries →
        </Link>
      </div>

      <ul className="mt-12 grid grid-cols-4 gap-x-8 gap-y-12 lg:grid-cols-12">
        {posts.map((post, index) => (
          <li
            key={post.slug}
            className={
              index === 0
                ? "col-span-4 lg:col-span-7"
                : "col-span-4 lg:col-span-4 lg:col-start-9"
            }
          >
            <Link href={`/journal/${post.slug}`} className="group block focus-visible:outline-2">
              <p className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-mono-xs text-ink-70">
                <time dateTime={post.date}>{formatJournalDate(post.date)}</time>
                <span aria-hidden="true">·</span>
                <span>{post.readingMinutes} min</span>
                {post.audioEssay && (
                  <span className="text-signal">◉ AUDIO ESSAY</span>
                )}
              </p>

              <p
                className={`mt-4 font-display text-ink ${
                  index === 0 ? "text-h2" : "text-h3"
                }`}
              >
                {post.title}
              </p>

              <WaveformRule
                seed={post.title.length + index}
                className="mt-6 transition-colors duration-[var(--dur-base)] group-hover:text-signal-dim"
              />

              <p className="mt-6 max-w-[52ch] text-body text-ink-70">
                {post.summary}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
