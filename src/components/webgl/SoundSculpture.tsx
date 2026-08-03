"use client";

import { Icosahedron } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

import { SMOOTHING, lerp } from "@/lib/audio/bands";
import { useAudioAnalyser } from "@/lib/audio/useAudioAnalyser";
import { SNOISE } from "@/lib/glsl/snoise";
import { recedeState, sculptureMotion } from "@/lib/motion/sculptureMotion";
import {
  NEUTRAL_IDENTITY,
  SILENT_RGB,
  activeIdentity,
} from "@/lib/webgl/sculptureIdentity";
import { selectAudible, useExperience } from "@/store/useExperience";
import {
  DISPLACEMENT,
  SCULPTURE_RADIUS,
  signalRampFor,
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

// uFrequency and uRipple carry the per-case identity, FR-04. They were the
// literals 1.7 and 1.0 until the work rail needed four distinguishable forms
// out of one geometry; see sculptureIdentity for why the morph is parametric
// rather than a primitive swap.
const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uLow;
  uniform float uMid;
  uniform float uHigh;
  uniform float uGain;
  uniform float uFrequency;
  uniform float uRipple;
  uniform float uSquare;
  uniform float uTaper;
  uniform float uSolid;

  varying float vDisp;

  ${SNOISE}

  /**
   * Where a direction leaves a capped solid of unit half-extent.
   *
   * The solid is described by two numbers: how square its cross-section is, and
   * how far it tapers toward the top. Cube, cylinder, cone and pyramid are the
   * four corners of that pair, and every value between them is a real shape.
   *
   * For a direction d the surface is the nearer of two intersections — the
   * tapered side wall, and the flat cap at y = ±1 — so the whole family reduces
   * to one min(). The side solves
   *
   *   t * radial = 1 - taper * (t * d.y + 1) / 2
   *
   * for t, which is where the ray meets a wall whose radius falls linearly with
   * height. A denominator at or below zero means the ray runs parallel to that
   * wall or away from it, and only the cap applies.
   */
  float solidScale(vec3 d) {
    float round_ = length(d.xz);
    float square = max(abs(d.x), abs(d.z));
    float radial = mix(round_, square, uSquare);

    float denom = radial + uTaper * d.y * 0.5;
    float side = denom > 1e-4 ? (1.0 - uTaper * 0.5) / denom : 1e4;
    float cap = 1.0 / max(abs(d.y), 1e-4);

    return min(side, cap);
  }

  void main() {
    vec3 dir = normalize(position);

    // Noise is sampled on the sphere, not on the morphed surface, so the
    // texture stays put on the form instead of swimming across it as the shape
    // changes underneath.
    float n = snoise(position * uFrequency + uTime * 0.18);
    float disp = n * (${DISPLACEMENT.base} + uLow * ${DISPLACEMENT.lowGain}) * uGain
               + sin(position.y * 14.0 + uTime * 3.0) * uMid * ${DISPLACEMENT.midGain} * uRipple
               + uHigh * ${DISPLACEMENT.highGain};

    vDisp = disp;

    vec3 shaped = mix(dir, dir * solidScale(dir), uSolid) * ${SCULPTURE_RADIUS.toFixed(2)};
    shaped += dir * disp;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(shaped, 1.0);
  }
`;

// The ramp is a uniform rather than a constant because it has to track the
// scroll-linked displacement gain; see signalRampFor.
// uBase and uSignal are vec3 of linear RGB rather than THREE.Color, because the
// identities now carry arbitrary per-case colours as plain numbers so one GSAP
// tween can move a whole identity at once.
const fragmentShader = /* glsl */ `
  precision highp float;

  uniform vec3 uBase;
  uniform vec3 uSignal;
  uniform float uMix;
  uniform float uRampStart;
  uniform float uRampEnd;

  varying float vDisp;

  void main() {
    float t = smoothstep(uRampStart, uRampEnd, vDisp);
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
  const audible = useExperience(selectAudible);

  const uniforms = useMemo(
    () => ({
      uTime: { value: reducedMotion ? COMPOSED_POSE.time : 0 },
      uLow: { value: reducedMotion ? COMPOSED_POSE.low : 0 },
      uMid: { value: reducedMotion ? COMPOSED_POSE.mid : 0 },
      uHigh: { value: reducedMotion ? COMPOSED_POSE.high : 0 },
      uGain: { value: gain },
      uFrequency: { value: NEUTRAL_IDENTITY.frequency },
      uRipple: { value: NEUTRAL_IDENTITY.ripple },
      uSquare: { value: NEUTRAL_IDENTITY.square },
      uTaper: { value: NEUTRAL_IDENTITY.taper },
      uSolid: { value: NEUTRAL_IDENTITY.solid },
      uBase: { value: new THREE.Vector3() },
      uSignal: { value: new THREE.Vector3() },
      uMix: { value: 1 },
      uRampStart: { value: signalRampFor(gain).start },
      uRampEnd: { value: signalRampFor(gain).end },
    }),
    [gain, reducedMotion],
  );

  const idleRotation = useRef(0);

  /**
   * How far the accent has crossfaded to grey, 0 to 1.
   *
   * Smoothed per frame rather than tweened, because it is driven by React state
   * — muting, declining, pausing — and starting a GSAP tween from a render
   * would be a side effect in the wrong place. At this rate it lands in about a
   * second, which reads the same as the 1.2s identity morph beside it.
   */
  const silence = useRef(audible ? 0 : 1);

  useFrame((_, delta) => {
    const u = material.current?.uniforms;
    if (!u) return;

    // Only the time-varying half is skipped under reduced motion — the pose is
    // fixed, so advancing the noise field or chasing the analyser would be the
    // animation §10 asks to stop.
    //
    // Everything below this block still applies, and used to not. The whole
    // callback returned early, which meant `recede` was written by the
    // manifesto and read by nobody: the sculpture never withdrew, and copy that
    // relies on it withdrawing sat over lit peaks at roughly 1.1:1. Reduced
    // motion is a designed state, not a stripped one, and that includes the
    // states that exist to keep text legible.
    if (!reducedMotion) {
      // Clamped because a backgrounded tab can deliver one enormous delta on
      // resume, which would jump the noise field and read as a glitch.
      const step = Math.min(delta, 0.1);
      u.uTime.value += step;

      const current = bands.current;
      u.uLow.value = lerp(u.uLow.value, current.low, SMOOTHING.low);
      u.uMid.value = lerp(u.uMid.value, current.mid, SMOOTHING.mid);
      u.uHigh.value = lerp(u.uHigh.value, current.high, SMOOTHING.high);

      idleRotation.current += step * 0.06;
    }

    // The per-case identity, FR-04. Read from a plain object the rail tweens,
    // for the same reason as sculptureMotion below.
    u.uFrequency.value = activeIdentity.frequency;
    u.uRipple.value = activeIdentity.ripple;
    u.uSquare.value = activeIdentity.square;
    u.uTaper.value = activeIdentity.taper;
    u.uSolid.value = activeIdentity.solid;

    // Toward grey when nothing is audible, toward the case colour when it is.
    const target = audible ? 0 : 1;
    silence.current += (target - silence.current) * Math.min(1, delta * 4);
    const grey = silence.current;

    u.uBase.value.set(
      activeIdentity.bodyR,
      activeIdentity.bodyG,
      activeIdentity.bodyB,
    );
    u.uSignal.value.set(
      activeIdentity.accentR + (SILENT_RGB[0] - activeIdentity.accentR) * grey,
      activeIdentity.accentG + (SILENT_RGB[1] - activeIdentity.accentG) * grey,
      activeIdentity.accentB + (SILENT_RGB[2] - activeIdentity.accentB) * grey,
    );

    // Scroll drives displacement gain and orbit, §7. Read from a plain object
    // written by ScrollTrigger, so a scrub frame costs no React work.
    //
    // Swell multiplies in here rather than into the displacement directly so
    // the ramp below inherits it. A case that swells the form therefore raises
    // its own signal threshold and cannot breach the 4% ceiling by growing.
    const totalGain = gain * sculptureMotion.gain * activeIdentity.swell;
    u.uGain.value = totalGain;

    // The ramp has to move with the gain, or the accent grows with the
    // displacement and breaks the 4% ceiling partway down the hero.
    const ramp = signalRampFor(totalGain);
    u.uRampStart.value = ramp.start;
    u.uRampEnd.value = ramp.end;

    // §6.1: recede and desaturate behind the manifesto, so editorial copy is
    // never laid over a lit peak.
    const receded = recedeState(sculptureMotion.recede);
    u.uMix.value = receded.mix;

    if (mesh.current) {
      // Rotation is animation and stays behind the guard; the composed pose is
      // set declaratively below and must not be overwritten here.
      if (!reducedMotion) {
        mesh.current.rotation.y = idleRotation.current + sculptureMotion.orbit;
      }

      // Recede scales the whole form; elongation stretches it. Lateral axes
      // take the inverse square root so volume stays roughly constant and a
      // tall case does not simply become a bigger one — the silhouette should
      // change character, not size.
      const stretch = Math.max(0.1, activeIdentity.elongation);
      const size = receded.scale * Math.max(0.1, activeIdentity.bulk);
      const lateral = size / Math.sqrt(stretch);
      mesh.current.scale.set(lateral, size * stretch, lateral);
    }
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
