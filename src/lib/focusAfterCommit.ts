"use client";

/**
 * Moves focus once the DOM has settled, not during the render that changes it.
 *
 * Calling `element.focus()` in the same tick as the state update that removes,
 * reveals or re-tabindexes the target races React's commit. Chromium usually
 * lands the focus anyway; WebKit drops it and leaves a keyboard user on nothing.
 *
 * This exists because the same bug was found and fixed three times in three
 * places before the shape was recognised:
 *
 *   - the consent gate handing focus to the content after a choice
 *   - the mixing desk returning focus to its toggle on close
 *   - the desk's arrow keys moving focus between channels, where roving
 *     tabindex leaves the target at tabindex="-1" until the render lands
 *
 * All three are "focus something whose DOM state is about to change", and all
 * three were only caught because WebKit is in the test matrix.
 *
 * A single animation frame is enough: React has committed and the browser has
 * recalculated style and layout by the time it runs.
 */
export function focusAfterCommit(
  target: HTMLElement | null | undefined | (() => HTMLElement | null | undefined),
): void {
  if (typeof window === "undefined") return;

  requestAnimationFrame(() => {
    const element = typeof target === "function" ? target() : target;
    element?.focus();
  });
}
