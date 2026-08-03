"use client";

import gsap from "gsap";
import Link from "next/link";
import { useEffect, useRef } from "react";

import {
  MORPH_SECONDS,
  NEUTRAL_IDENTITY,
  activeIdentity,
} from "@/lib/webgl/sculptureIdentity";
import { requestSculptureRender } from "@/lib/motion/sculptureRender";

/**
 * The closing call to action, specification §6.1 item 9.
 *
 * §6.1 has the sculpture "collapse into a flat pulsing line" behind this, which
 * needed no new machinery in the end: a very low elongation on a untapered
 * round solid is a disc seen edge-on, and the identity system already tweens
 * elongation. The same 1.2s morph the rail uses carries it, so the form arrives
 * flattened as the words land on it.
 *
 * It reverses on the way out rather than on unmount alone, because this is the
 * last section on the page and scrolling back up is the common path.
 */

/** A disc thin enough to read as a line, and the widest form in the set. */
const FLATTENED = {
  square: 0,
  taper: 0,
  solid: 1,
  elongation: 0.08,
  bulk: 1.35,
  frequency: 1.2,
  ripple: 0.6,
  swell: 1,
} as const;

export function BriefSlab() {
  const scope = useRef<HTMLElement>(null);

  useEffect(() => {
    const root = scope.current;
    if (!root) return;

    const morph = (to: Record<string, number>) => {
      gsap.to(activeIdentity, {
        ...to,
        duration: MORPH_SECONDS,
        ease: "power2.inOut",
        overwrite: true,
        onUpdate: requestSculptureRender,
      });
    };

    const media = gsap.matchMedia();

    // Under reduced motion the sculpture holds its composed pose, so this
    // section leaves it alone entirely rather than morphing it more slowly.
    media.add("(prefers-reduced-motion: no-preference)", () => {
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) morph({ ...FLATTENED });
          else morph({ ...NEUTRAL_IDENTITY });
        },
        { threshold: 0.4 },
      );
      observer.observe(root);

      return () => {
        observer.disconnect();
        gsap.killTweensOf(activeIdentity);
        Object.assign(activeIdentity, NEUTRAL_IDENTITY);
      };
    });

    return () => media.revert();
  }, []);

  return (
    <section
      ref={scope}
      aria-labelledby="brief-slab-title"
      className="shell relative flex min-h-dvh flex-col justify-center py-[16vh]"
    >
      {/* The same technique as the hero lockup: a blurred solid inset further
          than its own blur radius, so the text sits on provably opaque ground
          at 17.84:1 rather than on whatever the sculpture is doing behind it. */}
      <div className="relative">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -z-10 block"
          style={{
            inset: "-72px",
            background: "var(--color-ground)",
            filter: "blur(40px)",
          }}
        />

        <h2
          id="brief-slab-title"
          className="font-display text-mega text-ink"
          aria-label="Let's make something audible"
        >
          <span aria-hidden="true" className="block">
            Let&rsquo;s make
          </span>
          <span aria-hidden="true" className="block lg:ml-[8.3%]">
            something
          </span>
          <span aria-hidden="true" className="block text-signal lg:ml-[16.6%]">
            audible
          </span>
        </h2>

        <div className="mt-16 flex flex-wrap items-center gap-x-10 gap-y-6">
          <Link
            href="/brief"
            className="inline-flex min-h-11 items-center bg-signal px-8 py-4 font-mono text-mono text-ground transition-opacity duration-[var(--dur-quick)] hover:opacity-90"
          >
            Brief us →
          </Link>

          {/* What happens next, stated before they commit. The roadmap records
              the brief's completion rate rising once the form said what it
              would cost the visitor in time. */}
          <p className="max-w-[38ch] text-body text-ink-70">
            Four short steps, about three minutes. You get a reference code and a
            reply within two working days.
          </p>
        </div>
      </div>
    </section>
  );
}
