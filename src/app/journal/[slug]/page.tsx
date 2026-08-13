import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";

import { Listen } from "@/components/journal/Listen";
import { WaveformRule } from "@/components/primitives/WaveformRule";
import {
  ArticleSchema,
  BreadcrumbSchema,
} from "@/components/seo/StructuredData";
import { allPosts, formatJournalDate, postBySlug } from "@/lib/journal";

/**
 * A journal post, specification §6.7.
 *
 * Single column at 64ch, with pull-quotes breaking wider and `<Listen>` panels
 * running full width. The prose styling lives here rather than in a plugin: it
 * is a dozen elements, and a typography plugin would bring opinions about every
 * one of them that §2's type scale has already settled.
 *
 * MDXRemote is the RSC entry point, so the compiler runs on the server and none
 * of the MDX toolchain reaches the browser. That is what keeps a 121-package
 * dependency off the 210 KB budget in NFR-05, and it is asserted by the bundle
 * gate rather than assumed.
 */

export const revalidate = 3600;

export function generateStaticParams() {
  return allPosts().map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = postBySlug(slug);
  if (!post) return { title: "Not found" };

  return {
    // No " — TIMBRE" suffix here: the root layout's title template already
    // appends "· TIMBRE", and carrying both rendered "…problem — TIMBRE · TIMBRE".
    title: post.title,
    description: post.summary,
    alternates: { canonical: `/journal/${post.slug}` },
    openGraph: {
      title: post.title,
      description: post.summary,
      type: "article",
      publishedTime: post.date,
    },
  };
}

/**
 * The prose elements MDX is allowed to produce.
 *
 * An explicit map rather than a stylesheet, because it doubles as the list of
 * what a writer may use. Anything not here renders unstyled, which is a visible
 * prompt to come and decide how it should look rather than a silent default.
 */
const components = {
  Listen,
  h2: (props: React.ComponentProps<"h2">) => (
    <h2 className="mt-16 mb-6 font-display text-h2 text-ink" {...props} />
  ),
  h3: (props: React.ComponentProps<"h3">) => (
    <h3 className="mt-12 mb-4 font-body text-h3 text-ink" {...props} />
  ),
  p: (props: React.ComponentProps<"p">) => (
    <p className="mb-6 max-w-[64ch] text-body text-ink-70" {...props} />
  ),
  ul: (props: React.ComponentProps<"ul">) => (
    <ul
      className="mb-6 max-w-[64ch] list-disc space-y-2 pl-6 text-body text-ink-70"
      {...props}
    />
  ),
  li: (props: React.ComponentProps<"li">) => <li {...props} />,
  strong: (props: React.ComponentProps<"strong">) => (
    <strong className="text-ink" {...props} />
  ),
  a: (props: React.ComponentProps<"a">) => (
    <a
      className="text-signal underline underline-offset-4"
      {...props}
    />
  ),
  // §6.7: pull-quotes break wider than the measure, which is what makes them
  // read as a break in the argument rather than as an indented paragraph.
  blockquote: (props: React.ComponentProps<"blockquote">) => (
    <blockquote
      className="my-12 max-w-[52ch] border-l-2 border-signal pl-6 font-display text-h3 text-ink lg:-ml-[8%]"
      {...props}
    />
  ),
};

export default async function JournalPost({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = postBySlug(slug);
  if (!post) notFound();

  return (
    <>
      <ArticleSchema
        title={post.title}
        description={post.summary}
        datePublished={post.date}
        path={`/journal/${post.slug}`}
      />
      <BreadcrumbSchema
        trail={[
          { name: "Journal", path: "/journal" },
          { name: post.title, path: `/journal/${post.slug}` },
        ]}
      />

      <section className="shell pt-[14vh] pb-10">
        <p className="flex flex-wrap items-center gap-x-6 gap-y-2 font-mono text-mono-xs text-ink-70">
          <time dateTime={post.date}>{formatJournalDate(post.date)}</time>
          <span aria-hidden="true">·</span>
          <span>{post.readingMinutes} min read</span>
          {post.audioEssay && (
            <span className="text-signal">◉ AUDIO ESSAY</span>
          )}
        </p>

        <h1 className="mt-8 max-w-[20ch] text-balance font-display text-h1 text-ink">
          {post.title}
        </h1>

        <p className="mt-8 max-w-[56ch] text-lead text-ink-70">
          {post.summary}
        </p>
      </section>

      <WaveformRule seed={post.title.length} />

      <article className="shell section-rhythm grid grid-cols-4 lg:grid-cols-12">
        <div className="col-span-4 lg:col-span-7 lg:col-start-3">
          <MDXRemote source={post.body} components={components} />
        </div>
      </article>

      <section className="shell pb-[16vh]">
        <Link
          href="/journal"
          className="font-mono text-mono-xs text-signal underline-offset-4 hover:underline"
        >
          ← All entries
        </Link>
      </section>
    </>
  );
}
