"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Link from "next/link";
import { useEffect, useRef } from "react";

import { SERVICE_LINES } from "@/content/services";

gsap.registerPlugin(ScrollTrigger);

/**
 * The service ticker, specification §6.1 item 6.
 *
 * One marquee line of the six service names at 40px/s, separated by a signal
 * diamond, running right to left and reversing with scroll direction. It is the
 * only place on the homepage that says what the studio actually sells.
 *
 * The list is rendered twice. A marquee that translates a single copy has to
 * jump back to the start, and at this size the jump is visible; two copies mean
 * the second is exactly where the first began, so the loop closes on itself.
 * `aria-hidden` on the duplicate, because a screen reader should hear six
 * services, not twelve.
 */

const SPEED_PX_PER_SECOND = 40;

export function ServiceTicker() {
  const scope = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const first = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const root = scope.current;
    const rail = track.current;
    const copy = first.current;
    if (!root || !rail || !copy) return;

    const context = gsap.context(() => {
      const media = gsap.matchMedia();

      // §10: no marquee under reduced motion. A line of text moving sideways
      // forever is the clearest case of decorative motion on the page, and the
      // list below reads perfectly well standing still.
      media.add("(prefers-reduced-motion: no-preference)", () => {
        const width = copy.offsetWidth;
        if (width === 0) return;

        const marquee = gsap.to(rail, {
          x: -width,
          duration: width / SPEED_PX_PER_SECOND,
          ease: "none",
          repeat: -1,
        });

        // §6.1: direction reverses with scroll direction. It ties the one piece
        // of autonomous motion on the page to something the visitor is doing,
        // so it reads as responsive rather than as an animated banner.
        const trigger = ScrollTrigger.create({
          onUpdate: (self) => {
            marquee.timeScale(self.direction === -1 ? -1 : 1);
          },
        });

        return () => {
          trigger.kill();
          marquee.kill();
          gsap.set(rail, { x: 0 });
        };
      });
    }, root);

    return () => context.revert();
  }, []);

  const items = (
    <>
      {SERVICE_LINES.map((service) => (
        <li key={service.number} className="flex shrink-0 items-center gap-8">
          <span className="font-display text-h2 whitespace-nowrap text-ink">
            {service.name}
          </span>
          <span aria-hidden="true" className="text-h2 text-signal">
            ◆
          </span>
        </li>
      ))}
    </>
  );

  return (
    <section
      ref={scope}
      aria-labelledby="services-ticker-title"
      className="relative overflow-hidden border-y border-ink-15 py-10"
    >
      <h2 id="services-ticker-title" className="sr-only">
        What we make
      </h2>

      <div
        ref={track}
        className="flex w-max motion-reduce:w-full motion-reduce:flex-wrap"
      >
        <ul
          ref={first}
          className="flex shrink-0 items-center gap-8 pr-8 motion-reduce:flex-wrap motion-reduce:gap-x-8 motion-reduce:gap-y-4"
        >
          {items}
        </ul>
        <ul
          aria-hidden="true"
          className="flex shrink-0 items-center gap-8 pr-8 motion-reduce:hidden"
        >
          {items}
        </ul>
      </div>

      {/* The names are the marquee; this is where they lead. Without it the
          ticker is decoration that happens to contain nouns. */}
      <p className="shell mt-8 font-mono text-mono-xs text-ink-70">
        <Link
          href="/services"
          className="text-signal underline-offset-4 hover:underline"
        >
          All six service lines, packages and price bands →
        </Link>
      </p>
    </section>
  );
}
