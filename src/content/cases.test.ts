import { describe, expect, it } from "vitest";

import { STEMS } from "@/lib/audio/manifest";
import {
  CASES,
  PACKAGES,
  SECTORS,
  caseBySlug,
  casesInSector,
  nextCase,
  populatedSectors,
  stemFor,
} from "./cases";

describe("case study content", () => {
  it("uses unique slugs", () => {
    expect(new Set(CASES.map((c) => c.slug)).size).toBe(CASES.length);
  });

  it("uses slugs that are URL-safe", () => {
    for (const entry of CASES) {
      expect(entry.slug).toMatch(/^[a-z0-9-]+$/);
    }
  });

  it("only claims sectors and packages the site can filter by", () => {
    for (const entry of CASES) {
      expect(SECTORS).toContain(entry.sector);
      expect(PACKAGES).toContain(entry.tier);
    }
  });

  it("gives every case the three context players §6.3 requires", () => {
    for (const entry of CASES) {
      expect(entry.contexts).toHaveLength(3);
      expect(new Set(entry.contexts.map((c) => c.id)).size).toBe(3);
    }
  });

  it("gives every case at least one inventory item and one metric", () => {
    for (const entry of CASES) {
      expect(entry.inventory.length).toBeGreaterThan(0);
      expect(entry.results.length).toBeGreaterThan(0);
      expect(entry.credits.length).toBeGreaterThan(0);
    }
  });

  it("states a real loudness target on every asset", () => {
    // A delivered asset without a loudness figure is the thing §6.6 exists to
    // stop happening.
    for (const entry of CASES) {
      for (const item of entry.inventory) {
        expect(item.lufs).toBeLessThan(0);
        expect(item.lufs).toBeGreaterThan(-40);
        expect(item.seconds).toBeGreaterThan(0);
        expect(item.format).not.toBe("");
      }
    }
  });

  it("only points at stems that exist in the audio manifest", () => {
    // A case referencing a stem with no file would fail silently at runtime:
    // the row would look playable and do nothing.
    for (const entry of CASES) {
      if (entry.stem === null) continue;
      expect(STEMS[entry.stem]).toBeDefined();
      expect(stemFor(entry)).not.toBeNull();
    }
  });
});

describe("case lookups", () => {
  it("finds a case by slug and returns undefined otherwise", () => {
    expect(caseBySlug(CASES[0].slug)?.client).toBe(CASES[0].client);
    expect(caseBySlug("no-such-case")).toBeUndefined();
  });

  it("filters by sector, and All returns everything", () => {
    expect(casesInSector("All")).toHaveLength(CASES.length);
    for (const sector of populatedSectors()) {
      const filtered = casesInSector(sector);
      expect(filtered.length).toBeGreaterThan(0);
      expect(filtered.every((c) => c.sector === sector)).toBe(true);
    }
  });

  it("only offers sectors that have work behind them", () => {
    // An empty filter chip is a dead control.
    for (const sector of populatedSectors()) {
      expect(casesInSector(sector).length).toBeGreaterThan(0);
    }
  });

  it("wraps at the end so Next Project is never a dead link", () => {
    const last = CASES[CASES.length - 1];
    expect(nextCase(last.slug).slug).toBe(CASES[0].slug);
  });

  it("never points a case at itself", () => {
    for (const entry of CASES) {
      expect(nextCase(entry.slug).slug).not.toBe(entry.slug);
    }
  });
});
