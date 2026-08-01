"use client";

import gsap from "gsap";

/**
 * The single animation clock, risk R4.
 *
 * Four systems each want to own requestAnimationFrame here: Lenis smoothing
 * scroll, GSAP driving timelines, react-three-fiber rendering the canvas, and
 * the meters reading the analyser. The roadmap records week eight going badly
 * for exactly that reason, and the fix being discipline rather than cleverness:
 *
 *   Lenis drives, GSAP's ticker is the only RAF loop, everything else
 *   subscribes to it.
 *
 * So this module is the only place in the codebase that owns a frame loop.
 * Nothing else calls requestAnimationFrame. Subscribers receive the same
 * timestamp within a frame, which is what stops the sculpture, the meters and
 * the scrub position drifting a frame apart from each other under load.
 *
 * GSAP's ticker is already an rAF loop, so this adds no second one; it fans a
 * single callback out to subscribers rather than each of them registering
 * separately, and keeps the ordering deterministic.
 */

export type TickCallback = (deltaMs: number, timeSeconds: number) => void;

const subscribers = new Set<TickCallback>();
let dispatch: gsap.TickerCallback | null = null;

function ensureInstalled(): void {
  if (dispatch) return;

  dispatch = (time: number, deltaMs: number) => {
    // Iterating a copy: a subscriber may unsubscribe from inside its own
    // callback, and mutating the live set mid-iteration would skip its
    // neighbour.
    for (const subscriber of [...subscribers]) subscriber(deltaMs, time);
  };

  gsap.ticker.add(dispatch);
}

function teardownIfIdle(): void {
  if (subscribers.size > 0 || !dispatch) return;
  gsap.ticker.remove(dispatch);
  dispatch = null;
}

/** Subscribes to the frame loop. Returns the unsubscribe function. */
export function onTick(callback: TickCallback): () => void {
  ensureInstalled();
  subscribers.add(callback);

  return () => {
    subscribers.delete(callback);
    teardownIfIdle();
  };
}

/** Test seam. */
export function tickerSubscriberCount(): number {
  return subscribers.size;
}
