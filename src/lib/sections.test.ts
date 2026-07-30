import { describe, expect, it } from "vitest";

import { SECTIONS, channelNumber, faderValueText } from "./sections";

describe("desk channels", () => {
  it("has exactly the seven channels §8 specifies", () => {
    expect(SECTIONS).toHaveLength(7);
    expect(SECTIONS.map((s) => s.label)).toEqual([
      "Home",
      "Work",
      "Services",
      "Studio",
      "Process",
      "Journal",
      "Brief",
    ]);
  });

  it("uses unique ids and hrefs", () => {
    expect(new Set(SECTIONS.map((s) => s.id)).size).toBe(SECTIONS.length);
    expect(new Set(SECTIONS.map((s) => s.href)).size).toBe(SECTIONS.length);
  });

  it("numbers channels 01 through 07", () => {
    expect(SECTIONS.map((_, i) => channelNumber(i))).toEqual([
      "01",
      "02",
      "03",
      "04",
      "05",
      "06",
      "07",
    ]);
  });
});

describe("faderValueText", () => {
  it("names the section and gives the number a unit", () => {
    // A bare "40" is the defect this exists to prevent.
    expect(faderValueText("Work", 0.4)).toBe("Work, 40 percent");
  });

  it("rounds to whole percent", () => {
    expect(faderValueText("Studio", 0.666)).toBe("Studio, 67 percent");
  });

  it("handles both ends", () => {
    expect(faderValueText("Home", 0)).toBe("Home, 0 percent");
    expect(faderValueText("Brief", 1)).toBe("Brief, 100 percent");
  });
});
