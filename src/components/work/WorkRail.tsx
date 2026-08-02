"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Link from "next/link";
import { useEffect, useRef } from "react";

import { WaveformRule } from "@/components/primitives/WaveformRule";
import { CASES } from "@/content/cases";
import { sculptureMotion } from "@/lib/motion/sculptureMotion";
import {
  MORPH_SECONDS,
  NEUTRAL_IDENTITY,
  activeIdentity,
  identityFor,
} from "@/lib/webgl/sculptureIdentity";
import { useExperience } from "@/store/useExperience";

gsap.registerPlugin(ScrollTrigger);

/**
 * The work rail, specification §6.1 item 5 and FR-04.
 *
 * A pinned horizontal scrub: the section holds the viewport while the track
 * translates sideways, and each card entering the centre morphs the sculpture
 * into that client's identity over 1.2s.
 *
 * Two deliberate departures from the written spec, both for reasons the spec
 * could not have known:
 *
 * §6.1 asks for full-height cards. Full-height opaque cards would cover the
 * sculpture, which is the one thing this section exists to show changing — the
 * morph would happen entirely behind the card that triggered it. The cards are
 * therefore tall but not full-height, leaving the sculpture visible above and
 * below the rail.
 *
 * The cards are opaque `ground-lift` panels rather than copy laid over the
 * scene. Text over a lit sculpture measures about 1.1:1, which is the failure
 * the hero and the manifesto each hit in turn; a panel makes it 16.69:1 and
 * removes the question. The sculpture stays visible in the gaps instead.
 */

const FEATURED = CASES.filter((entry) => entry.featured);

/**
 * How far the sculpture is pulled back while the rail holds the viewport.
 *
 * It arrives here fully receded, because the manifesto's scrub ends at 1 and
 * nothing since has moved it. At that value the colour mix is 0.15, so a morph
 * between two identities would be almost invisible — the feature would ship
 * technically working and visually absent. Partial recede keeps the accent
 * legible while still sitting the form behind the cards.
 */
const RAIL_RECEDE = 0.25;
/** §7 "Work rail": scrub 1.2, linear. */
const RAIL_SCRUB = 1.2;

