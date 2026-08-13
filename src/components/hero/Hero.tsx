"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { useEffect, useLayoutEffect, useRef } from "react";

import {
  SCULPTURE_SCROLL,
  resetSculptureMotion,
  sculptureMotion,
} from "@/lib/motion/sculptureMotion";

gsap.registerPlugin(ScrollTrigger, SplitText);

/**
 * The split has to be undone before React touches the DOM it rewrote, and only
 * a layout effect is early enough.
 *
 * SplitText replaces the text node inside each `[data-hero-line]` with one span
 * per character. React still holds references to the nodes it rendered. When
 * this component unmounts — which is every navigation away from `/`, since the
 * hero exists only on the home page — React removes that subtree, and in React
 * 18+ a deleted tree's DOM is detached during the commit phase while `useEffect`
 * cleanups are flushed afterwards. So `split.revert()` arrived too late, React
 * called `removeChild` on a node that was no longer where it had left it, and
 * threw:
 *
 *     NotFoundError: Failed to execute 'removeChild' on 'Node':
 *     The node to be removed is not a child of this node.
 *
 * That exception escapes React's rendering, so the whole tree dies and the
 * browser shows its own "This page couldn't load" page rather than anything the
 * site controls. `THREE.WebGLRenderer: Context Lost` follows as the canvas is
 * torn down. Reloading always fixed it, which is what made it look like a
 * network or deployment problem for so long — it is neither.
 *
 * `useLayoutEffect` cleanup runs synchronously in the mutation phase, before
 * React detaches anything, so the original text is restored while React's
 * references are still valid. This is the same reason `@gsap/react`'s `useGSAP`
 * is built on `useLayoutEffect` rather than `useEffect`.
 *
 * Aliased because this component is server-rendered before it hydrates, and
 * `useLayoutEffect` on the server warns. There is nothing to clean up during an
 * SSR pass, so falling back to `useEffect` there costs nothing.
 */
const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

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

  useIsomorphicLayoutEffect(() => {
    const root = scope.current;
    if (!root) return;

    // Held outside the context so the cleanup below can revert them directly.
    // Relying on `context.revert()` to reach a matchMedia created inside it —
    // and through that to the split — left the DOM rewritten on unmount.
    let media: ReturnType<typeof gsap.matchMedia> | null = null;
    let split: SplitText | null = null;

    const context = gsap.context(() => {
      media = gsap.matchMedia();

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
          // Scoped to the hero's own root. `gsap.context` scopes selector
          // strings passed to gsap methods, but SplitText is constructed
          // directly, so a bare selector queries the whole document.
          split = new SplitText(root.querySelectorAll("[data-hero-line]"), {
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
            split?.revert();
            split = null;
            intro.kill();
            scrub.kill();
            cue.kill();
            resetSculptureMotion();
          };
        },
      );
    }, root);

    return () => {
      // Order matters: put the DOM back before anything else, while React's
      // references to these nodes are still valid.
      split?.revert();
      split = null;
      media?.revert();
      context.revert();
    };
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
        {/* The lockup sits directly over the sculpture, and §6.1 gives the hero
            that form at full scale and full colour. Measured against a lit peak
            of 206,255,6 the three lines came out at 1.06, 1.06 and 1.05 to one,
            against the 3:1 WCAG 2.2 asks of display type. It is the failure the
            manifesto solves by receding, and the hero cannot recede without
            giving up the one thing it exists to show.

            So the scene is darkened under the words instead. A blurred solid
            rather than a gradient, deliberately: a gradient's alpha where the
            text happens to fall has to be reasoned about, while a solid inset
            further than its own blur radius has a core that is provably opaque
            ground, which makes the contrast under the text 17.84:1 by
            construction and measurable as geometry. Everywhere without text
            over it, the sculpture stays fully lit. */}
        <span
          aria-hidden="true"
          data-hero-scrim
          className="pointer-events-none absolute -z-10 block"
          style={{
            inset: "-72px",
            background: "var(--color-ground)",
            filter: "blur(40px)",
          }}
        />
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
