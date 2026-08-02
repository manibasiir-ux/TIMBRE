import { WaveformRule } from "@/components/primitives/WaveformRule";
import { Hero } from "@/components/hero/Hero";
import { Manifesto } from "@/components/sections/Manifesto";
import { WorkRail } from "@/components/work/WorkRail";

/**
 * Home, specification §6.1.
 *
 * Hero, manifesto and work rail are in place. The service ticker, client wall,
 * journal teaser and brief slab follow.
 */
export default function Home() {
  return (
    <>
      <Hero />
      <WaveformRule />
      <Manifesto />
      <WaveformRule seed={7} />
      <WorkRail />
    </>
  );
}
