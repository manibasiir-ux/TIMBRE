import { Archivo, Inter, JetBrains_Mono } from "next/font/google";

/**
 * The design specification calls for Druk Wide, Druk Condensed and Söhne. All
 * three are commercial licences the project does not hold, so each is stood in
 * by the closest freely licensed face doing the same job:
 *
 *   Druk Wide Bold       -> Archivo at wdth 125   wide, heavy, poster display
 *   Druk Condensed Super -> Archivo at wdth 62    condensed, heavy
 *   Söhne Buch/Kräftig   -> Inter                 neo-grotesque text face
 *   JetBrains Mono       -> JetBrains Mono        used exactly as specified, OFL
 *
 * Both display roles are the same variable family driven to opposite ends of
 * its width axis. That is closer to the specification than two unrelated static
 * faces: Druk Wide and Druk Condensed are themselves one design at two widths,
 * so a width axis reproduces the relationship rather than imitating it, and the
 * two roles cannot drift apart in weight or proportion.
 *
 * Weight is deliberately not pinned here. The type scale in globals.css sets
 * font-weight per token (§2.1), and a variable font maps that straight onto its
 * wght axis, so the token table stays authoritative. Only the width axis is
 * fixed per role, in globals.css.
 *
 * Swapping in the licensed faces later is a change to this file plus the two
 * font-variation-settings rules in globals.css. Nothing else names a typeface.
 *
 * Only the display and body faces are preloaded, per specification §2.
 */

export const fontDisplay = Archivo({
  variable: "--font-display-face",
  subsets: ["latin"],
  axes: ["wdth"],
  display: "swap",
  preload: true,
});

// Body and mono are pinned to the exact weights the §2.1 type scale uses rather
// than loaded as variable fonts. A variable font carries its whole design space,
// and neither of these needs one: body text is 400 with 600 for sub-headings,
// and mono is 500 with 400 in reserve. Only the display face pays for a variable
// file, because its width axis is doing real work.
export const fontBody = Inter({
  variable: "--font-body-face",
  subsets: ["latin"],
  weight: ["400", "600"],
  display: "swap",
  preload: true,
});

export const fontMono = JetBrains_Mono({
  variable: "--font-mono-face",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
  preload: false,
});

export const fontVariables = [
  fontDisplay.variable,
  fontBody.variable,
  fontMono.variable,
].join(" ");
