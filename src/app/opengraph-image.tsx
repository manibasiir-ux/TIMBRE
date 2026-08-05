import { ImageResponse } from "next/og";

/**
 * The social preview card, FR-20 ("generated at the edge via next/og").
 *
 * Drawn rather than photographed, because there is no photography and a stock
 * image would say less than the lockup does. It is the hero composition reduced
 * to what survives at 1200x630 in a timeline: the wordmark, the claim, and one
 * signal element.
 *
 * `next/og` ships with Next, so this costs no dependency. It also does not run
 * the WebGL sculpture — Satori renders a subset of CSS with no canvas — which
 * is why the accent here is a drawn bar rather than a screenshot of the form.
 *
 * The system font stack is deliberate. Loading Druk and Söhne into the edge
 * runtime would add two font fetches to every card render for a face nobody has
 * licensed yet; when the real fonts are bought this is one place to revisit.
 */

export const alt = "TIMBRE — we make brands audible";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#0B0B0C",
          padding: "72px",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontSize: 26,
              letterSpacing: "0.24em",
              color: "#F4F4F0",
              opacity: 0.7,
              display: "flex",
            }}
          >
            TIMBRE · SONIC IDENTITY STUDIO
          </div>

          <div
            style={{
              marginTop: 56,
              fontSize: 104,
              lineHeight: 1.02,
              fontWeight: 700,
              letterSpacing: "-0.02em",
              color: "#F4F4F0",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <span>We make brands</span>
            <span style={{ color: "#E8FF2B" }}>audible.</span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "flex-end", gap: 6 }}>
          {/* A waveform, at the only fidelity this size can carry. The heights
              are fixed rather than generated: Satori has no Math.random and a
              deterministic card is the correct thing for a cache key anyway. */}
          {[
            18, 42, 26, 68, 34, 92, 48, 70, 30, 58, 22, 80, 40, 64, 28, 50, 20,
            74, 36, 60, 24, 88, 44, 32,
          ].map((height, index) => (
            <div
              key={index}
              style={{
                width: 8,
                height,
                background: index % 3 === 0 ? "#E8FF2B" : "#F4F4F0",
                opacity: index % 3 === 0 ? 1 : 0.35,
              }}
            />
          ))}
        </div>
      </div>
    ),
    size,
  );
}
