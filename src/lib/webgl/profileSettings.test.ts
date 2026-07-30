import { describe, expect, it } from "vitest";

import {
  PROFILE_SETTINGS,
  type RenderProfile,
  stepDown,
} from "./detectProfile";

/**
 * Invariants over the render profiles.
 *
 * These are not restatements of the table. They encode what was measured on real
 * hardware (an Intel HD Graphics 620, rendering the §7.4 shader with GPU work
 * forced to completion): a 6.8x increase in triangle count cost under 1.5 ms,
 * while doubling resolution cost roughly 2.3x. The work is fill-rate bound, so a
 * profile that reduced geometry without reducing DPR would be spending its
 * budget on the lever that barely moves. The DPR assertion below is the one that
 * would catch that mistake.
 */

const ORDERED: RenderProfile[] = ["high", "medium", "fallback"];

describe("render profile settings", () => {
  it("covers every profile", () => {
    for (const profile of ORDERED) {
      expect(PROFILE_SETTINGS[profile]).toBeDefined();
    }
  });

  it("lowers the DPR ceiling at every step down", () => {
    for (let i = 1; i < ORDERED.length; i += 1) {
      const previous = PROFILE_SETTINGS[ORDERED[i - 1]].dpr[1];
      const current = PROFILE_SETTINGS[ORDERED[i]].dpr[1];
      expect(current).toBeLessThan(previous);
    }
  });

  it("never lets the DPR floor exceed its ceiling", () => {
    for (const profile of ORDERED) {
      const [min, max] = PROFILE_SETTINGS[profile].dpr;
      expect(min).toBeLessThanOrEqual(max);
      expect(min).toBeGreaterThan(0);
    }
  });

  it("reduces geometry monotonically", () => {
    for (let i = 1; i < ORDERED.length; i += 1) {
      expect(PROFILE_SETTINGS[ORDERED[i]].detail).toBeLessThan(
        PROFILE_SETTINGS[ORDERED[i - 1]].detail,
      );
    }
  });

  it("keeps high-profile geometry within the measured budget", () => {
    // 20 faces subdivided into (detail + 1)^2. At detail 48 that is 48,020
    // triangles, measured at 3.40 ms of a 16.67 ms frame at 1280x720.
    const detail = PROFILE_SETTINGS.high.detail;
    const triangles = 20 * (detail + 1) ** 2;
    expect(triangles).toBeLessThanOrEqual(50_000);
  });

  it("disables post-processing below the high profile", () => {
    expect(PROFILE_SETTINGS.medium.postProcessing).toBe(false);
    expect(PROFILE_SETTINGS.fallback.postProcessing).toBe(false);
  });

  it("renders nothing on the fallback profile", () => {
    expect(PROFILE_SETTINGS.fallback.detail).toBe(0);
    expect(PROFILE_SETTINGS.fallback.points).toBe(0);
  });

  it("always terminates at fallback when stepping down repeatedly", () => {
    let profile: RenderProfile = "high";
    for (let i = 0; i < 10; i += 1) profile = stepDown(profile);
    expect(profile).toBe("fallback");
  });
});
