/**
 * Scroll-linked sculpture state, specification §7 ("Sculpture scroll").
 *
 * A plain mutable object rather than store state. ScrollTrigger writes to it on
 * every scrub frame and the sculpture reads it inside the render loop; routing
 * that through React would reconcile the tree at scroll frequency to move a
 * uniform. The experience store deliberately holds no per-frame values for the
 * same reason.
 */

export type SculptureMotion = {
  /** Displacement multiplier, 1 at the top of the page rising toward 2.4. */
  gain: number;
  /** Camera orbit in radians, 0 to 0.9. */
  orbit: number;
  /**
   * How far the sculpture has withdrawn behind the content, 0 to 1.
   *
   * §6.1 item 4: during the manifesto the sculpture "recedes and desaturates
   * behind". That is not only art direction. The form grows as gain scrubs up,
   * and editorial copy scrolls over it — measured white-on-signal contrast
   * where they overlap is about 1.1:1, so without receding the manifesto is
   * unreadable exactly where the sculpture is most active.
   */
  recede: number;
};

export const sculptureMotion: SculptureMotion = {
  gain: 1,
  orbit: 0,
  recede: 0,
};

/** How far scale and colour mix are pulled back at full recede. */
export const RECEDE = { scale: 0.35, desaturate: 0.85 } as const;

/**
 * Where recede settles while the work rail holds the viewport.
 *
 * The rail arrives with the sculpture fully withdrawn behind the manifesto, and
 * at recede 1 the colour mix is 0.15 — a morph between two case identities is
 * then almost invisible. This brings the form back far enough to read while
 * still sitting it behind the cards.
 */
export const RAIL_RECEDE = 0.25;

/**
 * The three phases of recede, as fractions of one scroll range.
 *
 * Withdraw behind the manifesto, hold while it is read, return for the rail.
 */
export const RECEDE_CURVE = { withdrawEnd: 0.35, holdEnd: 0.62 } as const;

/**
 * Recede at a point in the home page's sculpture range, §6.1 items 4 and 5.
 *
 * A pure function of one progress value, deliberately, because every previous
 * attempt at this failed on coordination rather than on maths.
 *
 * Two scrub tweens cannot share a property: ScrollTrigger holds a scrubbed tween
 * at progress 0 or 1 whenever the scroll sits outside its range and re-applies
 * that value on every update, so the manifesto's tween and the rail's tween each
 * stamped their own idea of recede over the other's. Measured down the page the
 * result was not merely wrong but non-monotonic — 1.0 at the very top of the
 * document, then 0.50, back to 1.0, then 0.80, 0.48. The sculpture sat at its
 * most withdrawn exactly where §6.1 wants it most present, which hid the hero's
 * whole scrub behind a fade nobody asked for.
 *
 * Splitting them onto two triggers driving two separate numbers fixed the
 * fighting but not the coordination: their ranges have to abut, the offsets that
 * make them abut depend on viewport height and on how tall the manifesto renders,
 * and measured on a 702px viewport they still overlapped enough that recede
 * peaked at 0.755 instead of 1. One range with explicit phases has no seam to
 * get wrong, and unlike a pair of triggers it can be tested without a browser.
 */
export function recedeAt(progress: number): number {
  const p = Math.min(1, Math.max(0, progress));
  const { withdrawEnd, holdEnd } = RECEDE_CURVE;

  if (p <= withdrawEnd) return p / withdrawEnd;
  if (p <= holdEnd) return 1;

  return 1 + (RAIL_RECEDE - 1) * ((p - holdEnd) / (1 - holdEnd));
}

/** Mesh scale and colour mix at a given recede amount. */
export function recedeState(recede: number): { scale: number; mix: number } {
  const clamped = Math.min(1, Math.max(0, recede));
  return {
    scale: 1 - RECEDE.scale * clamped,
    mix: 1 - RECEDE.desaturate * clamped,
  };
}

export const SCULPTURE_SCROLL = {
  gainFrom: 1,
  gainTo: 2.4,
  orbitFrom: 0,
  orbitTo: 0.9,
} as const;

export function resetSculptureMotion(): void {
  sculptureMotion.gain = SCULPTURE_SCROLL.gainFrom;
  sculptureMotion.orbit = SCULPTURE_SCROLL.orbitFrom;
  sculptureMotion.recede = 0;
}

/**
 * Maps scroll progress 0..1 onto the hero's scrubbed range.
 *
 * Returns only the pair the hero scrub owns. Recede belongs to the manifesto
 * and is driven by a different trigger over a different range, so including it
 * here would imply one scroll position determines all three.
 */
export function sculptureMotionAt(
  progress: number,
): Pick<SculptureMotion, "gain" | "orbit"> {
  const clamped = Math.min(1, Math.max(0, progress));
  return {
    gain:
      SCULPTURE_SCROLL.gainFrom +
      (SCULPTURE_SCROLL.gainTo - SCULPTURE_SCROLL.gainFrom) * clamped,
    orbit:
      SCULPTURE_SCROLL.orbitFrom +
      (SCULPTURE_SCROLL.orbitTo - SCULPTURE_SCROLL.orbitFrom) * clamped,
  };
}
