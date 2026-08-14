"use client";

import gsap from "gsap";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

import {
  dialectFor,
  returning,
  type RouteDialect,
} from "@/lib/motion/routeDialects";

/**
 * The route transition, specification §7.
 *
 * The screen is covered in the same frame as the click, and the blades sweep
 * away once the new route has rendered. See routeDialects for why it is this
 * way round and what each dialect means.
 *
 * The link is never intercepted. `next/link` runs its own click handler and
 * navigates regardless of `preventDefault`, so an earlier attempt to cover
 * first and push afterwards produced two navigations and reinstated the flash
 * it was meant to remove. Covering instantly needs no interception at all —
 * middle-click, cmd-click and shift-click return before any of this and are
 * untouched.
 *
 * Browser back is covered too, on `popstate`. It is the same journey and should
 * not look different for having used a different control.
 *
 * Nothing here runs under reduced motion. Blades crossing the viewport are the
 * largest movement on the site and §10 is unambiguous.
 */

/** The most blades any dialect asks for. Rendered once, sized per transition. */
const MAX_BLADES = 6;

/**
 * If a navigation never completes, nothing would sweep the blades away and a
 * covered viewport would simply stay covered. Whichever of the route change and
 * this timer fires first wins; `overwrite: true` stops the loser re-covering.
 */
const STRAND_GUARD_MS = 2400;

export function RouteWipe() {
  const stage = useRef<HTMLDivElement>(null);
  const blades = useRef<(HTMLDivElement | null)[]>([]);
  const dialect = useRef<RouteDialect>(dialectFor("/"));
  const guard = useRef<number | null>(null);
  /** Only sweep away a cover this component actually placed. */
  const covered = useRef(false);
  const pathname = usePathname();
  const previous = useRef(pathname);

  useEffect(() => {
    const element = stage.current;
    if (!element) return;

    const media = gsap.matchMedia();

    media.add("(prefers-reduced-motion: no-preference)", () => {
      const park = () => {
        gsap.set(blades.current.filter(Boolean), {
          xPercent: 0,
          yPercent: 0,
          display: "none",
        });
        covered.current = false;
      };

      const sweepAway = () => {
        if (!covered.current) return;
        const next = dialect.current;
        const axis = next.axis === "x" ? "xPercent" : "yPercent";
        const active = blades.current.slice(0, next.blades);

        gsap.to(active, {
          [axis]: next.to,
          duration: next.sweep,
          stagger: next.stagger,
          ease: "power3.inOut",
          overwrite: true,
          onComplete: park,
        });
      };

      /**
       * Covers in one frame, with no tween, so there is no window in which the
       * destination can paint before the blades are in place.
       */
      const coverNow = (next: RouteDialect) => {
        dialect.current = next;
        const size = `${100 / next.blades}%`;

        gsap.set(element, {
          flexDirection: next.axis === "x" ? "column" : "row",
        });

        blades.current.forEach((blade, index) => {
          if (!blade) return;
          const used = index < next.blades;
          gsap.set(blade, {
            display: used ? "block" : "none",
            width: next.axis === "x" ? "100%" : size,
            height: next.axis === "x" ? size : "100%",
            backgroundColor: "var(--color-ground-deep)",
            boxShadow:
              next.axis === "x"
                ? `inset 0 -3px 0 0 ${next.edge}`
                : `inset -3px 0 0 0 ${next.edge}`,
            // Both axes every time. Setting only the one in play left the
            // vertical dialect animating a full viewport off to the left, where
            // it ran perfectly and invisibly.
            xPercent: 0,
            yPercent: 0,
          });
        });

        covered.current = true;

        if (guard.current) window.clearTimeout(guard.current);
        guard.current = window.setTimeout(sweepAway, STRAND_GUARD_MS);
      };

      const onClick = (event: MouseEvent) => {
        // Anything but a plain left click is the browser's business, not ours:
        // a new tab should not cover the tab it was opened from.
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
        // A link to where we already are swaps nothing, so it covers nothing.
        if (destination.pathname === window.location.pathname) return;

        coverNow(dialectFor(destination.pathname));
      };

      const onPopState = () => {
        // location is already the destination by the time popstate fires.
        // `returning` flips the direction so every backward journey sweeps the
        // same way, whichever page it lands on.
        coverNow(returning(dialectFor(window.location.pathname)));
      };

      document.addEventListener("click", onClick, true);
      window.addEventListener("popstate", onPopState);

      return () => {
        document.removeEventListener("click", onClick, true);
        window.removeEventListener("popstate", onPopState);
        if (guard.current) window.clearTimeout(guard.current);
        park();
      };
    });

    return () => media.revert();
  }, []);

  // Driven by the route having actually changed rather than by a timer, so a
  // slow chunk stays covered for as long as it needs to be.
  useEffect(() => {
    if (previous.current === pathname) return;
    previous.current = pathname;

    if (guard.current) {
      window.clearTimeout(guard.current);
      guard.current = null;
    }

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!covered.current) return;

    const next = dialect.current;
    const axis = next.axis === "x" ? "xPercent" : "yPercent";
    const active = blades.current.slice(0, next.blades);

    gsap.to(active, {
      [axis]: next.to,
      duration: next.sweep,
      stagger: next.stagger,
      ease: "power3.inOut",
      overwrite: true,
      onComplete: () => {
        gsap.set(blades.current.filter(Boolean), {
          xPercent: 0,
          yPercent: 0,
          display: "none",
        });
        covered.current = false;
      },
    });

    /**
     * Opacity only. Animating `y` here leaves a transform on `main`, and a
     * transformed ancestor becomes the containing block for every
     * `position: fixed` descendant — including the work rail's ScrollTrigger
     * pin, which then measured itself against `main` instead of the viewport
     * and lost the whole section until it had scrolled past.
     */
    const main = document.getElementById("main");
    if (main) {
      gsap.fromTo(
        main,
        { opacity: 0.55 },
        {
          opacity: 1,
          duration: 0.55,
          ease: "power2.out",
          overwrite: "auto",
          clearProps: "opacity",
        },
      );
    }
  }, [pathname]);

  return (
    <div
      ref={stage}
      aria-hidden="true"
      // overflow-hidden so a blade parked outside the viewport can never widen
      // the document — an earlier version produced a horizontal scrollbar and a
      // strip of dead space down the side of every page.
      className="pointer-events-none fixed inset-0 z-[9500] flex flex-col overflow-hidden motion-reduce:hidden"
    >
      {Array.from({ length: MAX_BLADES }).map((_, index) => (
        <div
          key={index}
          ref={(node) => {
            blades.current[index] = node;
          }}
          className="hidden w-full"
        />
      ))}
    </div>
  );
}
