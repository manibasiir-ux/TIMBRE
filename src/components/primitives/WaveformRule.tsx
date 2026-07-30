import type { SVGProps } from "react";

/**
 * The section divider, per design specification §1: horizontal rules are 24px
 * waveform strips rather than lines, dividing sections the way a track divider
 * divides a DAW timeline.
 *
 * The specification draws these from the studio's own mnemonic. That audio does
 * not exist yet, so the shape is synthesised from a fixed sum of sines. It is
 * deliberately deterministic rather than random: this renders on the server and
 * again on the client, and any disagreement between the two is a hydration
 * error. When the real audio lands, replace amplitudeAt with a lookup into the
 * analysed peak data and nothing else here changes.
 *
 * Emitted as one path of separate move/line pairs so a single stroke-dashoffset
 * tween draws it left to right, which is the reveal specified in §7.
 */

const VIEWBOX_HEIGHT = 24;
const CENTRE = VIEWBOX_HEIGHT / 2;
const MAX_AMPLITUDE = 11;
const BAR_SPACING = 4;

function amplitudeAt(index: number, seed: number): number {
  const a = Math.sin(index * 0.35 + seed) * 0.5 + 0.5;
  const b = Math.sin(index * 1.13 + seed * 2.7) * 0.5 + 0.5;
  const c = Math.sin(index * 2.79 + seed * 5.1) * 0.5 + 0.5;
  return a * 0.55 + b * 0.3 + c * 0.15;
}

function buildPath(bars: number, seed: number): string {
  const segments: string[] = [];

  for (let i = 0; i < bars; i += 1) {
    const x = i * BAR_SPACING;
    const half = Math.max(0.5, amplitudeAt(i, seed) * MAX_AMPLITUDE);
    const top = (CENTRE - half).toFixed(2);
    const bottom = (CENTRE + half).toFixed(2);
    segments.push(`M${x} ${top}V${bottom}`);
  }

  return segments.join("");
}

export type WaveformRuleProps = Omit<SVGProps<SVGSVGElement>, "children"> & {
  /** Number of vertical strokes. */
  bars?: number;
  /** Varies the shape between instances without introducing randomness. */
  seed?: number;
};

export function WaveformRule({
  bars = 160,
  seed = 1,
  className,
  ...props
}: WaveformRuleProps) {
  const width = (bars - 1) * BAR_SPACING;

  return (
    <svg
      role="presentation"
      aria-hidden="true"
      focusable="false"
      viewBox={`0 0 ${width} ${VIEWBOX_HEIGHT}`}
      preserveAspectRatio="none"
      className={["h-6 w-full text-ink-40", className]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      <path
        d={buildPath(bars, seed)}
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        fill="none"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
