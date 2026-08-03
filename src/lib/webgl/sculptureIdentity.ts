import { PALETTE } from "@/lib/color/palette";

/**
 * Per-case sculpture identity, FR-04 and specification §6.1 item 5.
 *
 * The rail morphs "geometry, material and palette" as each case enters. Taken
 * literally that means swapping the base primitive, which cannot be tweened:
 * an icosahedron and a torus have different vertex counts, so a 1.2s transition
 * between them needs morph targets and two geometries resident at once. What is
 * modelled instead is the *form* the shader produces — noise scale, ripple
 * amplitude and swell — which interpolates continuously and changes the
 * silhouette just as visibly. One geometry, four characters.
 *
 * The palette half is constrained harder than it looks. §3.1 rule 1 allows one
 * accent and rule 4 reserves `peak` for clipping and `ok` for success, so four
 * per-client hues are not available — using them would overload two colours that
 * carry meaning elsewhere in the interface. The axes here are therefore the two
 * the palette does sanction: body colour between `ground-lift` and `warm-shade`,
 * and accent between `signal` and `signal-dim`.
 *
 * Values are not decoration. Each traces to something the case actually says
 * about the work, which is the difference between four sculptures and one
 * sculpture with four random seeds.
 *
 * ## Measured signal coverage
 *
 * §3.1 rule 1 caps the accent at 4% of viewport area, and three of the five
 * parameters below can move it. Read back off the live canvas with readPixels
 * on an Intel HD 620, showreel bed playing, peak over twelve sampled frames at
 * each card. Two thresholds: *tinted* is a pixel more than halfway from body
 * colour to accent, *saturated* is one at 95% or more — the second is the
 * measure the §7.4 table used, and the first is the honest upper bound on
 * "reads as the accent".
 *
 * | 1280x800            | tinted | saturated |
 * |---------------------|--------|-----------|
 * | kestrel             | 1.35%  | 0.02%     |
 * | **halcyon**         | **3.13%** | 0.25%  |
 * | solene              | 3.00%  | 0.53%     |
 * | aviation-carrier    | 1.34%  | 0.12%     |
 *
 * | 427x925             | tinted | saturated |
 * |---------------------|--------|-----------|
 * | halcyon             | 1.92%  | 0.21%     |
 * | solene              | 0.57%  | 0.00%     |
 *
 * Halcyon is the ceiling at 3.13%, which is where its ripple of 2.0 lands — the
 * standing wave lights more of the surface than the noise field does. It is the
 * value to re-measure before anyone raises a ripple further.
 *
 * ## Measured silhouettes
 *
 * The point of the elongation axis, at 1280x800, in rendered pixels:
 *
 * | case             | width | height | aspect |
 * |------------------|-------|--------|--------|
 * | kestrel          | 724   | 979    | 1.35   |
 * | halcyon          | 827   | 842    | 1.02   |
 * | solene           | 1034  | 618    | 0.60   |
 * | aviation-carrier | 826   | 913    | 1.11   |
 *
 * Against the first tuning's 461, 473, 470 and 456 — four heights inside 4% of
 * each other, which is a morph that measures and does not read. The aspect now
 * spans 0.60 to 1.35.
 */

export type SculptureIdentity = {
  /**
   * Simplex noise field scale. Low values give broad slow forms, high values
   * fine surface chatter. 1.7 is the calibrated baseline from §7.4.
   */
  frequency: number;
  /** Multiplier on the mid-band standing wave. 1 is the calibrated baseline. */
  ripple: number;
  /**
   * Multiplier on displacement gain.
   *
   * Folded into the total gain the signal ramp is derived from, so a swollen
   * form raises its own ramp and cannot breach the 4% ceiling on its own. See
   * signalRampFor in sculptureTuning.
   */
  swell: number;
  /** Body colour: 0 is `ground-lift`, 1 is `warm-shade`. */
  warmth: number;
  /** Accent colour: 0 is `signal`, 1 is `signal-dim`. */
  patina: number;
  /**
   * Vertical stretch. 1 is the sphere; above it the form is tall and narrow,
   * below it low and wide.
   *
   * The other four parameters all change the *surface* — how fine the noise is,
   * how much it ripples, how far it swells, what colour it lands on — and the
   * silhouette barely moves. Measured across the four cases the rendered
   * heights were 461, 473, 470 and 456 pixels: a 4% spread, which is to say
   * none. Swell cannot do this job either, because it folds into the gain the
   * signal ramp is derived from, so a swollen form raises its own threshold and
   * comes back the same size. Elongation is the one axis that changes the shape
   * rather than its skin.
   *
   * Applied as a mesh scale of (1/sqrt(e), e, 1/sqrt(e)), which holds volume
   * roughly constant so the accent budget moves with the square root rather
   * than the cube of it.
   */
  elongation: number;
};

