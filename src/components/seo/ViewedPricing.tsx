"use client";

import { useEffect, useRef } from "react";

import { track } from "@/lib/analytics";

/**
 * `pricing_viewed`, NFR-14.
 *
 * Renders nothing. It fires when the price table is actually on screen rather
 * than when the services page loads, because those are different questions and
 * only the second one is worth knowing: the roadmap records publishing bands as
 * the highest-leverage decision on the project, and "did anyone scroll far
 * enough to see them" is how that decision gets judged.
 *
 * Once per page view. A number that counts scrolling past twice as engagement
 * is worse than no number.
 */
export function ViewedPricing() {
  const marker = useRef<HTMLDivElement>(null);
  const fired = useRef(false);

  useEffect(() => {
    const element = marker.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || fired.current) return;
        fired.current = true;
        track("pricing_viewed");
        observer.disconnect();
      },
      { threshold: 0.4 },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return <div ref={marker} aria-hidden="true" className="h-px w-full" />;
}
