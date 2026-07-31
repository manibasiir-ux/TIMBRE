import { WaveformRule } from "@/components/primitives/WaveformRule";
import { Hero } from "@/components/hero/Hero";
import { Manifesto } from "@/components/sections/Manifesto";

/**
 * Home, specification §6.1.
 *
 * Hero and manifesto are in place. The work rail, service ticker, client wall,
 * journal teaser and brief slab follow once there is content and there are
 * routes to send people to.
 */
export default function Home() {
  return (
    <>
      <Hero />
      <WaveformRule />
      <Manifesto />
      <WaveformRule seed={7} />
    </>
  );
}
