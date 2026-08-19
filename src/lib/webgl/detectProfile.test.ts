import { describe, expect, it } from "vitest";

import {
  type Capabilities,
  FrameRateMonitor,
  MIN_SAMPLES,
  PROFILE_SETTINGS,
  STALL_THRESHOLD_MS,
  isSoftwareRenderer,
  selectProfile,
  stepDown,
} from "./detectProfile";

/** Feeds `count` frames of exactly `deltaMs`, returning true if it fired. */
function feedFrames(
  monitor: FrameRateMonitor,
  deltaMs: number,
  count: number,
) {
  let fired = false;
  for (let i = 0; i < count; i += 1) fired = monitor.push(deltaMs) || fired;
  return fired;
}

const CAPABLE: Capabilities = {
  webgl2: true,
  maxTextureSize: 16_384,
  renderer: "Apple M1",
  deviceMemory: 8,
  hardwareConcurrency: 8,
};

describe("selectProfile", () => {
  it("gives a capable machine the high profile", () => {
    expect(selectProfile(CAPABLE)).toBe("high");
  });

  it("falls back without WebGL2", () => {
    expect(selectProfile({ ...CAPABLE, webgl2: false })).toBe("fallback");
  });

  it("falls back below the 4096 texture-size floor, NFR-07", () => {
    expect(selectProfile({ ...CAPABLE, maxTextureSize: 2048 })).toBe("fallback");
    expect(selectProfile({ ...CAPABLE, maxTextureSize: 4096 })).toBe("high");
  });

  it("steps down on low memory, edge case E4", () => {
    expect(selectProfile({ ...CAPABLE, deviceMemory: 2 })).toBe("medium");
    expect(selectProfile({ ...CAPABLE, deviceMemory: 4 })).toBe("high");
  });

  it("steps down on four cores or fewer, edge case E4", () => {
    expect(selectProfile({ ...CAPABLE, hardwareConcurrency: 4 })).toBe("medium");
    expect(selectProfile({ ...CAPABLE, hardwareConcurrency: 5 })).toBe("high");
  });

  it("does not step down when the browser withholds the hints", () => {
    // Safari and Firefox report neither deviceMemory nor hardwareConcurrency.
    // Absence must not be read as a low-end device.
    const withoutHints: Capabilities = {
      webgl2: true,
      maxTextureSize: 16_384,
      renderer: "Apple M1",
    };
    expect(selectProfile(withoutHints)).toBe("high");
  });

  it("puts a hard failure ahead of a soft one", () => {
    // No WebGL2 and low memory: fallback wins, medium would still mount a canvas.
    expect(
      selectProfile({ ...CAPABLE, webgl2: false, deviceMemory: 2 }),
    ).toBe("fallback");
  });
});

describe("isSoftwareRenderer", () => {
  it.each([
    "Google SwiftShader",
    "llvmpipe (LLVM 15.0.7, 256 bits)",
    "Microsoft Basic Render Driver",
    "Mesa OffScreen",
    "SOFTWARE RASTERIZER",
  ])("detects %s", (renderer) => {
    expect(isSoftwareRenderer(renderer)).toBe(true);
    expect(selectProfile({ ...CAPABLE, renderer })).toBe("fallback");
  });

  it.each([
    "Apple M1",
    "NVIDIA GeForce RTX 3060",
    "ANGLE (Intel, Intel(R) Iris(R) Xe Graphics, D3D11)",
    "Adreno (TM) 640",
  ])("does not flag %s", (renderer) => {
    expect(isSoftwareRenderer(renderer)).toBe(false);
  });

  it("treats ANGLE as normal, since it says nothing about the hardware", () => {
    expect(
      selectProfile({
        ...CAPABLE,
        renderer: "ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11)",
      }),
    ).toBe("high");
  });

  it("but still catches SwiftShader behind ANGLE", () => {
    expect(
      isSoftwareRenderer("ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device))"),
    ).toBe(true);
  });

  it("handles a missing renderer string", () => {
    expect(isSoftwareRenderer(null)).toBe(false);
    expect(selectProfile({ ...CAPABLE, renderer: null })).toBe("high");
  });
});

describe("profile settings", () => {
  it("matches the corrected §7.4 geometry ladder", () => {
    expect(PROFILE_SETTINGS.high.detail).toBe(48);
    expect(PROFILE_SETTINGS.medium.detail).toBe(24);
  });

  it("drops 120k points to 24k on the medium profile, edge case E4", () => {
    expect(PROFILE_SETTINGS.high.points).toBe(120_000);
    expect(PROFILE_SETTINGS.medium.points).toBe(24_000);
  });

  it("caps device pixel ratio at 1.5 on medium and 2 on high, §9", () => {
    expect(PROFILE_SETTINGS.high.dpr).toEqual([1, 2]);
    expect(PROFILE_SETTINGS.medium.dpr).toEqual([1, 1.5]);
  });

  it("disables post-processing below the high profile", () => {
    expect(PROFILE_SETTINGS.high.postProcessing).toBe(true);
    expect(PROFILE_SETTINGS.medium.postProcessing).toBe(false);
  });
});

