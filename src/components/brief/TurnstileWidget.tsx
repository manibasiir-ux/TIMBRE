"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";

/**
 * Cloudflare Turnstile, the client half of FR-17.
 *
 * The server half already existed and was checking a token nothing produced.
 * With `TURNSTILE_SECRET_KEY` set and no widget on the page, every genuine
 * submission failed verification — so the endpoint's safe behaviour depended
 * entirely on the secret being absent, which is the one thing that stops being
 * true in production.
 *
 * Renders only when the site key is configured. Local development and the e2e
 * suite have no key, so no script is loaded, no origin is added to the CSP, and
 * the form submits without a token exactly as before.
 *
 * No SDK: Turnstile is a script tag and one `render` call.
 */

/** Public by design — Cloudflare expects this in the page. */
export const TURNSTILE_SITE_KEY =
  process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";

type TurnstileApi = {
  render: (target: HTMLElement, options: Record<string, unknown>) => string;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

export function TurnstileWidget({
  onToken,
}: {
  onToken: (token: string) => void;
}) {
  const holder = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const [scriptReady, setScriptReady] = useState(false);

  // Kept in a ref so a fresh callback identity on each parent render does not
  // re-run the effect below, tear the widget down and discard a solved
  // challenge. Written in an effect rather than during render, which React
  // forbids: a ref mutated mid-render is not a value the renderer can reason
  // about, and the lint rule that catches it is right to.
  const emit = useRef(onToken);
  useEffect(() => {
    emit.current = onToken;
  }, [onToken]);

  useEffect(() => {
    if (!scriptReady || !holder.current || widgetId.current !== null) return;
    const api = window.turnstile;
    if (!api) return;

    widgetId.current = api.render(holder.current, {
      sitekey: TURNSTILE_SITE_KEY,
      theme: "dark",
      callback: (token: string) => emit.current(token),
      // A token is valid for 300 seconds. Clearing it on expiry makes the form
      // ask again rather than submit something the server will refuse.
      "expired-callback": () => emit.current(""),
      "error-callback": () => emit.current(""),
    });

    return () => {
      if (widgetId.current === null) return;
      api.remove(widgetId.current);
      widgetId.current = null;
    };
  }, [scriptReady]);

  if (!TURNSTILE_SITE_KEY) return null;

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onReady={() => setScriptReady(true)}
      />
      <div ref={holder} className="mt-8" />
    </>
  );
}
