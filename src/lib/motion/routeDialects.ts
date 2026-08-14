import { SCULPTURE_ACCENTS } from "@/lib/webgl/sculptureIdentity";

/**
 * Route transitions, §7 — one grammar, four dialects.
 *
 * The screen is covered instantly on the click, and the blades then sweep away
 * to reveal the destination. That ordering took three attempts to get right and
 * the reasoning is worth keeping, because both wrong answers look reasonable
 * written down.
 *
 * Sweeping in and then out — cover, swap, uncover — cannot work. A prefetched
 * route swaps in tens of milliseconds while any cover worth watching takes
 * hundreds, so the destination paints long before the blades arrive: you see
 * the new page, then the wipe, then the new page again.
 *
 * Delaying the navigation until the cover finishes fixes the flash and buys it
 * with a stall on every click. Worse, doing it by intercepting the click fights
 * `next/link`, which runs its own handler and navigates regardless — so it
 * produced two navigations and the flash came back anyway.
 *
 * Covering instantly has neither problem. There is nothing to outrun, because
 * the screen is already covered in the same frame as the click, and nothing to
 * intercept, because the link is left alone to navigate normally. The whole
 * transition is the reveal, which is the half worth watching.
 *
 * What differs per destination is the blade count, axis, direction and colour,
 * and each carries meaning rather than being a knob turned until it looked
 * nice:
 *
 *   case studies   the case's own accent, so the sweep and the sculpture behind
 *                  it wear the same colour. Read from the identity, so four
 *                  dialects cost the same as one.
 *   services       six blades, because the page is six service lines. They
 *                  peel away like the channel strips the page draws.
 *   brief          four blades lifting upward, because the form is four steps.
 *   home           travels the opposite way to everything else. Going back
 *                  should not feel like going forward.
 *
 * The panels are near-black rather than saturated. A full-viewport flash of
 * accent was the first version, and 100% of the screen in one colour reads as a
 * fault rather than a transition — it also broke §3.1's rule that the accent
 * never covers more than 4% of a viewport. The colour lives in a 3px edge.
 */

export type RouteDialect = {
  /** How many blades divide the viewport. */
  blades: number;
  /** `x` sweeps sideways with the blades stacked as rows; `y` the reverse. */
  axis: "x" | "y";
  /** Percent the blades sweep away to. Negative exits left/up. */
  to: number;
  /** Seconds between blades. */
  stagger: number;
  /** How long one blade takes to clear the viewport. */
  sweep: number;
  /** The leading edge, and the only place colour appears. */
  edge: string;
};

const SIGNAL = "#E8FF2B";

/** Everything not otherwise spoken for. Deliberately the plainest of the set. */
const DEFAULT_DIALECT: RouteDialect = {
  blades: 3,
  axis: "x",
  to: 100,
  stagger: 0.05,
  sweep: 0.55,
  edge: SIGNAL,
};

const SERVICES_DIALECT: RouteDialect = {
  blades: 6,
  axis: "x",
  to: 100,
  stagger: 0.06,
  sweep: 0.6,
  edge: SIGNAL,
};

const BRIEF_DIALECT: RouteDialect = {
  blades: 4,
  axis: "y",
  to: -100,
  stagger: 0.075,
  sweep: 0.62,
  edge: SIGNAL,
};

const HOME_DIALECT: RouteDialect = {
  blades: 3,
  axis: "x",
  // Travels forward like every other click. This used to clear leftward on the
  // theory that returning home is not arriving, which read well and taught the
  // visitor nothing — it meant clicking TIMBRE and pressing back looked the
  // same, while pressing back from two different pages looked different. The
  // rule that survives is simpler and learnable: clicks go one way, back goes
  // the other. Home keeps its own count and pace, not its own direction.
  to: 100,
  stagger: 0.05,
  sweep: 0.58,
  edge: SIGNAL,
};

function caseDialect(slug: string): RouteDialect {
  return {
    blades: 5,
    axis: "x",
    to: 100,
    stagger: 0.05,
    sweep: 0.62,
    edge: SCULPTURE_ACCENTS[slug as keyof typeof SCULPTURE_ACCENTS] ?? SIGNAL,
  };
}

/** The slug of a case study route, or null for anything else. */
export function caseSlugOf(pathname: string): string | null {
  const match = /^\/work\/([^/]+)\/?$/.exec(pathname);
  return match ? match[1] : null;
}

/**
 * The same dialect, travelling the way back.
 *
 * Direction has to encode the journey rather than the destination, and choosing
 * it by destination alone got that wrong in a way that only showed up on the
 * browser's back button: returning to `/journal` swept one way because that is
 * the default dialect, while returning to `/` swept the other because home has
 * its own. Two backward journeys, two directions, for no reason a visitor could
 * infer.
 *
 * Everything else about the dialect is kept — blade count, axis, colour — so a
 * case study still returns in its own accent. Only the direction flips.
 */
export function returning(dialect: RouteDialect): RouteDialect {
  return { ...dialect, to: -dialect.to };
}

export function dialectFor(pathname: string): RouteDialect {
  const slug = caseSlugOf(pathname);
  if (slug) return caseDialect(slug);
  if (pathname === "/") return HOME_DIALECT;
  if (pathname === "/services") return SERVICES_DIALECT;
  if (pathname === "/brief") return BRIEF_DIALECT;
  return DEFAULT_DIALECT;
}
