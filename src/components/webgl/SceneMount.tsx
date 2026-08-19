"use client";

import dynamic from "next/dynamic";

import { useExperience } from "@/store/useExperience";

import { HeroFallback } from "./HeroFallback";

/**
 * Keeps three.js out of the critical path, risk R2.
 *
 * The roadmap records this as the week-ten setback: importing the scene at
 * module scope put the three.js chunk in the LCP path and a throttled Moto G
 * returned an LCP of 4.8s. Loading it with ssr: false moves it off that path,
 * and the static hero composition paints in its place so there is something for
 * LCP to resolve against while the chunk arrives.
 *
 * This wrapper exists because next/dynamic with ssr: false is not permitted
 * inside a Server Component, and the root layout is one.
 *
 * ## Why it also waits for the consent gate
 *
 * `ssr: false` keeps the chunk out of the HTML, but the import still fires the
 * moment this mounts — immediately after hydration, which on a throttled phone
 * is squarely inside the LCP window. Lighthouse measured 225 KB downloaded and
 * unused on first paint, and mobile LCP at 2.9–3.0s against a 2.5s target while
 * desktop sat at 0.6s. A cost that only appears on a slow connection is a cost
 * paid during loading.
 *
 * The gate is `fixed inset-0` with an opaque `bg-ground` at z-9000 and the
 * canvas is at z-0, so while consent is pending the sculpture is behind a solid
 * wall. Fetching it then is fetching something nobody can see. Waiting is not a
 * trick played on the metric — it is declining to load an invisible thing.
 *
 * Returning visitors are unaffected: consent lives in sessionStorage, so a
 * second page load in the same session resolves it before this renders and the
 * canvas mounts immediately.
 */
const SceneRoot = dynamic(() => import("./SceneRoot"), {
  ssr: false,
  loading: () => <HeroFallback />,
});

export function SceneMount() {
  const consent = useExperience((state) => state.consent);

  // The same composition the dynamic import shows while loading, so the swap
  // from "waiting for an answer" to "waiting for a chunk" is invisible.
  if (consent === "pending") return <HeroFallback />;

  return <SceneRoot />;
}
