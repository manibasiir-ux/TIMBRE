import { getDictionary } from "@/lib/i18n";

/**
 * The seven channels of the mixing desk, specification §8.
 *
 * `available` records whether the route actually exists yet. A channel for a
 * page that has not been built navigates nowhere, and a desk that silently
 * 404s is worse than one that says so, so unbuilt channels render disabled with
 * a mono tag rather than pretending. Flip these as the routes land.
 */

export type Section = {
  id: string;
  label: string;
  href: string;
  available: boolean;
};

/**
 * Labels come from the dictionary rather than being written here, NFR-15. The
 * id is the key, so a translated build needs no change to this file and a
 * missing key is a type error rather than a blank channel strip.
 */
const nav = getDictionary().labels.nav;

export const SECTIONS: readonly Section[] = [
  { id: "home", label: nav.home, href: "/", available: true },
  { id: "work", label: nav.work, href: "/work", available: true },
  { id: "services", label: nav.services, href: "/services", available: true },
  { id: "studio", label: nav.studio, href: "/studio", available: true },
  { id: "process", label: nav.process, href: "/process", available: true },
  { id: "journal", label: nav.journal, href: "/journal", available: true },
  { id: "brief", label: nav.brief, href: "/brief", available: true },
] as const;

/** Two-digit channel number, `01`…`07`. */
export function channelNumber(index: number): string {
  return String(index + 1).padStart(2, "0");
}

/**
 * The announcement a fader gives a screen reader.
 *
 * The roadmap records this as one of the eleven serious accessibility defects:
 * the slider reported a bare number, so VoiceOver said "forty" with no unit and
 * no context. WCAG 2.2's slider pattern wants aria-valuetext whenever the
 * number alone is not self-describing.
 */
export function faderValueText(label: string, progress: number): string {
  return `${label}, ${Math.round(progress * 100)} percent`;
}
