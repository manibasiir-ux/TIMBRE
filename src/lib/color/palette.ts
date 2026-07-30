/**
 * The single source of truth for the palette, mirroring design specification §3.
 *
 * These values are duplicated as Tailwind tokens in globals.css because Tailwind
 * v4 declares its theme in CSS, not in TypeScript. The contrast test asserts
 * both copies agree, so a token edited in one place and not the other fails CI
 * rather than shipping.
 */

export const PALETTE = {
  ground: "#0B0B0C",
  groundLift: "#141416",
  groundDeep: "#050506",
  ink: "#F4F4F0",
  signal: "#E8FF2B",
  signalDim: "#8A9A1A",
  warmShade: "#3A342C",
  peak: "#FF4A1F",
  ok: "#5BE3A5",
} as const;

/** Alpha steps applied to `ink`, per specification §3. */
export const INK_ALPHA = {
  ink70: 0.7,
  ink40: 0.4,
  ink15: 0.15,
} as const;