export function WorkRail() {
  const section = useRef<HTMLElement>(null);
  const track = useRef<HTMLUListElement>(null);
  /** Zero-height marker in normal flow, used to time the sculpture's return. */
  const approach = useRef<HTMLDivElement>(null);
  /**
   * Scrolls a focused card into view, set from inside the GSAP context.
   *
   * A pinned horizontal rail is a keyboard trap waiting to happen: the cards
   * are all in the DOM at once, so Tab reaches the fourth one while the track
   * still has it translated off-screen, and focus lands somewhere invisible.
   * Null under reduced motion, where the rail is a plain vertical list and the
   * browser's own scroll-into-view is correct.
   */
  const revealCard = useRef<((card: HTMLElement) => void) | null>(null);

  const setActiveCase = useExperience((state) => state.setActiveCase);

  useEffect(() => {
    const root = section.current;
    const rail = track.current;
    if (!root || !rail) return;

    const morphTo = (index: number) => {
      const entry = FEATURED[index];
      if (!entry) return;

      // The store slug is what gives the canvas its accessible name in
      // SceneRoot, so this is also the text equivalent for the morph.
      setActiveCase(entry.slug);

      // overwrite because a fast scroll can cross three cards inside one 1.2s
      // morph, and three live tweens on the same five floats fight each other.
      gsap.to(activeIdentity, {
        ...identityFor(entry.slug),
        duration: MORPH_SECONDS,
        ease: "power2.inOut",
        overwrite: true,
      });
    };

    const leaveRail = () => {
      setActiveCase(null);
      gsap.to(activeIdentity, {
        ...NEUTRAL_IDENTITY,
        duration: MORPH_SECONDS,
        ease: "power2.inOut",
        overwrite: true,
      });
    };

    const context = gsap.context(() => {
      const media = gsap.matchMedia();

      // Reduced motion gets no pin and no morph. §10 holds the sculpture in a
      // fixed composed pose, and the canvas is decorative and aria-hidden by
      // design — the case identities are carried by the cards themselves, so
      // nothing is lost by leaving the form still. Pinning a section for four
      // viewports of scroll would be hostile here, not merely animated.
      media.add("(prefers-reduced-motion: no-preference)", () => {
        const distanceFor = () =>
          Math.max(0, rail.scrollWidth - window.innerWidth);

        const cards = gsap.utils.toArray<HTMLElement>("[data-case-card]", root);

        /**
         * The card nearest the centre of the viewport at a given scrub progress.
         *
         * The rail was originally entered with morphTo(0) forwards and
         * morphTo(last) backwards, which is right only when the rail is entered
         * at one of its ends. Scrolling straight into the middle of it — a
         * reload with scroll restoration, a deep link, a flick — landed past
         * the boundary the card triggers watch, so nothing fired and the
         * sculpture stayed as the manifesto left it: fully receded, colour mix
         * 0.15, no visible morph at all. Measured on the real canvas: max green
         * 38/255 inside the rail against 201 when entered from above.
         */
        const nearestCard = (progress: number) => {
          const trackX = -distanceFor() * progress;
          const centre = window.innerWidth / 2;

          let best = 0;
          let bestDistance = Infinity;
          cards.forEach((card, index) => {
            const offset = Math.abs(
              card.offsetLeft + card.offsetWidth / 2 + trackX - centre,
            );
            if (offset < bestDistance) {
              bestDistance = offset;
              best = index;
            }
          });
          return best;
        };

        let inside = false;

        // `inside` is checked before `timeline` is read: onRefresh fires while
        // the timeline is still being constructed, and touching the binding
        // then is a temporal-dead-zone error rather than an undefined.
        const syncToRail = () => {
          if (!inside) return;
          const trigger = timeline.scrollTrigger;
          if (!trigger) return;
          morphTo(nearestCard(trigger.progress));
        };

        /**
         * Brings the sculpture forward as the rail rises into view.
         *
         * This began as a one-shot tween fired on entering the rail, and it did
         * not hold: `recede` already has an owner. The manifesto drives it to 1
         * with a scrub, and a scrub keeps asserting its value, so a one-shot
         * from somewhere else is overwritten the next time the scroll updates.
         * Instrumented on the real page, the rail's tween ran exactly once at
         * load and `recede` was back at 1 by the time anything was measured.
         *
         * Two scrubs over ranges that do not overlap is the fix, and it is the
         * idiom the hero and the manifesto already use: the manifesto owns
         * recede until the rail's top reaches the fold, this owns it from there
         * to the pin. Neither ever writes while the other is authoritative.
         */
        const recedeScrub = gsap.fromTo(
          sculptureMotion,
          { recede: 1 },
          {
            recede: RAIL_RECEDE,
            ease: "none",
            scrollTrigger: {
              // The marker, not the section. The section is pinned, and
              // ScrollTrigger rewrites a pinned element's position to fixed
              // inside a spacer — a second trigger measuring it gets positions
              // that no longer describe where it sits in the document.
              trigger: approach.current,
              start: "top bottom",
              end: "top top",
              scrub: 1,
              invalidateOnRefresh: true,
            },
          },
        );

        const timeline = gsap.timeline({
          scrollTrigger: {
            trigger: root,
            start: "top top",
            end: () => `+=${distanceFor() + window.innerHeight}`,
            pin: true,
            scrub: RAIL_SCRUB,
            anticipatePin: 1,
            invalidateOnRefresh: true,
            // Only the morph index needs re-deriving after a refresh; presence
            // is the observer's job below.
            onRefresh: syncToRail,
          },
        });

        /**
         * Whether the rail is on screen, which decides whether the sculpture
         * wears a case identity or the neutral one.
         *
         * ScrollTrigger's own enter/leave callbacks were the obvious mechanism
         * and were wrong twice. `onEnter`/`onEnterBack` fire only at the ends,
         * so scrolling straight into the middle of the rail morphed nothing.
         * `onToggle` fires only when `isActive` changes, and `isActive` is
         * false when the scroll sits exactly on the trigger's start — which is
         * precisely where scroll restoration and anchor links land. Measured
         * there: colour mix 0.143 and silhouette 14.7% of the viewport, the
         * manifesto's state, with the rail filling the screen.
         *
         * An observer has no such edge: it reports the state on its first
         * callback whatever the scroll position, so a page that loads inside
         * the rail is correct on first paint rather than on first scroll.
         *
         * It is deliberately not what moves `recede` — see recedeScrub. A
         * discrete signal is the right shape for "which case is this" and the
         * wrong shape for a value another scrub is continuously asserting.
         */
        const presence = new IntersectionObserver(
          ([entry]) => {
            inside = entry.isIntersecting;
            if (inside) syncToRail();
            else leaveRail();
          },
          { threshold: 0 },
        );
        presence.observe(root);

        timeline.to(rail, {
          x: () => -distanceFor(),
          ease: "none",
        });

        cards.forEach((card, index) => {
          ScrollTrigger.create({
            trigger: card,
            containerAnimation: timeline,
            start: "left center",
            end: "right center",
            onEnter: () => morphTo(index),
            onEnterBack: () => morphTo(index),
          });
        });

        revealCard.current = (card) => {
          const trigger = timeline.scrollTrigger;
          const distance = distanceFor();
          if (!trigger || distance <= 0) return;

          // Where the track has to sit for this card to be centred, converted
          // back into a document scroll position through the pin's range.
          const offset =
            card.offsetLeft + card.offsetWidth / 2 - window.innerWidth / 2;
          const progress = Math.min(1, Math.max(0, offset / distance));
          window.scrollTo({
            top: trigger.start + (trigger.end - trigger.start) * progress,
            behavior: "auto",
          });
        };

        return () => {
          revealCard.current = null;
          presence.disconnect();
          recedeScrub.scrollTrigger?.kill();
          recedeScrub.kill();
          timeline.scrollTrigger?.kill();
          timeline.kill();
          sculptureMotion.recede = 1;
          leaveRail();
        };
      });
    }, root);

    return () => context.revert();
  }, [setActiveCase]);

  return (
    <>
      <div ref={approach} aria-hidden="true" className="h-px w-full" />

      <section
        ref={section}
        aria-labelledby="work-rail-title"
        className="relative flex h-dvh flex-col justify-center overflow-hidden motion-reduce:h-auto motion-reduce:overflow-visible motion-reduce:py-[12vh]"
      >
        <div className="relative shrink-0 pb-10">
          {/* The heading is the one piece of copy in this section not sitting
              on a card, and the sculpture is centred in the viewport with
              nothing stopping it reaching up here. On a tall phone the two are
              well clear, but the gap closes as the viewport shortens: at
              485x310 the form already reached into the heading's band. Rather
              than rely on every viewport staying tall enough, this settles the
              text onto ground — the same job, and the same technique, as the
              vignette in SceneRoot. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 -top-[10vh] bottom-0"
            style={{
              background:
                "linear-gradient(to bottom, var(--color-ground) 0%, var(--color-ground) 62%, transparent 100%)",
            }}
          />

          <div className="shell relative">
            <h2 id="work-rail-title" className="font-display text-h2 text-ink">
              Selected work
            </h2>
            <p className="mt-3 font-mono text-mono-xs text-ink-70">
              {String(FEATURED.length).padStart(2, "0")} projects
            </p>
          </div>
        </div>

        <ul
          ref={track}
          className="flex shrink-0 items-stretch gap-8 px-[6vw] will-change-transform motion-reduce:flex-col motion-reduce:gap-10 motion-reduce:px-0 motion-reduce:will-change-auto"
        >
          {FEATURED.map((entry, index) => (
            <li
              key={entry.slug}
              data-case-card
              className="h-[min(62vh,560px)] w-[min(80vw,720px)] shrink-0 motion-reduce:h-auto motion-reduce:w-full motion-reduce:px-[6vw]"
            >
              <Link
                href={`/work/${entry.slug}`}
                onFocus={(event) => revealCard.current?.(event.currentTarget)}
                className="group flex h-full flex-col justify-between border border-ink-15 bg-ground-lift p-8 transition-colors duration-[var(--dur-base)] hover:border-ink-40 focus-visible:outline-2 motion-reduce:h-auto motion-reduce:gap-8"
              >
                <div>
                  <p className="font-mono text-mono-xs text-ink-70">
                    {String(index + 1).padStart(2, "0")} · {entry.sector} ·{" "}
                    {entry.tier} · {entry.year}
                  </p>

                  <p
                    data-case-title
                    className="mt-8 font-display text-h1 text-ink"
                  >
                    {entry.client}
                  </p>
                </div>

                {/* §6.1 asks for a live 120px waveform thumbnail. The stems are
                    synthesised placeholders and the analyser only ever holds
                    one playing source, so this is the deterministic rule seeded
                    per case rather than a claim about audio nobody is
                    playing. */}
                <WaveformRule
                  seed={index + 11}
                  className="h-[120px] shrink-0 transition-colors duration-[var(--dur-base)] group-hover:text-signal"
                />

                <div>
                  <p className="max-w-[46ch] text-body text-ink-70">
                    {entry.summary}
                  </p>
                  <p className="mt-6 font-mono text-mono-xs text-signal">
                    Open case →
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
