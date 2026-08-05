import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import matter from "gray-matter";

/**
 * Journal content, FR-19 and specification §6.7.
 *
 * Posts are `.mdx` files in `content/journal`, read at build time. The point of
 * that choice is NFR-18: a writer adds a post through GitHub's web editor and
 * the site rebuilds. Nothing here is dynamic and nothing is fetched.
 *
 * This module is server-only by construction — it reads the filesystem — which
 * is also what keeps the MDX toolchain out of the browser bundle. If anything
 * here is ever imported from a client component the build will say so, and the
 * fix is to move the call up to the page rather than to reach for a polyfill.
 *
 * **MDX executes JavaScript.** That is safe because these files are in the
 * repository and written by the team. If journal content ever arrives from
 * outside it — a CMS, a form, anything a stranger can write — this is the wrong
 * mechanism and it must be replaced rather than sanitised.
 */

const JOURNAL_DIR = join(process.cwd(), "content", "journal");

/** Words per minute, the figure most reading-time estimates settle on. */
const READING_SPEED = 200;

export type JournalMeta = {
  slug: string;
  title: string;
  /** ISO date, used for sorting and for the dateTime attribute. */
  date: string;
  summary: string;
  /** §6.7 flags these with a signal marker on the index. */
  audioEssay: boolean;
  readingMinutes: number;
};

export type JournalPost = JournalMeta & { body: string };

function readingMinutes(body: string): number {
  const words = body.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / READING_SPEED));
}

function parse(fileName: string): JournalPost {
  const raw = readFileSync(join(JOURNAL_DIR, fileName), "utf8");
  const { data, content } = matter(raw);

  const slug = fileName.replace(/\.mdx$/, "");

  // Thrown at build time, not rendered as a broken post. A journal entry with
  // no date cannot be placed in a reverse-chronological list, and one with no
  // title has nothing to link to.
  for (const field of ["title", "date", "summary"] as const) {
    if (typeof data[field] !== "string" || data[field].trim() === "") {
      throw new Error(`content/journal/${fileName} is missing "${field}"`);
    }
  }
  if (Number.isNaN(Date.parse(data.date as string))) {
    throw new Error(`content/journal/${fileName} has an unparseable date`);
  }

  return {
    slug,
    title: data.title as string,
    date: data.date as string,
    summary: data.summary as string,
    audioEssay: data.audioEssay === true,
    readingMinutes: readingMinutes(content),
    body: content,
  };
}

/** Every post, newest first. */
export function allPosts(): JournalPost[] {
  let files: string[];
  try {
    files = readdirSync(JOURNAL_DIR).filter((name) => name.endsWith(".mdx"));
  } catch {
    // An empty journal is a valid state — the index says so rather than 500s.
    return [];
  }

  return files
    .map(parse)
    .sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
}

export function postBySlug(slug: string): JournalPost | undefined {
  return allPosts().find((post) => post.slug === slug);
}

/** The two most recent, for the homepage teaser in §6.1 item 8. */
export function latestPosts(count = 2): JournalMeta[] {
  return allPosts().slice(0, count);
}

/** Formats a post date the way §6.7's mono column wants it. */
export function formatJournalDate(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  })
    .format(new Date(iso))
    .toUpperCase();
}
