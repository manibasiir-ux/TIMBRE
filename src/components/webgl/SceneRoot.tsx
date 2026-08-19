"use client";

import { PerspectiveCamera } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { caseBySlug } from "@/content/cases";
import { onSculptureRenderRequest } from "@/lib/motion/sculptureRender";
import { onTick } from "@/lib/motion/ticker";
import { usePrefersReducedMotion } from "@/lib/usePrefersReducedMotion";
import {
  FrameRateMonitor,
  PROFILE_SETTINGS,
  type RenderProfile,
  detectProfile,
  stepDown,
} from "@/lib/webgl/detectProfile";
import {
  BASE_CAMERA_Z,
  cameraDistanceForAspect,
} from "@/lib/webgl/sculptureTuning";
import { useExperience } from "@/store/useExperience";

import { HeroFallback } from "./HeroFallback";
import { SoundSculpture } from "./SoundSculpture";

/**
 * The single canvas, FR-05.
 *
 * Mounted once at the root and never unmounted, so a route change is a wipe over
 * a scene that never stopped rendering rather than a WebGL context teardown and
 * rebuild. Everything it reacts to arrives through the experience store or the
 * analyser ref, never through props, because it has no route to take props from.
 */

/**
 * Feeds real frame deltas to the rolling monitor and degrades once, FR-11 / E5.
 *
 * Lives inside the Canvas because useFrame only exists within it, and reports
 * outward through a callback rather than touching the store directly, so the
 * policy stays with SceneRoot and this stays a sensor.
 */
/**
 * Holds the sculpture at a constant fraction of the viewport whatever its shape,
 * so the signal calibration in sculptureTuning stays true off 16:9. The maths
 * and the measurements behind it live with that calibration.
 *
 * Declared rather than mutated: reaching into the camera returned by useThree
 * and assigning position.z works, but it writes to state React owns, and the
 * compiler is right to reject it. Rendering the camera lets reconciliation
 * apply the change.
 */
function ResponsiveCamera() {
  const size = useThree((state) => state.size);
  const distance =
    size.height > 0
      ? cameraDistanceForAspect(size.width / size.height)
      : BASE_CAMERA_Z;

  return <PerspectiveCamera makeDefault fov={42} position={[0, 0, distance]} />;
}

/**
 * Hands the render loop to the shared ticker, risk R4.
 *
 * The canvas runs with frameloop="never" and is advanced from the same clock
 * that drives Lenis and GSAP, so scroll position, timeline progress and what is
 * on screen are all resolved from one timestamp. Left on its own loop, R3F
 * would render at a slightly different moment from the scrub that positions it,
 * which is the jitter the roadmap describes chasing for a week.
 */
function TickerBridge() {
  const advance = useThree((state) => state.advance);

  useEffect(
    () => onTick((_deltaMs, timeSeconds) => advance(timeSeconds * 1000)),
    [advance],
  );

  return null;
}

/**
 * Renders a frame on request, for the reduced-motion `frameloop="demand"` path.
 *
 * The manifesto's recede and a route reset are discrete events that change what
 * the canvas should show without producing a frame. This is the only place that
 * knows about `invalidate`, which keeps three.js out of the initial chunk — see
 * sculptureRender.
 *
 * It renders once when it subscribes, because the canvas is lazily mounted and
 * client-only: a request made while it did not exist would otherwise be lost,
 * and the very first paint is exactly when that happens.
 */
function RenderRequestBridge() {
  const invalidate = useThree((state) => state.invalidate);

  useEffect(() => {
    invalidate();
    return onSculptureRenderRequest(() => invalidate());
  }, [invalidate]);

  return null;
}

function PerformanceGuard({ onDegrade }: { onDegrade: () => void }) {
  const monitor = useMemo(() => new FrameRateMonitor(), []);
  const fired = useRef(false);

  useFrame((_, delta) => {
    if (fired.current) return;
    if (monitor.push(delta * 1000)) {
      fired.current = true;
      onDegrade();
    }
  });

  return null;
}

/**
 * An on-screen frame-rate reading, opt-in with `?fps=1`.
 *
 * FR-11 puts a 30 fps floor on mid-tier mobile, and the site already had the
 * machinery to act on frame rate — PerformanceGuard above degrades the profile
 * below 45 — but no way for a person to read the number. "Checked by hand on a
 * real phone and it behaves" is an impression, not a measurement, and a phone
 * cannot be hung off a profiler as casually as a desktop can. Appending a query
 * parameter is something the owner of the phone can do.
 *
 * Absent unless the URL asks for it, so a normal visit pays nothing for it.
 *
 * Written straight to the DOM rather than through state. Four React renders a
 * second to display a performance number would mean measuring the instrument
 * along with the thing.
 */
