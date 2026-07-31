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

export const SECTIONS: readonly Section[] = [
  { id: "home", label: "Home", href: "/", available: true },
  { id: "work", label: "Work", href: "/work", available: true },
  { id: "services", label: "Services", href: "/services", available: true },
  { id: "studio", label: "Studio", href: "/studio", available: true },
  { id: "process", label: "Process", href: "/process", available: true },
  // Journal is the one route still unbuilt: it is genuinely prose and wants
  // MDX, which is a dependency the project has not taken on yet.
  { id: "journal", label: "Journal", href: "/journal", available: false },
  { id: "brief", label: "Brief", href: "/brief", available: true },
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
