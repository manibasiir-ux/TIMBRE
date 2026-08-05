import { describe, expect, it } from "vitest";

import {
  DEFAULT_LOCALE,
  LOCALES,
  LOCALE_TAGS,
  getDictionary,
  isLocale,
  languageAlternates,
} from "./i18n";

/**
 * NFR-15. Most of this requirement is about being able to add a language later;
 * these are the parts that can be wrong today.
 */

describe("locales", () => {
  it("has a default that is one of the locales", () => {
    expect(LOCALES).toContain(DEFAULT_LOCALE);
  });

  it("gives every locale a BCP 47 tag", () => {
    for (const locale of LOCALES) {
      expect(LOCALE_TAGS[locale]).toMatch(/^[a-z]{2}(-[A-Z]{2})?$/);
    }
  });

  it("recognises its own locales and nothing else", () => {
    expect(isLocale("en")).toBe(true);
    expect(isLocale("de")).toBe(false);
    // A path segment is a plausible thing to be handed by mistake.
    expect(isLocale("work")).toBe(false);
  });

  it("falls back rather than returning undefined", () => {
    // A missing dictionary must degrade to English, not to a page of blanks.
    expect(getDictionary("en" as never)).toBeDefined();
    expect(getDictionary(undefined as never)).toBeDefined();
  });
});

describe("hreflang", () => {
  it("maps the default locale to the unprefixed path", () => {
    // The default is rewritten away, so its alternate is the bare path. Getting
    // this wrong points every hreflang at a URL that does not exist.
    expect(languageAlternates("/work")).toEqual({ "en-GB": "/work" });
  });
});

describe("the dictionary", () => {
  const dictionary = getDictionary();

  it("has no empty strings", () => {
    // An empty value renders as a gap that looks like a layout bug rather than
    // a missing translation, which is how they survive review.
    const walk = (node: unknown, path: string): void => {
      if (typeof node === "string") {
        expect(node.trim(), `${path} is empty`).not.toBe("");
        return;
      }
      if (Array.isArray(node)) {
        node.forEach((item, index) => walk(item, `${path}[${index}]`));
        return;
      }
      if (node && typeof node === "object") {
        for (const [key, value] of Object.entries(node)) {
          if (key.startsWith("_")) continue;
          walk(value, `${path}.${key}`);
        }
      }
    };

    walk(dictionary, "ui");
  });

  it("keeps every visible label short enough to survive German", () => {
    /**
     * The clause that catches real bugs: German runs about 35% longer than
     * English, and the strings that break layouts are the short ones in fixed
     * space — buttons, channel labels, transport controls — not the prose.
     *
     * 24 characters is the budget for a control, measured from the widest the
     * transport bar accommodates at 375px before the row wraps.
     *
     * Only `labels` is checked. The first version of this swept accessible
     * names in too and failed on "Mixing desk navigation", which is announced
     * and never rendered — it has no width to overflow. That was the test
     * being wrong rather than the copy, and the fix was to make the
     * distinction visible in the dictionary rather than to widen the budget
     * until the failure went away.
     */
    const CONTROL_BUDGET = 24;
    const GERMAN_EXPANSION = 1.35;

    const visible = Object.values(dictionary.labels).flatMap((group) =>
      Object.values(group),
    );

    for (const label of visible) {
      const projected = Math.ceil(label.length * GERMAN_EXPANSION);
      expect(
        projected,
        `"${label}" projects to ${projected} characters in German, over the ${CONTROL_BUDGET} a control has room for`,
      ).toBeLessThanOrEqual(CONTROL_BUDGET);
    }
  });

  it("does not budget accessible names", () => {
    // They are announced, never laid out. A screen-reader name that is clear
    // and long is better than one that is short and ambiguous, and the roadmap
    // records a bare "forty" from a fader as one of eleven serious defects.
    expect(dictionary.a11y.deskLabel.length).toBeGreaterThan(20);
  });
});
