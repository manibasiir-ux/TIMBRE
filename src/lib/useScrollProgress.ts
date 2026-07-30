"use client";

import { useEffect } from "react";

import { useExperience } from "@/store/useExperience";

/**
 * Publishes document scroll progress, 0..1, into the experience store.
 *
 * The transport bar's scrub track shows this rather than audio position (§8),
 * which is what lets one strip answer "where am I" for both the page and the
 * reel. Reads are coalesced into a single animation frame because scroll fires
 * far more often than the screen updates.
 *
 * Lenis replaces the listener in the motion phase; the value it publishes and
 * everything reading it stay the same.
 */
export function useScrollProgress(): void {
  const setScrollProgress = useExperience((state) => state.setScrollProgress);

  useEffect(() => {
    let frame = 0;

    const measure = () => {
      const doc = document.documentElement;
      const scrollable = doc.scrollHeight - window.innerHeight;
      const progress =
        scrollable > 0
          ? Math.min(1, Math.max(0, window.scrollY / scrollable))
          : 0;
      setScrollProgress(progress);
    };

    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [setScrollProgress]);
}

/** Scrolls the document to a fraction of its scrollable height. */
export function scrollToProgress(progress: number): void {
  const doc = document.documentElement;
  const scrollable = doc.scrollHeight - window.innerHeight;
  if (scrollable <= 0) return;
  window.scrollTo({
    top: scrollable * Math.min(1, Math.max(0, progress)),
    behavior: "auto",
  });
}
