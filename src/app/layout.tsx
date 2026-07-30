import type { Metadata, Viewport } from "next";

import { fontVariables } from "@/lib/fonts";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
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
        {/* Specification §10: first focusable element on the page. */}
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[10000] focus:bg-signal focus:px-4 focus:py-3 focus:text-mono focus:text-ground"
        >
          Skip to content
        </a>

        <main id="main">{children}</main>

        {/* Decorative only, and switched off under prefers-reduced-motion. */}
        <div className="grain" data-decorative-motion aria-hidden="true" />
      </body>
    </html>
  );
}
