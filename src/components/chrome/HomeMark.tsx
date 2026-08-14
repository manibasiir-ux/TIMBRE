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
      className="fixed top-4 left-4 z-[9000] inline-flex min-h-11 items-center px-3 font-display text-mono tracking-[0.14em] text-ink-70 uppercase transition-colors duration-[var(--dur-quick)] hover:text-signal focus-visible:text-signal sm:top-6 sm:left-6"
    >
      TIMBRE
    </Link>
  );
}
