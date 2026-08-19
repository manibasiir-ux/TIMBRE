"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect, useRef } from "react";

import { WaveformRule } from "@/components/primitives/WaveformRule";

gsap.registerPlugin(ScrollTrigger);

/**
 * The five-phase timeline, specification §6.6.
 *
 * "A horizontally scrubbed five-phase timeline, pinned for 500vh. A signal
 * playhead travels left-to-right along a waveform track; each phase's content
 * fades in at its marker." This shipped as a plain vertical list for a long
 * time, which was honest but was not what the page is supposed to be — the
 * process is a sequence, and reading it as a sequence is the whole argument.
 *
 * ## Three states, and the vertical one is the base
 *
 * The markup is a vertical list first and becomes a horizontal track only where
 * that is wanted. §9 unpins this below `lg`, so on a phone and a tablet it stays
 * the list it always was, and §10 requires the same under reduced motion. Both
 * are expressed in CSS — `lg:flex-row` with `motion-reduce:flex-col` — so the
 * fallback is the default rather than something reconstructed when an effect
 * decides not to run.
 *
 * The GSAP context is scoped to the same query. Under reduced motion or below
 * 1024px nothing is registered at all: no pin, no scrub, no playhead. That
 * matters more than it sounds, because a pin left running on a layout that has
 * gone vertical is how a section ends up scrolling sideways into nothing.
 *
 * ## The playhead is driven by the timeline, not by its own trigger
 *
 * It reads the same progress the track does. Given its own ScrollTrigger it
 * would drift a frame or two out of step on a fast scroll, and a playhead that
 * disagrees with the thing it is supposed to be pointing at is worse than no
 * playhead.
 */

export type ProcessPhase = {
  number: string;
  name: string;
  body: string;
};

export function ProcessTimeline({
  phases,
}: {
  phases: readonly ProcessPhase[];
}) {
  const root = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLOListElement>(null);
  const playhead = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const section = root.current;
    const rail = track.current;
    if (!section || !rail) return;

    const context = gsap.context(() => {
      const media = gsap.matchMedia();

      media.add(
        "(min-width: 1024px) and (prefers-reduced-motion: no-preference)",
        () => {
          // Measured on refresh rather than once, so a resize or a font landing
          // late recomputes the travel instead of scrubbing to a stale figure.
          const distance = () => Math.max(0, rail.scrollWidth - window.innerWidth);

          const timeline = gsap.timeline({
            scrollTrigger: {
              trigger: section,
              start: "top top",
              end: () => `+=${distance() + window.innerHeight}`,
              pin: true,
              scrub: 1,
              anticipatePin: 1,
              invalidateOnRefresh: true,
              onUpdate: (self) => {
                if (!playhead.current) return;
                gsap.set(playhead.current, {
                  xPercent: -50,
                  left: `${self.progress * 100}%`,
                });
              },
            },
          });

          timeline.to(rail, { x: () => -distance(), ease: "none" });

          // Each phase arrives as it reaches the middle of the viewport, using
          // the pinned timeline as its scroller — the only way to trigger on
          // horizontal position inside a pinned section.
          const panels = gsap.utils.toArray<HTMLElement>(
            "[data-phase]",
            section,
          );
          for (const panel of panels) {
            gsap.from(panel.querySelector("[data-phase-body]"), {
              autoAlpha: 0,
              y: 28,
              duration: 0.6,
              ease: "power3.out",
              scrollTrigger: {
                trigger: panel,
                containerAnimation: timeline,
                start: "left 78%",
                toggleActions: "play none none reverse",
              },
            });
          }

          return () => {
            timeline.scrollTrigger?.kill();
            timeline.kill();
          };
        },
      );
    }, section);

    return () => context.revert();
  }, [phases]);

  return (
    <div
      ref={root}
      className="relative lg:h-dvh lg:overflow-hidden motion-reduce:lg:h-auto motion-reduce:lg:overflow-visible"
    >
      {/* The track the playhead runs along. Hidden below lg, where there is no
          playhead to run on it. */}
      <div className="pointer-events-none relative hidden lg:block motion-reduce:lg:hidden">
        <WaveformRule seed={6} className="text-ink-15" />
        <span
          ref={playhead}
          aria-hidden="true"
          className="absolute top-1/2 left-0 h-8 w-[3px] -translate-y-1/2 bg-signal"
        />
      </div>

      <ol
        ref={track}
        className="shell flex flex-col gap-16 py-[10vh] lg:h-full lg:flex-row lg:items-center lg:gap-24 lg:py-0 lg:pr-[20vw] motion-reduce:lg:flex-col motion-reduce:lg:gap-16 motion-reduce:lg:py-[10vh]"
      >
        {phases.map((phase) => (
          <li
            key={phase.number}
            data-phase
            className="border-t border-ink-15 pt-8 lg:w-[min(70vw,560px)] lg:shrink-0"
          >
            <p className="font-mono text-mono-xs text-signal">{phase.number}</p>
            <h2 className="mt-6 font-display text-h2 text-balance text-ink">
              {phase.name}
            </h2>
            <p
              data-phase-body
              className="mt-6 max-w-[52ch] text-body text-ink-70"
            >
              {phase.body}
            </p>
          </li>
        ))}
      </ol>
    </div>
  );
}
