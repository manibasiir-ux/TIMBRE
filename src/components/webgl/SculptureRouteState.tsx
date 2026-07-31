"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

import {
  SCULPTURE_SCROLL,
  sculptureMotion,
} from "@/lib/motion/sculptureMotion";

/**
 * Sets the sculpture's resting state for the current route.
 *
 * The canvas is mounted once and never unmounts (FR-05), which means it does
 * not know a route changed unless something tells it. Left alone it kept the
 * gain and presence the previous route's scroll had scrubbed it to, so a case
 * study inherited whatever the home page happened to be doing.
 *
 * Home composes the sculpture as the hero, so it starts fully present and the
 * hero and manifesto triggers drive it from there. Every other route is
 * editorial content laid over a backdrop, so the sculpture sits receded: at
 * full presence its lit peaks land under body copy at roughly 1.1:1, which is
 * the same contrast failure the hero and the manifesto each hit in turn.
 */
export function SculptureRouteState() {
  const pathname = usePathname();

  useEffect(() => {
    const isHome = pathname === "/";

    sculptureMotion.gain = SCULPTURE_SCROLL.gainFrom;
    sculptureMotion.orbit = SCULPTURE_SCROLL.orbitFrom;
    sculptureMotion.recede = isHome ? 0 : 1;
  }, [pathname]);

  return null;
}
