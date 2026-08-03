"use client";

import { useRef } from "react";

import { useReveal } from "@/lib/motion/useReveal";

const LINES = [
  "Sound is the only brand asset that reaches a customer with their eyes closed.",
  "A sonic identity is a system, not a jingle.",
  "We build the system, and the guidelines that keep it coherent after we leave.",
];

/**
 * The manifesto, specification §6.1 item 4: three lines, each on its own scroll
 * beat, right-aligned in columns 4-12.
 *
 * This is also what gives the page something to scroll. Until now the document
 * had 88px of scrollable range, which made scroll progress, the scrub track and
 * every reveal untestable.
 *
 * §6.1 also has the sculpture recede behind this copy, which used to live here
 * and now lives in SculptureChoreography. It reads as a property of this
 * section, but it is shared with the work rail, and two sections tweening one
 * value is what broke it. The `data-choreo` hook is all that is left of it.
 */
export function Manifesto() {
  const scope = useRef<HTMLElement>(null);
  useReveal(scope);

  return (
    <section
      ref={scope}
      data-choreo="manifesto"
      // gap-y-16 because these are three separate statements, each on its own
      // scroll beat per §6.1, and at the old gap-4 they read as one paragraph
      // that happened to break oddly.
      className="shell section-rhythm grid grid-cols-4 gap-x-4 gap-y-16 lg:grid-cols-12"
    >
      {LINES.map((line) => (
        <p
          key={line}
          data-reveal
          /**
           * Three things fix the setting, and none of them is the alignment.
           *
           * `max-w-[22ch]` caps the measure. §6.1 puts these in columns 4-12,
           * which on a 1920 screen is around 1400px and roughly 60 characters
           * of display type — two to three times the 20-35 characters that
           * reads comfortably at this size. That width is what produced lines
           * running the full bleed and breaking wherever they happened to land.
           *
           * `text-balance` evens the wrapped lines instead of filling each one
           * before moving on, which is what left "jingle." alone on a line
           * under a full-width line above it.
           *
           * `ml-auto` keeps the block right-aligned within the columns without
           * stretching the paragraph to their full width, so the ragged edge is
           * a deliberate shape rather than a consequence of the grid.
           */
          className="col-span-4 ml-auto max-w-[22ch] text-right text-balance font-display text-h2 text-ink lg:col-span-9 lg:col-start-4"
        >
          {line}
        </p>
      ))}
    </section>
  );
}