/** The calibrated baseline — what the sculpture is everywhere outside the rail. */
export const NEUTRAL_IDENTITY: SculptureIdentity = {
  frequency: 1.7,
  ripple: 1,
  swell: 1,
  warmth: 0,
  patina: 0,
  elongation: 1,
};

/**
 * One identity per featured case, keyed by slug.
 *
 * Kept here rather than on `CaseStudy` for the same reason stems live in the
 * audio manifest: these are calibration numbers that have to sit beside the
 * tuning they interact with, and a case references them by key. A case added
 * without one falls back to neutral, and the test fails so nobody discovers it
 * by noticing the homepage stopped changing.
 */
export const SCULPTURE_IDENTITIES: Readonly<
  Record<string, SculptureIdentity>
> = {
  // "The tone has to resolve before the animation does." Short, exact, cool.
  // The tallest and narrowest form in the set, finely detailed and barely
  // rippling: precision reads as a tight column. Full signal, because nothing
  // about this engagement is withheld.
  kestrel: {
    frequency: 2.6,
    ripple: 0.35,
    swell: 0.85,
    warmth: 0,
    patina: 0,
    elongation: 1.3,
  },

  // "Recognisable from its rhythm alone", carried in the mids because low
  // frequency disappears under road noise. The mid band is the standing wave,
  // so this is the identity that leans hardest on ripple, and it keeps the
  // sphere's proportions — the rhythm is the character, not the outline.
  halcyon: {
    frequency: 1.9,
    ripple: 2.0,
    swell: 1.0,
    warmth: 0.22,
    patina: 0.28,
    elongation: 1.0,
  },

  // Eight and ten minute beds at -22 to -26 LUFS across thirty-one hotels.
  // The widest and lowest form, coarse and slow, and by far the warmest body:
  // hospitality is the only sector here that is literally about a room.
  solene: {
    frequency: 0.95,
    ripple: 0.25,
    swell: 1.25,
    warmth: 0.9,
    patina: 0.58,
    elongation: 0.76,
  },

  // Anonymised until March. The dimmest accent in the set, which is the one
  // place the palette says something the copy cannot.
  "aviation-carrier": {
    frequency: 1.4,
    ripple: 1.0,
    swell: 1.1,
    warmth: 0.5,
    patina: 0.85,
    elongation: 1.12,
  },
};

export function identityFor(slug: string): SculptureIdentity {
  return SCULPTURE_IDENTITIES[slug] ?? NEUTRAL_IDENTITY;
}

/**
 * The identity the sculpture is currently rendering.
 *
 * A plain mutable object for the same reason as `sculptureMotion`: the rail
 * tweens it with GSAP over 1.2s and the shader reads it inside the render loop.
 * Routing a 1.2s tween through React state would reconcile the tree on every
 * frame of the morph to move five floats.
 */
export const activeIdentity: SculptureIdentity = { ...NEUTRAL_IDENTITY };

export function resetIdentity(): void {
  Object.assign(activeIdentity, NEUTRAL_IDENTITY);
}

export function lerpIdentity(
  from: SculptureIdentity,
  to: SculptureIdentity,
  t: number,
): SculptureIdentity {
  const k = Math.min(1, Math.max(0, t));
  return {
    frequency: from.frequency + (to.frequency - from.frequency) * k,
    ripple: from.ripple + (to.ripple - from.ripple) * k,
    swell: from.swell + (to.swell - from.swell) * k,
    warmth: from.warmth + (to.warmth - from.warmth) * k,
    patina: from.patina + (to.patina - from.patina) * k,
    elongation:
      from.elongation + (to.elongation - from.elongation) * k,
  };
}

/** Endpoints the body and accent colours interpolate between. */
export const IDENTITY_COLOURS = {
  bodyFrom: PALETTE.groundLift,
  bodyTo: PALETTE.warmShade,
  accentFrom: PALETTE.signal,
  accentTo: PALETTE.signalDim,
} as const;

/** §7: the morph duration FR-04 specifies. */
export const MORPH_SECONDS = 1.2;
