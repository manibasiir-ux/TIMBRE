/**
 * Product analytics, NFR-14.
 *
 * Eleven named events, cookieless, no dependency and no vendor. `track` posts a
 * small JSON body to whatever endpoint is configured and does nothing at all
 * when none is — so the call sites are instrumented now and the destination is
 * a deployment decision rather than a code change.
 *
 * ## Why not a package
 *
 * The candidates are a script tag and a POST. Both Vercel Analytics and
 * Plausible accept events over plain HTTP, and the SDKs mostly add a queue and
 * a session identifier. The identifier is the part actively unwanted: NFR-13
 * promises no cookies before consent and cookieless measurement by default, and
 * the cheapest way to keep a promise like that is to have nothing capable of
 * breaking it.
 *
 * ## What is deliberately not collected
 *
 * No identifier, no cookie, no storage, nothing about the person. Every payload
 * is an event name, the current path, and properties that describe the site's
 * own state — which render profile was selected, which step of the form was
 * completed. Two visits are indistinguishable from one visitor visiting twice,
 * and that is the intended limit of it.
 *
 * `sendBeacon` where available, because half of these events fire as the page
 * is being left and a `fetch` in that moment is routinely cancelled.
 */

export const ANALYTICS_EVENTS = [
  "audio_consent_granted",
  "audio_consent_declined",
  "reel_played_30s",
  "case_study_audio_play",
  "desk_opened",
  "fader_dragged",
  "pricing_viewed",
  "brief_step_completed",
  "brief_submitted",
  "webgl_profile_selected",
  "perf_stepdown",
] as const;

export type AnalyticsEvent = (typeof ANALYTICS_EVENTS)[number];

/** Serialisable, and small enough to survive a beacon's size limit. */
export type AnalyticsProps = Record<string, string | number | boolean>;

function endpoint(): string | undefined {
  const url = process.env.NEXT_PUBLIC_ANALYTICS_URL;
  return url && url.length > 0 ? url : undefined;
}

/**
 * Builds the payload. Exported for testing, because the shape is the contract
 * with whatever ends up receiving it.
 */
export function buildEvent(
  event: AnalyticsEvent,
  props: AnalyticsProps = {},
  path = typeof window === "undefined" ? "" : window.location.pathname,
): { event: AnalyticsEvent; path: string; props: AnalyticsProps } {
  return { event, path, props };
}

export function track(event: AnalyticsEvent, props: AnalyticsProps = {}): void {
  if (typeof window === "undefined") return;

  const url = endpoint();
  if (!url) return;

  const body = JSON.stringify(buildEvent(event, props));

  try {
    if (navigator.sendBeacon) {
      navigator.sendBeacon(url, new Blob([body], { type: "application/json" }));
      return;
    }
    void fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
      keepalive: true,
    });
  } catch {
    // Measurement must never be able to break the thing it measures.
  }
}
