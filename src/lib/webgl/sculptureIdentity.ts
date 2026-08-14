/**
 * Per-case sculpture identity, FR-04 and specification §6.1 item 5.
 *
 * Each case owns a solid and a pair of colours. The rail morphs between them as
 * cards reach the centre, and everything here is a plain number so one GSAP
 * tween can carry a whole identity across in 1.2s.
 *
 * ## The solids
 *
 * Phase 9 shipped a parametric surface rather than real primitives, on the
 * grounds that an icosahedron and a cube have different vertex counts and there
 * is nothing to interpolate between them. That was true of swapping geometries
 * and false as a limit: the mesh never has to change. For a unit direction on
 * the sphere, the shader solves where that direction leaves a capped solid of a
 * given cross-section and taper, and blends the vertex from one to the other.
 * One geometry, five shapes, every intermediate valid.
 *
 *   square   0 is a round cross-section, 1 is a square one
 *   taper    0 keeps full radius to the top, 1 closes it to a point
 *   solid    0 is the sphere, 1 is the capped solid described above
 *
 * so a cube is square 1 / taper 0, a cylinder is square 0 / taper 0, a cone is
 * square 0 / taper 1, and a pyramid is square 1 / taper 1.
 *
 * ## The colours
 *
 * Stored as linear RGB because that is what the shader writes. Authors give sRGB
 * hex and `identity()` converts, so the values in this file stay readable.
 *
 * Two of the four sit near tokens the interface already uses for meaning —
 * `ok` (#5BE3A5) for success and `peak` (#FF4A1F) for errors and clipping. The
 * shades below are deliberately distant from both, so that a brief form turning
 * red still reads as a mistake and not as a house colour.
 */

