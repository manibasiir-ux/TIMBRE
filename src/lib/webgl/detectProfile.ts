/**
 * Render capability probe, NFR-07 and FR-10.
 *
 * Runs before the canvas mounts and picks one of three profiles. The decision
 * is split into a pure `selectProfile` over a plain capability object and an
 * impure `detectProfile` that gathers the real values, so the rules can be
 * tested without a GPU — which matters here, because CI runs in a container
 * where WebGL is software-rendered and would always take the fallback branch.
 */

export type RenderProfile = "high" | "medium" | "fallback";

export type Capabilities = {
  webgl2: boolean;
  maxTextureSize: number;
  /** UNMASKED_RENDERER_WEBGL, when the extension is available. */
  renderer: string | null;
  /** navigator.deviceMemory, in GB. Absent outside Chromium. */
  deviceMemory?: number;
  hardwareConcurrency?: number;
};

/**
 * Substrings identifying a CPU rasteriser pretending to be a GPU. Running the
 * sculpture on one of these produces single-digit frame rates, so they go
 * straight to the pre-rendered fallback.
 *
 * "angle" is deliberately absent: ANGLE is the normal translation layer on
 * Windows and says nothing about the underlying hardware.
 */
const SOFTWARE_RENDERERS = [
  "swiftshader",
  "llvmpipe",
  "softpipe",
  "software rasterizer",
  "microsoft basic render",
  "mesa offscreen",
] as const;

export function isSoftwareRenderer(renderer: string | null): boolean {
  if (!renderer) return false;
  const value = renderer.toLowerCase();
  return SOFTWARE_RENDERERS.some((name) => value.includes(name));
}

/** Geometry and DPR budget per profile. Starting points, to be tuned on real hardware. */
export const PROFILE_SETTINGS: Record<
  RenderProfile,
  { detail: number; points: number; dpr: [number, number]; postProcessing: boolean }
> = {
  high: { detail: 48, points: 120_000, dpr: [1, 2], postProcessing: true },
  medium: { detail: 24, points: 24_000, dpr: [1, 1.5], postProcessing: false },
  fallback: { detail: 0, points: 0, dpr: [1, 1], postProcessing: false },
};

export function selectProfile(caps: Capabilities): RenderProfile {
  if (!caps.webgl2) return "fallback";
  if (caps.maxTextureSize < 4096) return "fallback";
  if (isSoftwareRenderer(caps.renderer)) return "fallback";

  // Edge case E4: a low-memory or low-core device runs the reduced profile from
  // the start rather than waiting for the frame-rate monitor to catch it.
  if (caps.deviceMemory !== undefined && caps.deviceMemory < 4) return "medium";
  if (caps.hardwareConcurrency !== undefined && caps.hardwareConcurrency <= 4) {
    return "medium";
  }

  return "high";
}

export const PROFILE_CACHE_KEY = "timbre.webgl.profile";

export function readCapabilities(): Capabilities {
  const canvas = document.createElement("canvas");
  const gl = canvas.getContext("webgl2");

  if (!gl) {
    return { webgl2: false, maxTextureSize: 0, renderer: null };
  }

  let renderer: string | null = null;
  const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
  if (debugInfo) {
    const value = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
    renderer = typeof value === "string" ? value : null;
  }

  const caps: Capabilities = {
    webgl2: true,
    maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE) as number,
    renderer,
    deviceMemory: (navigator as Navigator & { deviceMemory?: number })
      .deviceMemory,
    hardwareConcurrency: navigator.hardwareConcurrency,
  };

  // Probing costs a real GL context. Release it rather than leaving it to the
  // driver, since browsers cap how many a page may hold.
  gl.getExtension("WEBGL_lose_context")?.loseContext();

  return caps;
}

/** Probes once per tab and caches the answer for the session. */
export function detectProfile(): RenderProfile {
  if (typeof window === "undefined") return "fallback";

  try {
    const cached = sessionStorage.getItem(PROFILE_CACHE_KEY);
    if (cached === "high" || cached === "medium" || cached === "fallback") {
      return cached;
    }
  } catch {
    // Private browsing modes can throw on storage access. Not fatal: the probe
    // simply runs again.
  }

  let profile: RenderProfile;
  try {
    profile = selectProfile(readCapabilities());
  } catch {
    profile = "fallback";
  }

  try {
    sessionStorage.setItem(PROFILE_CACHE_KEY, profile);
  } catch {
    // Same as above.
  }

  return profile;
}

/**
 * Frame-rate step-down, FR-11 and edge case E5. Feed it frame durations; it
 * reports when the rolling mean over `windowMs` drops below `minFps`.
 */
export class FrameRateMonitor {
  private samples: number[] = [];
  private elapsed = 0;

  constructor(
    private readonly windowMs = 3000,
    private readonly minFps = 45,
  ) {}

  /** @param deltaMs milliseconds since the previous frame. */
  push(deltaMs: number): boolean {
    if (deltaMs <= 0) return false;

    this.samples.push(deltaMs);
    this.elapsed += deltaMs;

    // Drop the oldest sample only while doing so still leaves a full window
    // covered. Trimming down to `elapsed <= windowMs` instead would make the
    // check below unreachable, because the window would never be complete at
    // the moment it is measured.
    while (
      this.samples.length > 1 &&
      this.elapsed - this.samples[0] >= this.windowMs
    ) {
      this.elapsed -= this.samples.shift() as number;
    }

    if (this.elapsed < this.windowMs) return false;

    const meanDelta = this.elapsed / this.samples.length;
    return 1000 / meanDelta < this.minFps;
  }

  reset(): void {
    this.samples = [];
    this.elapsed = 0;
  }
}

export function stepDown(profile: RenderProfile): RenderProfile {
  if (profile === "high") return "medium";
  return "fallback";
}
