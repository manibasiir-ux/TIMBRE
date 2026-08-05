import type { Metadata, Viewport } from "next";

import { SmoothScroll } from "@/app/providers/SmoothScroll";
import { ConsentGate } from "@/components/consent/ConsentGate";
import { OrganizationSchema } from "@/components/seo/StructuredData";
import { RouteWipe } from "@/components/transport/RouteWipe";
import { TransportBar } from "@/components/transport/TransportBar";
import { SceneMount } from "@/components/webgl/SceneMount";
import { SculptureRouteState } from "@/components/webgl/SculptureRouteState";
import { fontVariables } from "@/lib/fonts";
import { SITE_URL } from "@/lib/site";
import "./globals.css";

const siteUrl = SITE_URL;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  // NFR-11. Every route inherits this and overrides it with its own path;
  // without it the same page is reachable at a preview host, a vercel.app host
  // and a custom domain, and a crawler treats all three as competing copies.
  alternates: { canonical: "/" },
  title: {
    default: "TIMBRE — Sonic Identity Studio",
    template: "%s · TIMBRE",
  },
  description:
    "TIMBRE is a sonic identity studio. We build the sound of a brand as a system: mnemonics, product sound, soundscapes and the guidelines that keep them coherent.",
  applicationName: "TIMBRE",
  openGraph: {
    type: "website",
    siteName: "TIMBRE",
    locale: "en_GB",
    url: siteUrl,
    title: "TIMBRE — Sonic Identity Studio",
    description:
      "We make brands audible. Sonic identity as a system, not a jingle.",
  },
  twitter: {
    card: "summary_large_image",
    title: "TIMBRE — Sonic Identity Studio",
    description:
      "We make brands audible. Sonic identity as a system, not a jingle.",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#0B0B0C",
  // Specification §11.3 inherits Lacoste's mobile chrome discipline: the page
  // extends under the notch and every fixed element pads itself back out with
  // env(safe-area-inset-*).
  viewportFit: "cover",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={fontVariables}>
      <body>
        <OrganizationSchema />
        <RouteWipe />

        {/* Specification §10: first focusable element on the page. */}
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[10000] focus:bg-signal focus:px-4 focus:py-3 focus:text-mono focus:text-ground"
        >
          Skip to content
        </a>

        {/* FR-05: mounted once here, never unmounted, so route changes never
            rebuild the WebGL context. */}
        <SceneMount />
        <SculptureRouteState />

        <SmoothScroll>
          {/* tabIndex -1 so focus can be moved here programmatically when the
              consent gate closes and on route changes, without adding it to the
              tab order. */}
          <main id="main" tabIndex={-1} className="relative z-10 outline-none">
            {children}
          </main>
        </SmoothScroll>

        {/* FR-06: persistent on every route, occupying the band the body has
            reserved since the token layer. */}
        <TransportBar />

        {/* FR-01: nothing plays until this is answered. */}
        <ConsentGate />

        {/* Decorative only, and switched off under prefers-reduced-motion. */}
        <div className="grain" data-decorative-motion aria-hidden="true" />
      </body>
    </html>
  );
}
