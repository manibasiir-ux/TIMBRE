"use client";

import gsap from "gsap";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * The route transition, specification §7 ("Signal wipe 0→100% width, content
 * swap, wipe out", 0.45s each way on --ease-transport).
 *
 * A band of signal sweeps across, the route changes underneath it, and it
 * sweeps off the other side. It exists because navigation was instant and
 * therefore invisible: on a site whose whole conceit is a single continuous
 * scene, a page that simply replaces itself reads as a broken illusion rather
 * than as a fast one.
 *
 * Navigation is never delayed to play it. Intercepting a click to run an
 * animation first makes the site slower to use in exchange for looking
 * smoother, and gets middle-click, ⌘-click and shift-click wrong in the
 * process. The wipe covers a swap that is already happening.
 *
 * Nothing here runs under reduced motion. A full-bleed band crossing the
 * viewport is the largest movement on the site, and §10 is unambiguous.
 */

/** §7: 0.45s in, 0.45s out. */
const SWEEP = 0.45;

export function RouteWipe() {
  const band = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const previous = useRef(pathname);

  useEffect(() => {
    const element = band.current;
    if (!element) return;

    const media = gsap.matchMedia();

    media.add("(prefers-reduced-motion: no-preference)", () => {
      const cover = () =>
        gsap.fromTo(
          element,
          { scaleX: 0, transformOrigin: "left center" },
          {
            scaleX: 1,
            duration: SWEEP,
            ease: "power3.inOut",
            overwrite: true,
          },
        );

      const onClick = (event: MouseEvent) => {
        // Anything but a plain left click is the browser's business, not ours:
        // a new tab should not sweep the tab it was opened from.
        if (
          event.defaultPrevented ||
          event.button !== 0 ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey
        ) {
          return;
        }

        const link = (event.target as HTMLElement | null)?.closest("a");
        if (!link || link.target === "_blank" || link.hasAttribute("download")) {
          return;
        }

        const href = link.getAttribute("href");
        if (!href || href.startsWith("#") || href.startsWith("mailto:")) return;

        const destination = new URL(link.href, window.location.href);
        if (destination.origin !== window.location.origin) return;
        // A link to where we already are swaps nothing, so it should sweep
        // nothing.
        if (destination.pathname === window.location.pathname) return;

        cover();
      };

      document.addEventListener("click", onClick, true);

      return () => {
        document.removeEventListener("click", onClick, true);
        gsap.set(element, { scaleX: 0 });
      };
    });

    return () => media.revert();
  }, []);

  // The uncover half, driven by the route actually having changed rather than
  // by a timer — so a slow chunk is covered for as long as it needs to be.
  useEffect(() => {
    const element = band.current;
    if (!element || previous.current === pathname) return;
    previous.current = pathname;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    gsap.to(element, {
      scaleX: 0,
      transformOrigin: "right center",
      duration: SWEEP,
      ease: "power3.inOut",
      overwrite: true,
    });
  }, [pathname]);

  return (
    <div
      ref={band}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[9500] origin-left scale-x-0 bg-signal motion-reduce:hidden"
    />
  );
}
