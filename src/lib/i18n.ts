import ui from "@/../content/en/ui.json";

/**
 * Locale plumbing, NFR-15.
 *
 * The site ships in English and is built so that adding a second language is a
 * content task rather than an engineering one. That is the whole of what
 * "readiness" buys, and it is worth being precise about what it does and does
 * not include: there is no translation here, and no machinery pretending there
 * might be.
 *
 * The dictionary is imported rather than read from disk, so it is typechecked
 * against every call site and a missing key is a build error rather than a
 * blank space on a page. `Dictionary` is derived from the English file, which
 * makes English the schema — a German file missing a key will not compile.
 */

export const LOCALES = ["en"] as const;
export const DEFAULT_LOCALE = "en" satisfies Locale;

export type Locale = (typeof LOCALES)[number];
export type Dictionary = typeof ui;

const DICTIONARIES: Record<Locale, Dictionary> = { en: ui };

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

export function getDictionary(locale: Locale = DEFAULT_LOCALE): Dictionary {
  return DICTIONARIES[locale] ?? DICTIONARIES[DEFAULT_LOCALE];
}

/**
 * The BCP 47 tags that go in `lang` and `hreflang`.
 *
 * `en-GB` rather than `en`: the copy is British — "£", "organisation",
 * "colour" — and a screen reader pronouncing it in American English is a small
 * but real wrongness that costs nothing to avoid.
 */
export const LOCALE_TAGS: Record<Locale, string> = { en: "en-GB" };

/**
 * The `alternates.languages` map for a path, which is what emits hreflang.
 *
 * With one locale this produces a single self-referential entry, which is
 * correct rather than pointless: it tells a crawler the page's language
 * explicitly instead of leaving it to be guessed from the content.
 */
export function languageAlternates(path: string): Record<string, string> {
  return Object.fromEntries(
    LOCALES.map((locale) => [
      LOCALE_TAGS[locale],
      locale === DEFAULT_LOCALE ? path : `/${locale}${path}`,
    ]),
  );
}
