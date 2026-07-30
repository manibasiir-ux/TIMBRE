"use client";

import dynamic from "next/dynamic";

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
 */
const SceneRoot = dynamic(() => import("./SceneRoot"), {
  ssr: false,
  loading: () => <HeroFallback />,
});

export function SceneMount() {
  return <SceneRoot />;
}
