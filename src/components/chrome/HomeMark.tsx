"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { getDictionary } from "@/lib/i18n";

/**
 * The wordmark, top left, on every route except home.
 *
 * A site whose navigation is a mixing desk still has to answer "how do I get
 * back" without the visitor discovering the desk first. A wordmark in the top
 * left is the one convention nobody has to be taught, and it doubles as the
 * branding the site otherwise only shows in the hero.
 *
 * It is an addition, not a replacement. The browser's own back button keeps
 * working exactly as it did, the desk still lists HOME, and the footer is
 * unchanged — this is a third way to do something that already had two, chosen
 * because it is the one people reach for without thinking.
 *
 * Hidden on home, where it would link to the page it is already on. §10's
 * keyboard path puts it directly after the skip link, which is where a logo is
 * expected to be and where a screen-reader user will look for it.
 *
 * The transition it plays is the HOME dialect: the only one of the set that
 * travels right to left. Returning should not feel like arriving.
 */
export function HomeMark() {
  const pathname = usePathname();
  if (pathname === "/") return null;

  const ui = getDictionary();

  return (
    <Link
      href="/"
      data-home-mark
      aria-label={ui.a11y.homeLabel}
      // Anchored into the corner with a ground panel behind it, mirroring
      // SiteControls on the right. Floating bare text over the page looked
      // cleaner at rest and collided the moment anything scrolled under it —
      // a case study's client name is set at text-mega and passed straight
      // through the wordmark. Chrome needs to read as chrome.
      className="fixed top-0 left-0 z-[9000] inline-flex min-h-11 items-center border-r border-b border-ink-15 bg-ground/80 px-4 font-display text-mono tracking-[0.14em] text-ink-70 uppercase backdrop-blur-md transition-colors duration-[var(--dur-quick)] hover:text-signal focus-visible:text-signal"
    >
      TIMBRE
    </Link>
  );
}
