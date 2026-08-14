"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

import {
  SCULPTURE_SCROLL,
  sculptureMotion,
} from "@/lib/motion/sculptureMotion";
import { caseSlugOf } from "@/lib/motion/routeDialects";
import { requestSculptureRender } from "@/lib/motion/sculptureRender";
import {
  activeIdentity,
  identityFor,
  resetIdentity,
} from "@/lib/webgl/sculptureIdentity";

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

    // Identity follows the destination rather than being thrown away.
    //
    // This used to reset unconditionally, to stop the rail's current client
    // leaking onto every subsequent route. That solved the leak by discarding
    // all identity, which also meant clicking Kestrel in the rail opened
    // Kestrel's case study under a neutral blob — the one place the form should
    // obviously persist. Choosing by destination fixes both: a case study wears
    // its own identity, everything else resets.
    //
    // It also fixes the case nobody was looking at. A case study opened from a
    // shared link, with no rail involved, now arrives wearing its own form
    // instead of the neutral one.
    const slug = caseSlugOf(pathname);
    if (slug) {
      Object.assign(activeIdentity, identityFor(slug));
    } else {
      resetIdentity();
    }

    // Under reduced motion the canvas renders on demand, so none of the above
    // reaches the screen without asking for a frame.
    requestSculptureRender();
  }, [pathname]);

  return null;
}
