import { WaveformRule } from "@/components/primitives/WaveformRule";

/**
 * The hero, specification §6.1.
 *
 * Composition follows §6.1: the lockup on the 12-column grid with each line
 * offset, a mono metadata block bottom-left, and the scroll cue bottom-right.
 * There is deliberately no body copy over the canvas — the earlier placeholder
 * had a paragraph here and it landed on the sculpture's lit peaks at roughly
 * 1.1:1 against signal yellow, which no amount of vignette makes readable.
 *
 * Still a placeholder below the fold: the manifesto, work rail and everything
 * after it arrive with the scroll choreography.
 */
export default function Home() {
  return (
    <>
      <section className="shell relative flex min-h-dvh flex-col justify-between pt-[18vh] pb-12">
        <div className="scanlines" aria-hidden="true" />

        <h1 className="relative">
          <span className="block font-display text-mega text-ink">We make</span>
          <span className="block font-display text-mega text-ink lg:ml-[16.6%]">
            Brands
          </span>
          <span className="block font-display text-mega text-signal lg:ml-[8.3%]">
            Audible
          </span>
        </h1>

        <div className="relative flex items-end justify-between gap-8">
          <p className="font-mono text-mono-xs text-ink-70">
            Sonic identity studio
            <br />
            London
            <br />
            Est. 2019
          </p>

          {/* §6.1: a 1px vertical rule with a travelling signal dot. The travel
              itself is scroll-linked and arrives with the motion system. */}
          <div
            className="flex flex-col items-center gap-3"
            aria-hidden="true"
            data-scroll-cue
          >
            <span className="font-mono text-mono-xs text-ink-40">Scroll</span>
            <span className="relative block h-16 w-px bg-ink-15">
              <span className="absolute top-0 left-1/2 block size-1 -translate-x-1/2 rounded-full bg-signal" />
            </span>
          </div>
        </div>
      </section>

      <WaveformRule />
    </>
  );
}