describe("stepDown", () => {
  it("walks high to medium to fallback and stops", () => {
    expect(stepDown("high")).toBe("medium");
    expect(stepDown("medium")).toBe("fallback");
    expect(stepDown("fallback")).toBe("fallback");
  });
});

describe("FrameRateMonitor", () => {
  const feed = (monitor: FrameRateMonitor, fps: number, seconds: number) => {
    const delta = 1000 / fps;
    let tripped = false;
    for (let t = 0; t < seconds * 1000; t += delta) {
      if (monitor.push(delta)) tripped = true;
    }
    return tripped;
  };

  it("stays quiet at 60 fps", () => {
    expect(feed(new FrameRateMonitor(), 60, 10)).toBe(false);
  });

  it("stays quiet at 50 fps, above the 45 fps floor", () => {
    expect(feed(new FrameRateMonitor(), 50, 10)).toBe(false);
  });

  it("trips below 45 fps, FR-11", () => {
    expect(feed(new FrameRateMonitor(), 30, 10)).toBe(true);
  });

  it("does not trip before the window has filled", () => {
    const monitor = new FrameRateMonitor(3000, 45);
    // Two seconds of terrible frames is not yet three seconds of evidence.
    expect(feed(monitor, 10, 2)).toBe(false);
  });

  it("ignores non-positive deltas", () => {
    const monitor = new FrameRateMonitor();
    expect(monitor.push(0)).toBe(false);
    expect(monitor.push(-16)).toBe(false);
  });

  it("recovers after reset", () => {
    const monitor = new FrameRateMonitor();
    feed(monitor, 20, 10);
    monitor.reset();
    expect(feed(monitor, 60, 1)).toBe(false);
  });

  it("reports nothing until it has enough samples to mean anything", () => {
    const monitor = new FrameRateMonitor();
    expect(monitor.reading()).toBeNull();
    feedFrames(monitor, 16, MIN_SAMPLES - 1);
    expect(monitor.reading()).toBeNull();
  });

  it("reports the mean of a steady window", () => {
    const monitor = new FrameRateMonitor();
    feed(monitor, 60, 10);
    expect(monitor.reading()?.mean).toBeCloseTo(60, 5);
  });

  it("separates the worst frame from the mean", () => {
    // The case the readout exists for: a window that averages comfortably while
    // containing a frame nobody would call smooth.
    const monitor = new FrameRateMonitor();
    feedFrames(monitor, 16, 200);
    monitor.push(100);

    const reading = monitor.reading();
    expect(reading?.mean).toBeGreaterThan(45);
    expect(reading?.worst).toBeCloseTo(10, 5);
  });
});

describe("FrameRateMonitor tolerates stalls", () => {
  it("does not degrade a healthy machine because of one long first frame", () => {
    // The Phase 5 regression: with frameloop="never" the clock starts before
    // the first advance, so frame one spans hundreds of milliseconds. That
    // single sample used to drag a window of 16ms frames under the threshold.
    const monitor = new FrameRateMonitor();
    expect(monitor.push(820)).toBe(false);
    expect(feedFrames(monitor, 16, 400)).toBe(false);
  });

  it("discards the window on a stall rather than counting it", () => {
    const monitor = new FrameRateMonitor();
    feedFrames(monitor, 16, 100);
    expect(monitor.push(STALL_THRESHOLD_MS + 1)).toBe(false);
    // Window restarted, so a verdict needs a fresh full window.
    expect(feedFrames(monitor, 16, 10)).toBe(false);
  });

  it("still catches sustained slowness", () => {
    const monitor = new FrameRateMonitor();
    // 40ms frames are 25fps: genuinely below the 45fps floor, and plausible.
    expect(feedFrames(monitor, 40, 200)).toBe(true);
  });

  it("waits for enough samples before concluding", () => {
    // A window can be filled by very few very long frames. Those are stalls in
    // aggregate, not a measurement.
    const monitor = new FrameRateMonitor();
    const justUnderStall = STALL_THRESHOLD_MS - 1;
    const enoughToFillWindow = Math.ceil(3000 / justUnderStall);
    expect(enoughToFillWindow).toBeLessThan(MIN_SAMPLES);
    expect(feedFrames(monitor, justUnderStall, enoughToFillWindow)).toBe(false);
  });

  it("recovers and can still fire after a stall", () => {
    const monitor = new FrameRateMonitor();
    monitor.push(5000);
    expect(feedFrames(monitor, 40, 200)).toBe(true);
  });
});