/** sRGB channel to linear, the transfer function the renderer expects. */
function toLinear(channel: number): number {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function linearRgb(hex: string): [number, number, number] {
  return [
    toLinear(parseInt(hex.slice(1, 3), 16)),
    toLinear(parseInt(hex.slice(3, 5), 16)),
    toLinear(parseInt(hex.slice(5, 7), 16)),
  ];
}

export type SculptureIdentity = {
  /** Simplex noise field scale. Low is broad and slow, high is fine chatter. */
  frequency: number;
  /** Multiplier on the mid-band standing wave. */
  ripple: number;
  /**
   * Multiplier on displacement gain.
   *
   * Folded into the total gain the signal ramp is derived from, so a swollen
   * form raises its own threshold rather than lighting more of itself.
   */
  swell: number;
  /** Vertical stretch. Above 1 is tall and narrow, below it low and wide. */
  elongation: number;
  /**
   * Overall size, tuned so every solid reads at a comparable weight.
   *
   * A cube and a cone built to the same radius are not the same size on screen:
   * measured at 1280x800 the cube covered 62% of the viewport and the cone
   * 25.8%, which reads as the sculpture randomly growing and shrinking rather
   * than as four deliberate shapes. These bring them within a few points of each
   * other so what changes between cases is the form, not the scale.
   */
  bulk: number;

  /** Cross-section: 0 round, 1 square. */
  square: number;
  /** Taper toward the top: 0 none, 1 to a point. */
  taper: number;
  /** How far from the sphere toward the capped solid, 0 to 1. */
  solid: number;

  bodyR: number;
  bodyG: number;
  bodyB: number;
  accentR: number;
  accentG: number;
  accentB: number;
};

type IdentityInput = Omit<
  SculptureIdentity,
  "bodyR" | "bodyG" | "bodyB" | "accentR" | "accentG" | "accentB"
> & { body: string; accent: string };

function identity(input: IdentityInput): SculptureIdentity {
  const { body, accent, ...rest } = input;
  const [bodyR, bodyG, bodyB] = linearRgb(body);
  const [accentR, accentG, accentB] = linearRgb(accent);
  return { ...rest, bodyR, bodyG, bodyB, accentR, accentG, accentB };
}

/** The near-black every case is lit against. */
const BODY = "#0B0B0C";

/**
 * What the sculpture wears when nothing is audible.
 *
 * Muting used to leave it black and still. The analyser sits after the master
 * gain, so muting zeroes what it reads and the form stopped moving as well as
 * going dark — the site looked broken rather than quiet. It now keeps its shape
 * changing from the baked envelope and simply loses its colour, which is the
 * honest picture: the sculpture is still doing something, you just cannot hear
 * what it is doing it to.
 */
export const SILENT_ACCENT = "#9A9A93";

export const NEUTRAL_IDENTITY: SculptureIdentity = identity({
  frequency: 1.7,
  ripple: 1,
  swell: 1,
  elongation: 1,
  bulk: 1,
  square: 0,
  taper: 0,
  solid: 0,
  body: BODY,
  accent: "#E8FF2B",
});

/** The grey the accent crossfades to when the visitor cannot hear anything. */
export const SILENT_RGB = linearRgb(SILENT_ACCENT);

/**
 * The accent hex per case, as a colour rather than as linear RGB.
 *
 * `identity()` consumes the hex and keeps only the linear triple the shader
 * needs, which is right for the shader and useless to CSS. The route transition
 * has to draw in the same colour the sculpture is wearing, so the hex is named
 * here and referenced below rather than written twice — a second copy would
 * drift the moment one of them was retuned, and the drift would be invisible
 * until someone noticed a case whose wipe disagreed with its own form.
 */
export const SCULPTURE_ACCENTS = {
  kestrel: "#2E6BFF",
  halcyon: "#2FBF57",
  solene: "#C81E3A",
  "aviation-carrier": "#F4F4F0",
} as const;

export const SCULPTURE_IDENTITIES: Readonly<
  Record<string, SculptureIdentity>
> = {
  // Cube. "The tone has to resolve before the animation does" — short, exact,
  // and the only case with hard edges and no taper at all.
  kestrel: identity({
    frequency: 2.6,
    ripple: 0.35,
    swell: 0.85,
    elongation: 1.1,
    bulk: 0.74,
    square: 1,
    taper: 0,
    solid: 1,
    body: BODY,
    accent: SCULPTURE_ACCENTS.kestrel,
  }),

  // Cone. Carried in the mids because low frequency disappears under road
  // noise, so this is the identity that leans hardest on ripple.
  halcyon: identity({
    frequency: 1.9,
    ripple: 2.0,
    swell: 1.0,
    elongation: 1.05,
    bulk: 1.15,
    square: 0,
    taper: 1,
    solid: 1,
    body: BODY,
    accent: SCULPTURE_ACCENTS.halcyon,
  }),

  // Cylinder. Eight and ten minute beds across thirty-one hotels: broad, slow,
  // and the widest form in the set.
  solene: identity({
    frequency: 0.95,
    ripple: 0.25,
    swell: 1.25,
    elongation: 0.85,
    bulk: 0.81,
    square: 0,
    taper: 0,
    solid: 1,
    body: BODY,
    // A crimson rather than a scarlet. #E02418 was the first choice and sits
    // 49.5 from `peak` in RGB, close enough that a failed form field and a case
    // study would have read as the same colour; this is 75 away.
    accent: SCULPTURE_ACCENTS.solene,
  }),

  // Pyramid. Anonymised until March, and the one form that is both hard-edged
  // and closed to a point.
  "aviation-carrier": identity({
    frequency: 1.4,
    ripple: 1.0,
    swell: 1.1,
    elongation: 1.15,
    bulk: 1.08,
    square: 1,
    taper: 1,
    solid: 1,
    body: BODY,
    accent: SCULPTURE_ACCENTS["aviation-carrier"],
  }),
};

export function identityFor(slug: string): SculptureIdentity {
  return SCULPTURE_IDENTITIES[slug] ?? NEUTRAL_IDENTITY;
}

/**
 * The identity the sculpture is currently rendering.
 *
 * A plain mutable object for the same reason as `sculptureMotion`: the rail
 * tweens it over 1.2s and the shader reads it inside the render loop.
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

  // The endpoints are returned rather than computed. `a + (b - a) * 1` is not
  // reliably `b` in floating point, and the colours are irrational enough for
  // that to bite: a morph has to land exactly on the identity it was aimed at,
  // or the sculpture settles a hair off every case colour forever.
  if (k === 0) return { ...from };
  if (k === 1) return { ...to };

  const between = (a: number, b: number) => a + (b - a) * k;

  return {
    frequency: between(from.frequency, to.frequency),
    ripple: between(from.ripple, to.ripple),
    swell: between(from.swell, to.swell),
    elongation: between(from.elongation, to.elongation),
    bulk: between(from.bulk, to.bulk),
    square: between(from.square, to.square),
    taper: between(from.taper, to.taper),
    solid: between(from.solid, to.solid),
    bodyR: between(from.bodyR, to.bodyR),
    bodyG: between(from.bodyG, to.bodyG),
    bodyB: between(from.bodyB, to.bodyB),
    accentR: between(from.accentR, to.accentR),
    accentG: between(from.accentG, to.accentG),
    accentB: between(from.accentB, to.accentB),
  };
}

/** §7: the morph duration FR-04 specifies. */
export const MORPH_SECONDS = 1.2;
