/**
 * The client wall, specification §6.1 item 7.
 *
 * §6.1 asks for a 5x3 grid of logos. There are no logos: the studio is a
 * placeholder and so is everyone it has worked for. Rather than commission
 * fifteen invented marks, these render as wordmarks in the display face, which
 * is what a wall of client names looks like before the artwork arrives and is
 * honest about being names rather than pretending to be brands.
 *
 * The four with `cased: true` are the ones with case studies behind them, so the
 * wall and the rail cannot drift apart. The rest are the same kind of invented
 * placeholder as the case copy — plausible companies in the sectors the studio
 * sells into, all of them fictional. Replace the whole file when real clients
 * exist; nothing else reads it.
 */

export type Client = {
  name: string;
  sector: string;
  /** True where a case study exists, so the wall stays truthful about depth. */
  cased: boolean;
};

export const CLIENTS: readonly Client[] = [
  { name: "Kestrel", sector: "Fintech", cased: true },
  { name: "Halcyon Mobility", sector: "Mobility", cased: true },
  { name: "Solene Group", sector: "Hospitality", cased: true },
  { name: "Meridian Air", sector: "Aviation", cased: true },
  { name: "Northwind Rail", sector: "Transport", cased: false },
  { name: "Arbor Health", sector: "Healthcare", cased: false },
  { name: "Vantage Retail", sector: "Retail", cased: false },
  { name: "Lumen Energy", sector: "Utilities", cased: false },
  { name: "Cobalt Bank", sector: "Fintech", cased: false },
  { name: "Fathom Media", sector: "Broadcast", cased: false },
  { name: "Aster Foods", sector: "CPG", cased: false },
  { name: "Pellon Sport", sector: "Apparel", cased: false },
  { name: "Quire Publishing", sector: "Publishing", cased: false },
  { name: "Estuary Hotels", sector: "Hospitality", cased: false },
  { name: "Talon Logistics", sector: "Logistics", cased: false },
];
