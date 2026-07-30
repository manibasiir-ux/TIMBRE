"use client";

import { PerspectiveCamera } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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

  if (profile === "fallback") return <HeroFallback />;

  const settings = PROFILE_SETTINGS[profile];

  // Reduced motion renders one frame and then only on demand: the pose is fixed,
  // so a continuous loop would cost power to redraw an identical image.
  const frameloop = !documentVisible
    ? "never"
    : reducedMotion
      ? "demand"
      : "always";

  const description = activeCase
    ? `Abstract sound sculpture reacting to the ${activeCase} sonic identity.`
    : "Abstract sound sculpture reacting to the TIMBRE showreel.";

  return (
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
        {!reducedMotion && <PerformanceGuard onDegrade={degrade} />}
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
  );
}
