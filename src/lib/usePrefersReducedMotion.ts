"use client";

import { useSyncExternalStore } from "react";

export const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/**
 * Tracks the reduced-motion preference, and keeps tracking it: the value comes
 * from a live MediaQueryList rather than a single read at mount, because the
 * setting can change mid-session and specification §10 treats reduced motion as
 * a designed state rather than a one-time branch.
 *
 * Implemented with useSyncExternalStore rather than useState plus useEffect. A
 * media query is an external store, and reading it into state from an effect
 * would render once with the wrong value and then immediately render again.
 */

function subscribe(onStoreChange: () => void): () => void {
  const query = window.matchMedia(REDUCED_MOTION_QUERY);
  query.addEventListener("change", onStoreChange);
  return () => query.removeEventListener("change", onStoreChange);
}

function getSnapshot(): boolean {
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

/** No preference is knowable on the server; assume motion is allowed. */
function getServerSnapshot(): boolean {
  return false;
}

export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
