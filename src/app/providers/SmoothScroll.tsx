"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { useEffect } from "react";

import { usePrefersReducedMotion } from "@/lib/usePrefersReducedMotion";

gsap.registerPlugin(ScrollTrigger);

/**
 * Smooth scrolling and the ScrollTrigger bridge, design specification §7.1.
 *
 * Three lines of integration, and the specification's fourth was removed: v1.0
 * wrapped document.body in a ScrollTrigger.scrollerProxy. Lenis here is given no
 * wrapper or content, so it transforms native window scrolling and the real
 * document scroll position stays authoritative — ScrollTrigger already reads it
 * correctly. The proxy was registered against a scroller no trigger used, and
 * its scrollTop returned lenis.scrollTo(...), a setter, so any trigger that had
 * used it would have had reads and writes crossed.
 *
 * lagSmoothing is disabled rather than left at its default. GSAP's default lets
 * the clock fall behind real time after a stall so animations do not jump; for
 * scrub-linked motion that is exactly wrong, because the timeline would then
 * disagree with the scroll position that drives it.
 *
 * Under prefers-reduced-motion Lenis is never constructed. Specification §10
 * requires native scrolling there, not smoothed scrolling with shorter
 * durations.
 */
export function SmoothScroll({ children }: { children: React.ReactNode }) {
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    // ScrollTrigger still runs under reduced motion — it is what reveals
    // content on entry. Only the smoothing and the scrubbing are dropped.
    if (reducedMotion) {
      ScrollTrigger.refresh();
      return;
    }

    const lenis = new Lenis({
      duration: 1.15,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: "vertical",
      smoothWheel: true,
      // Native momentum on touch. Fighting iOS here produces a scroll that
      // feels wrong in a way users cannot name.
      syncTouch: false,
      touchMultiplier: 1.6,
      wheelMultiplier: 1,
    });

    lenis.on("scroll", ScrollTrigger.update);

    const raf = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);

    ScrollTrigger.refresh();

    return () => {
      gsap.ticker.remove(raf);
      lenis.destroy();
      ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
    };
  }, [reducedMotion]);

  // Pinned sections measure themselves during layout, and web fonts land after
  // it. Without this the trigger positions are computed against fallback
  // metrics and every pin sits a few pixels wrong.
  useEffect(() => {
    let cancelled = false;
    void document.fonts?.ready.then(() => {
      if (!cancelled) ScrollTrigger.refresh();
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return <>{children}</>;
}
