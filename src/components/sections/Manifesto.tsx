"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect, useRef } from "react";

import { sculptureMotion } from "@/lib/motion/sculptureMotion";
import { requestSculptureRender } from "@/lib/motion/sculptureRender";
import { useReveal } from "@/lib/motion/useReveal";

gsap.registerPlugin(ScrollTrigger);

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
 */
export function Manifesto() {
  const scope = useRef<HTMLElement>(null);
  useReveal(scope);

  // §6.1 item 4: the sculpture recedes and desaturates behind this section.
  // Also the only thing that makes the copy legible — it scrolls over the
  // sculpture's lit peaks, and white on signal yellow is about 1.1:1.
  useEffect(() => {
    const root = scope.current;
    if (!root) return;

    const context = gsap.context(() => {
      const media = gsap.matchMedia();

      media.add("(prefers-reduced-motion: no-preference)", () => {
        const tween = gsap.to(sculptureMotion, {
          recede: 1,
          ease: "none",
          scrollTrigger: {
            trigger: root,
            start: "top bottom",
            end: "top center",
            scrub: 1,
            invalidateOnRefresh: true,
          },
        });
        return () => {
          tween.kill();
          sculptureMotion.recede = 0;
        };
      });

      // Under reduced motion there is no scrub to hide behind, so the sculpture
      // simply sits receded wherever this section exists.
      //
      // The canvas runs on demand here, so writing recede is not enough to
      // change anything on screen — it has to be asked for a frame. Without
      // that this branch wrote a value nobody read, and the copy below sat over
      // a fully lit sculpture at about 1.1:1.
      media.add("(prefers-reduced-motion: reduce)", () => {
        const trigger = ScrollTrigger.create({
          trigger: root,
          start: "top bottom",
          end: "bottom top",
          onToggle: (self) => {
            sculptureMotion.recede = self.isActive ? 1 : 0;
            requestSculptureRender();
          },
        });
        return () => {
          trigger.kill();
          sculptureMotion.recede = 0;
          requestSculptureRender();
        };
      });
    }, root);

    return () => context.revert();
  }, []);

  return (
    <section
      ref={scope}
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
