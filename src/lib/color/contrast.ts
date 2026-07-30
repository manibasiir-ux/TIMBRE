/**
 * WCAG 2.2 contrast maths, used to hold the palette to the ratios published in
 * design specification §3.2.
 *
 * Several palette entries are the same bone white at reduced alpha. Contrast is
 * only defined between opaque colours, so a translucent foreground has to be
 * composited over its background before the ratio means anything.
 */

export type Rgb = { r: number; g: number; b: number };

export function hexToRgb(hex: string): Rgb {
  const value = hex.replace("#", "");
  const full =
    value.length === 3
      ? value
          .split("")
          .map((c) => c + c)
          .join("")
      : value;

  if (!/^[0-9a-fA-F]{6}$/.test(full)) {
    throw new Error(`Not a hex colour: ${hex}`);
  }

  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
}

/** Source-over compositing of a translucent foreground onto an opaque backdrop. */
export function compositeOver(fg: Rgb, bg: Rgb, alpha: number): Rgb {
  const mix = (f: number, b: number) => f * alpha + b * (1 - alpha);
  return {
    r: mix(fg.r, bg.r),
    g: mix(fg.g, bg.g),
    b: mix(fg.b, bg.b),
  };
}

/** WCAG relative luminance. Channels are linearised before weighting. */
export function relativeLuminance({ r, g, b }: Rgb): number {
  const channel = (raw: number) => {
    const c = raw / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** Contrast ratio, always >= 1, order-independent. */
export function contrastRatio(a: Rgb, b: Rgb): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}

/** Convenience wrapper for the common opaque hex-on-hex case. */
export function contrastHex(fg: string, bg: string): number {
  return contrastRatio(hexToRgb(fg), hexToRgb(bg));
}

/** Contrast for a translucent foreground resolved against its backdrop. */
export function contrastHexAlpha(
  fg: string,
  alpha: number,
  bg: string,
): number {
  const backdrop = hexToRgb(bg);
  return contrastRatio(compositeOver(hexToRgb(fg), backdrop, alpha), backdrop);
}

/** WCAG 2.2 minimum ratios. */
export const WCAG = {
  AA_NORMAL: 4.5,
  AA_LARGE: 3,
  AAA_NORMAL: 7,
  AAA_LARGE: 4.5,
  /** SC 1.4.11, non-text UI components and graphical objects. */
  NON_TEXT: 3,
} as const;
