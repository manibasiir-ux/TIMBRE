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
      className="shell section-rhythm grid grid-cols-4 gap-4 lg:grid-cols-12"
    >
      {LINES.map((line) => (
        <p
          key={line}
          data-reveal
          className="col-span-4 text-right font-display text-h2 text-ink lg:col-span-9 lg:col-start-4"
        >
          {line}
        </p>
      ))}
    </section>
  );
}
