import { WaveformRule } from "@/components/primitives/WaveformRule";
import { Hero } from "@/components/hero/Hero";
import { Manifesto } from "@/components/sections/Manifesto";
import { SculptureChoreography } from "@/components/sections/SculptureChoreography";
import { WorkRail } from "@/components/work/WorkRail";

/**
 * Home, specification §6.1.
 *
 * Hero, manifesto and work rail are in place. The service ticker, client wall,
 * journal teaser and brief slab follow.
 *
 * SculptureChoreography renders nothing. It owns how present the sculpture is
 * across the whole page, which is deliberately not a section's business — two
 * sections each tweening it is what made the hero's scroll response invisible.
 */
export default function Home() {
  return (
    <>
      <SculptureChoreography />
      <Hero />
      <WaveformRule />
      <Manifesto />
      <WaveformRule seed={7} />
      <WorkRail />
    </>
  );
}
