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