function FrameRateReadout({
  onSample,
}: {
  onSample: (text: string) => void;
}) {
  const monitor = useMemo(() => new FrameRateMonitor(), []);
  const sincePaint = useRef(0);

  useFrame((_, delta) => {
    const deltaMs = delta * 1000;
    monitor.push(deltaMs);

    sincePaint.current += deltaMs;
    if (sincePaint.current < 250) return;
    sincePaint.current = 0;

    const reading = monitor.reading();
    onSample(
      reading
        ? `${Math.round(reading.mean)} fps · worst ${Math.round(reading.worst)}`
        : "measuring",
    );
  });

  return null;
}

export default function SceneRoot() {
  // Probed in a lazy initialiser, not an effect. This component is imported with
  // ssr: false so it only ever runs on the client, and deciding on first render
  // avoids painting one frame of the wrong profile.
  const [profile, setProfile] = useState<RenderProfile>(() => detectProfile());
  const reducedMotion = usePrefersReducedMotion();
  // Read once at mount rather than defaulting to true: a tab restored from the
  // background, or opened in the background, is already hidden and would
  // otherwise never receive a visibilitychange event to correct the assumption.
  const [documentVisible, setDocumentVisible] = useState(
    () => !document.hidden,
  );

  // Read once from the URL rather than watched: a reading that appeared and
  // vanished as the query string changed would be a distraction, and this is
  // only ever switched on deliberately at load.
  const [showFrameRate] = useState(
    () => new URLSearchParams(window.location.search).has("fps"),
  );
  const frameRateNode = useRef<HTMLParagraphElement>(null);

  const publishProfile = useExperience((state) => state.setProfile);
  const activeCase = useExperience((state) => state.activeCase);

  useEffect(() => {
    publishProfile(profile);
  }, [profile, publishProfile]);

  // Edge case E9. The audio context suspends itself in AudioEngine; this is the
  // render half, stopping the loop rather than burning GPU on a hidden tab.
  useEffect(() => {
    const onVisibilityChange = () => setDocumentVisible(!document.hidden);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", onVisibilityChange);
  }, []);

  const degrade = useCallback(() => {
    setProfile((current) => stepDown(current));
  }, []);

  const showFrameRateSample = useCallback((text: string) => {
    const node = frameRateNode.current;
    if (node) node.textContent = text;
  }, []);

  if (profile === "fallback") return <HeroFallback />;

  const settings = PROFILE_SETTINGS[profile];

  // "never" is not "stopped": with motion enabled the TickerBridge below
  // advances the canvas from the shared clock. Reduced motion renders on demand
  // instead, because the pose is fixed and a loop would redraw an identical
  // image. A hidden tab gets neither (E9).
  const driveFromTicker = documentVisible && !reducedMotion;
  const frameloop = reducedMotion && documentVisible ? "demand" : "never";

  // The store holds a slug; a screen reader should hear the client's name.
  const description = activeCase
    ? `Abstract sound sculpture reacting to the ${caseBySlug(activeCase)?.client ?? activeCase} sonic identity.`
    : "Abstract sound sculpture reacting to the TIMBRE showreel.";

  return (
    <>
      <div
        className="pointer-events-none fixed inset-0 z-0"
        role="img"
        aria-label={description}
      >
        <Canvas
          dpr={settings.dpr}
          frameloop={frameloop}
          camera={{ position: [0, 0, BASE_CAMERA_Z], fov: 42 }}
          gl={{
            antialias: profile === "high",
            powerPreference: "high-performance",
          }}
          // §10: the canvas itself carries no information and is never focusable.
          // The container above holds the accessible name.
          onCreated={({ gl }) => {
            gl.domElement.setAttribute("aria-hidden", "true");
            gl.domElement.setAttribute("tabindex", "-1");
          }}
        >
          <ResponsiveCamera />
          <SoundSculpture
            detail={settings.detail}
            reducedMotion={reducedMotion}
          />
          <RenderRequestBridge />
          {driveFromTicker && <TickerBridge />}
          {driveFromTicker && <PerformanceGuard onDegrade={degrade} />}
          {showFrameRate && <FrameRateReadout onSample={showFrameRateSample} />}
        </Canvas>

      {/* Hero vignette, the role §3 assigns to --color-ground-deep. Settles the
          sculpture into the page rather than letting it float as a bright object
          on a flat field, and darkens the edges where content sits. */}
      <div
          className="pointer-events-none absolute inset-0"
          aria-hidden="true"
          style={{
            background:
              "radial-gradient(115% 85% at 50% 42%, transparent 0%, transparent 38%, rgb(5 5 6 / 0.45) 72%, rgb(5 5 6 / 0.8) 100%)",
          }}
        />
      </div>

      {/* Outside the container above, which sits at z-0 and so would bury this
          under the page. Diagnostic rather than content, hence aria-hidden: a
          number ticking four times a second is nothing a screen reader should
          be made to read out. */}
      {showFrameRate && (
        <p
          ref={frameRateNode}
          aria-hidden="true"
          className="pointer-events-none fixed right-3 bottom-3 z-[9500] bg-ground/85 px-3 py-2 font-mono text-mono-xs text-signal tabular-nums"
        >
          measuring
        </p>
      )}
    </>
  );
}
