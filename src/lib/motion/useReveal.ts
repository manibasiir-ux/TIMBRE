"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect, type RefObject } from "react";

gsap.registerPlugin(ScrollTrigger);

export const REVEAL_ATTRIBUTE = "data-reveal";

/**
 * Section reveals, specification §7 ("Section reveal", 80% viewport, y 48 -> 0,
 * power3.out, 0.8s, 0.07s stagger).
 *
 * Two things worth knowing about how this is written.
 *
 * The hidden state is applied by GSAP at runtime, never in CSS. If it were a
 * stylesheet rule, a JavaScript failure would leave every section permanently
 * invisible — the content would be gone, not merely unanimated. Setting it from
 * script means the no-JS rendering is the finished page.
 *
 * Reduced motion is a separate branch inside gsap.matchMedia rather than a
 * shorter version of the same tween. §10 asks for opacity-only transitions
 * capped at 0.2s and absolute content parity, which is a different animation,
 * not the same one turned down. matchMedia also reverts cleanly when the
 * preference changes mid-session.
 */
export function useReveal(scope: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const root = scope.current;
    if (!root) return;

    const context = gsap.context(() => {
      const media = gsap.matchMedia();

      media.add(
        {
          full: "(prefers-reduced-motion: no-preference)",
          reduced: "(prefers-reduced-motion: reduce)",
        },
        (mediaContext) => {
          const { full } = mediaContext.conditions as {
            full: boolean;
            reduced: boolean;
          };

          const targets = gsap.utils.toArray<HTMLElement>(
            `[${REVEAL_ATTRIBUTE}]`,
            root,
          );
          if (targets.length === 0) return;

          gsap.set(targets, { autoAlpha: 0, y: full ? 48 : 0 });

          // batch groups whatever enters in the same frame, so a stagger reads
          // across a row rather than firing per element at slightly different
          // scroll positions.
          ScrollTrigger.batch(targets, {
            start: "top 80%",
            once: true,
            onEnter: (batch) =>
              gsap.to(batch, {
                autoAlpha: 1,
                y: 0,
                duration: full ? 0.8 : 0.2,
                ease: full ? "power3.out" : "none",
                stagger: full ? 0.07 : 0,
                overwrite: true,
              }),
          });
        },
      );
    }, root);

    return () => context.revert();
  }, [scope]);
}
