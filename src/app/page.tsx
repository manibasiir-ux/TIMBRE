import { WaveformRule } from "@/components/primitives/WaveformRule";
import { Hero } from "@/components/hero/Hero";
import { BriefSlab } from "@/components/sections/BriefSlab";
import { ClientWall } from "@/components/sections/ClientWall";
import { Manifesto } from "@/components/sections/Manifesto";
import { SculptureChoreography } from "@/components/sections/SculptureChoreography";
import { ServiceTicker } from "@/components/sections/ServiceTicker";
import { WorkRail } from "@/components/work/WorkRail";

/**
 * Home, specification §6.1.
 *
 * Eight of the nine sections. The journal teaser is the one missing, and it
 * stays missing until there is a journal to tease — a homepage block linking to
 * a route that does not exist is worse than no block.
 *
 * The order is the argument: what we believe, who we did it for, what it is
 * called, who else trusted us, and then the ask. Nothing here works if the work
 * rail has not already done its job.
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
      <ServiceTicker />
      <ClientWall />
      <WaveformRule seed={11} />
      <BriefSlab />
    </>
  );
}
