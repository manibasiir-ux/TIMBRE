"use client";

import { Icosahedron } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

import { SMOOTHING, lerp } from "@/lib/audio/bands";
import { useAudioAnalyser } from "@/lib/audio/useAudioAnalyser";
import { PALETTE } from "@/lib/color/palette";
import { SNOISE } from "@/lib/glsl/snoise";
import {
  DISPLACEMENT,
  SCULPTURE_RADIUS,
  SIGNAL_RAMP,
} from "@/lib/webgl/sculptureTuning";

/**
 * The sound sculpture, specification §7.4 and FR-03.
 *
 * Vertex displacement is driven by the analyser's three bands: bass swells the
 * whole form, mids ripple a standing wave up its vertical axis, highs lift the
 * surface uniformly. The fragment shader reads the displacement back and mixes
 * toward signal yellow, so the parts of the object that are moving are the parts
 * that glow — the accent marks the thing making sound, per §3.1.
 *
 * Uniforms are mutated in place rather than passed as React props. A prop change
 * per frame would reconcile the tree sixty times a second; writing straight into
 * the uniform objects skips React entirely, which is the whole reason the
 * analyser hands back a ref.
 */

const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uLow;
  uniform float uMid;
  uniform float uHigh;
  uniform float uGain;

  varying float vDisp;

  ${SNOISE}

  void main() {
    vec3 p = position;

    float n = snoise(p * 1.7 + uTime * 0.18);
    float disp = n * (${DISPLACEMENT.base} + uLow * ${DISPLACEMENT.lowGain}) * uGain
               + sin(p.y * 14.0 + uTime * 3.0) * uMid * ${DISPLACEMENT.midGain}
               + uHigh * ${DISPLACEMENT.highGain};

    vDisp = disp;
    p += normal * disp;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  precision highp float;

  uniform vec3 uBase;
  uniform vec3 uSignal;
  uniform float uMix;

  varying float vDisp;

  void main() {
    float t = smoothstep(${SIGNAL_RAMP.start}, ${SIGNAL_RAMP.end}, vDisp);
    vec3 c = mix(uBase, uSignal, t * uMix);
    gl_FragColor = vec4(c, 1.0);
  }
`;

/**
 * The pose the sculpture holds under prefers-reduced-motion. Chosen so the
 * frozen form still reads as displaced and lit rather than as a bare sphere:
 * §10 asks for "a fixed composed pose", not the animation stopped at frame zero.
 */
const COMPOSED_POSE = { time: 2.4, low: 0.55, mid: 0.4, high: 0.25 } as const;

export type SoundSculptureProps = {
  detail: number;
  gain?: number;
  /** Freezes the form at COMPOSED_POSE and stops rotation. */
  reducedMotion?: boolean;
};

export function SoundSculpture({
  detail,
  gain = 1,
  reducedMotion = false,
}: SoundSculptureProps) {
  const material = useRef<THREE.ShaderMaterial>(null);
  const mesh = useRef<THREE.Mesh>(null);
  const { bands } = useAudioAnalyser();

  const uniforms = useMemo(
    () => ({
      uTime: { value: reducedMotion ? COMPOSED_POSE.time : 0 },
      uLow: { value: reducedMotion ? COMPOSED_POSE.low : 0 },
      uMid: { value: reducedMotion ? COMPOSED_POSE.mid : 0 },
      uHigh: { value: reducedMotion ? COMPOSED_POSE.high : 0 },
      uGain: { value: gain },
      uBase: { value: new THREE.Color(PALETTE.groundLift) },
      uSignal: { value: new THREE.Color(PALETTE.signal) },
      uMix: { value: 1 },
    }),
    [gain, reducedMotion],
  );

  useFrame((_, delta) => {
    if (reducedMotion) return;

    const u = material.current?.uniforms;
    if (!u) return;

    // Clamped because a backgrounded tab can deliver one enormous delta on
    // resume, which would jump the noise field and read as a glitch.
    u.uTime.value += Math.min(delta, 0.1);

    const current = bands.current;
    u.uLow.value = lerp(u.uLow.value, current.low, SMOOTHING.low);
    u.uMid.value = lerp(u.uMid.value, current.mid, SMOOTHING.mid);
    u.uHigh.value = lerp(u.uHigh.value, current.high, SMOOTHING.high);

    if (mesh.current) mesh.current.rotation.y += delta * 0.06;
  });

  return (
    <Icosahedron
      ref={mesh}
      args={[SCULPTURE_RADIUS, detail]}
      rotation={reducedMotion ? [0.2, 0.6, 0] : undefined}
    >
      <shaderMaterial
        ref={material}
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
      />
    </Icosahedron>
  );
}
