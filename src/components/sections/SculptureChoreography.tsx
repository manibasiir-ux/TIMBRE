"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect } from "react";

import { recedeAt, sculptureMotion } from "@/lib/motion/sculptureMotion";
import { requestSculptureRender } from "@/lib/motion/sculptureRender";

gsap.registerPlugin(ScrollTrigger);

/**
 * How present the sculpture is down the home page, §6.1 items 4 and 5.
 *
 * This is a page-level concern rather than a section-level one, and putting it
 * anywhere else is what broke it. The manifesto owned "withdraw behind my copy"
 * and the work rail owned "come back so the morph is visible", both as scrubbed
 * tweens on the same property, and a scrubbed tween re-asserts its clamped value
 * on every scroll update — so each section overwrote the other. Neither was
 * wrong on its own; there were simply two of them.
 *
 * One trigger spans both sections and one pure function shapes the curve, so
 * there is a single writer and no boundary between triggers to get wrong. The
 * shape itself lives in recedeAt, where it can be tested without a browser.
 *
 * The withdraw also begins much later than it used to. It was keyed to the
 * manifesto's top entering the viewport, and since the hero is exactly one
 * screen tall that condition is already true at scroll position zero: the fade
 * started on the first pixel of scroll and finished within half a screen, on top
 * of the hero's own scrub. §7 grows displacement gain from 1 to 2.4 and orbits
 * the camera through 0.9 radians across the hero, and none of it was visible
 * under a fade that had already started. The hero now gets its own screen.
 */

/** Where the range opens, as a ScrollTrigger viewport offset on the manifesto. */
const RANGE_START = "top 60%";

export function SculptureChoreography() {
  useEffect(() => {
    const manifesto = document.querySelector<HTMLElement>(
      '[data-choreo="manifesto"]',
    );
    if (!manifesto) return;
    const rail = document.querySelector<HTMLElement>('[data-choreo="rail"]');

    const context = gsap.context(() => {
      const media = gsap.matchMedia();

      media.add("(prefers-reduced-motion: no-preference)", () => {
        const apply = (self: ScrollTrigger) => {
          sculptureMotion.recede = recedeAt(self.progress);
        };

        const trigger = ScrollTrigger.create({
          trigger: manifesto,
          start: RANGE_START,
          // The rail's marker sits in normal flow above the section itself,
          // which is pinned — and a pinned element reports positions that no
          // longer describe where it is in the document. Without a rail the
          // range simply ends with the manifesto.
          endTrigger: rail ?? manifesto,
          end: rail ? "top top" : "bottom top",
          invalidateOnRefresh: true,
          onUpdate: apply,
          onRefresh: apply,
        });

        return () => {
          trigger.kill();
          sculptureMotion.recede = 0;
        };
      });

      // Under reduced motion there is no scrub to hide behind, so the sculpture
      // simply sits withdrawn wherever the manifesto is on screen. The canvas
      // renders on demand there, so the value has to be accompanied by a request
      // for a frame or nothing reaches the screen.
      media.add("(prefers-reduced-motion: reduce)", () => {
        const trigger = ScrollTrigger.create({
          trigger: manifesto,
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
    });

    return () => context.revert();
  }, []);

  return null;
}
