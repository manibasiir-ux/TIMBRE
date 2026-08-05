import { afterEach, describe, expect, it, vi } from "vitest";

import { ANALYTICS_EVENTS, buildEvent, track } from "./analytics";

describe("the analytics contract", () => {
  it("covers every event NFR-14 names", () => {
    // Listed explicitly rather than derived, so a rename in one place fails
    // here instead of quietly dropping an event nobody notices is missing.
    expect([...ANALYTICS_EVENTS]).toEqual([
      "audio_consent_granted",
      "audio_consent_declined",
      "reel_played_30s",
      "case_study_audio_play",
      "desk_opened",
      "fader_dragged",
      "pricing_viewed",
      "brief_step_completed",
      "brief_submitted",
      "webgl_profile_selected",
      "perf_stepdown",
    ]);
  });

  it("carries the event, the path and nothing about the person", () => {
    const payload = buildEvent("desk_opened", { source: "keyboard" }, "/work");

    expect(payload).toEqual({
      event: "desk_opened",
      path: "/work",
      props: { source: "keyboard" },
    });

    // NFR-13 promises cookieless measurement. The cheapest way to keep that is
    // to have no field capable of identifying anyone in the first place.
    const serialised = JSON.stringify(payload);
    for (const forbidden of ["id", "uid", "session", "cookie", "fingerprint"]) {
      expect(serialised.toLowerCase()).not.toContain(forbidden);
    }
  });
});

describe("track", () => {
  const original = { ...process.env };

  /**
   * These run under the node environment, where `window` does not exist and
   * `track` therefore returns immediately. Without stubbing it, "does nothing
   * when unconfigured" passes whatever the code does — a test that cannot fail
   * is worse than no test, because it reads as coverage.
   */
  function browser(sendBeacon: (url: string) => boolean) {
    vi.stubGlobal("window", { location: { pathname: "/services" } });
    vi.stubGlobal("navigator", { sendBeacon });
  }

  afterEach(() => {
    process.env = { ...original };
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("does nothing when no endpoint is configured", () => {
    delete process.env.NEXT_PUBLIC_ANALYTICS_URL;
    const sentTo: string[] = [];
    browser((url) => {
      sentTo.push(url);
      return true;
    });

    track("brief_submitted");
    expect(sentTo).toEqual([]);
  });

  it("beacons when one is", () => {
    process.env.NEXT_PUBLIC_ANALYTICS_URL = "https://metrics.test/e";
    const sentTo: string[] = [];
    browser((url) => {
      sentTo.push(url);
      return true;
    });

    track("brief_submitted", { band: "220+" });
    expect(sentTo).toEqual(["https://metrics.test/e"]);
  });

  it("never throws, whatever the transport does", () => {
    // Measurement must not be able to break the thing it measures.
    process.env.NEXT_PUBLIC_ANALYTICS_URL = "https://metrics.test/e";
    browser(() => {
      throw new Error("blocked by an extension");
    });

    expect(() => track("desk_opened")).not.toThrow();
  });
});
