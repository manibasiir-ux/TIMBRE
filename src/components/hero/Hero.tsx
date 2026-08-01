"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { useEffect, useRef } from "react";

import {
  SCULPTURE_SCROLL,
  resetSculptureMotion,
  sculptureMotion,
} from "@/lib/motion/sculptureMotion";

gsap.registerPlugin(ScrollTrigger, SplitText);

/**
 * The hero, specification §6.1 and §7.2.
 *
 * SplitText comes from the public gsap package. v1.0 of the roadmap installed
 * @gsap/business from the private registry with a token for it; since GSAP 3.13
 * the whole plugin set is free, so there is no paid dependency and no secret in
 * the build.
 *
 * The lockup is split per character and staggered at 0.04s. Under reduced motion
 * it is never split at all: SplitText rewrites the DOM into per-character spans,
 * which is noise for a screen reader and pointless when nothing will animate.
 */
export function Hero() {
  const scope = useRef<HTMLElement>(null);

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

          resetSculptureMotion();

          if (!full) {
            // §10: opacity only, capped at 0.2s, everything composed and legible.
            gsap.set("[data-hero-line], [data-hero-meta] > *, [data-scroll-cue]", {
              autoAlpha: 1,
              y: 0,
            });
            gsap.from("[data-hero-line]", { autoAlpha: 0, duration: 0.2 });
            return;
          }

          // aria: "none" because SplitText's default puts an aria-label on
          // each element it splits, and these are bare spans. A span carries an
          // implicit generic role, which ARIA prohibits aria-label on — axe
          // reports it as a serious violation. The accessible name is on the
          // <h1> instead, where it is permitted, and the lines are hidden from
          // assistive technology so the heading is announced once rather than
          // once per line or once per character.
          const split = new SplitText("[data-hero-line]", {
            type: "chars",
            charsClass: "char",
            aria: "none",
          });

          const intro = gsap.timeline({ defaults: { ease: "power4.out" } });

          intro
            .set("[data-hero-line]", { autoAlpha: 1 })
            .from(split.chars, {
              yPercent: 110,
              rotateX: -40,
              duration: 1.1,
              stagger: 0.04,
              transformOrigin: "50% 100%",
            })
            .from(
              "[data-hero-meta] > *",
              {
                y: 20,
                autoAlpha: 0,
                duration: 0.7,
                stagger: 0.06,
                ease: "expo.out",
              },
              0.6,
            )
            .from("[data-scroll-cue]", { autoAlpha: 0, duration: 0.5 }, 1.4);

          // The sculpture's scroll response, §7. Written straight into a plain
          // object rather than state: this updates every scrub frame.
          const scrub = gsap.to(sculptureMotion, {
            gain: SCULPTURE_SCROLL.gainTo,
            orbit: SCULPTURE_SCROLL.orbitTo,
            ease: "none",
            scrollTrigger: {
              trigger: root,
              start: "top top",
              end: "bottom top",
              scrub: 1,
              invalidateOnRefresh: true,
            },
          });

          // The travelling dot on the scroll cue, §6.1.
          const cue = gsap.to("[data-scroll-dot]", {
            yPercent: 1400,
            ease: "none",
            repeat: -1,
            duration: 2.2,
          });

          return () => {
            split.revert();
            intro.kill();
            scrub.kill();
            cue.kill();
            resetSculptureMotion();
          };
        },
      );
    }, root);

    return () => context.revert();
  }, []);

  return (
    <section
      ref={scope}
      className="shell relative flex min-h-dvh flex-col justify-between pt-[18vh] pb-12"
    >
      <div className="scanlines" aria-hidden="true" />

      {/* The name lives on the heading, which permits aria-label, and the lines
          are hidden so it is announced once as a sentence rather than three
          fragments — or, after splitting, character by character. */}
      <h1 className="relative" aria-label="We make brands audible">
        <span
          data-hero-line
          aria-hidden="true"
          className="block font-display text-mega text-ink [transform-style:preserve-3d]"
        >
          We make
        </span>
        <span
          data-hero-line
          aria-hidden="true"
          className="block font-display text-mega text-ink [transform-style:preserve-3d] lg:ml-[16.6%]"
        >
          Brands
        </span>
        <span
          data-hero-line
          aria-hidden="true"
          className="block font-display text-mega text-signal [transform-style:preserve-3d] lg:ml-[8.3%]"
        >
          Audible
        </span>
      </h1>

      <div className="relative flex items-end justify-between gap-8">
        <p data-hero-meta className="font-mono text-mono-xs text-ink-70">
          <span className="block">Sonic identity studio</span>
          <span className="block">London</span>
          <span className="block">Est. 2019</span>
        </p>

        <div
          className="flex flex-col items-center gap-3"
          aria-hidden="true"
          data-scroll-cue
        >
          <span className="font-mono text-mono-xs text-ink-70">Scroll</span>
          <span className="relative block h-16 w-px overflow-hidden bg-ink-15">
            <span
              data-scroll-dot
              className="absolute top-0 left-1/2 block size-1 -translate-x-1/2 rounded-full bg-signal"
            />
          </span>
        </div>
      </div>
    </section>
  );
}
