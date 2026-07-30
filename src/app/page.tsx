import { WaveformRule } from "@/components/primitives/WaveformRule";

/**
 * Foundations placeholder. This is the hero lockup and metadata block from
 * design specification §6.1 rendered in real tokens, standing in until the
 * WebGL sculpture, the scroll choreography and the transport bar exist. It is
 * here to prove the token layer resolves, not to be the finished home page.
 */
export default function Home() {
  return (
    <>
      <section className="shell section-rhythm relative">
        <div className="scanlines" aria-hidden="true" />

        <h1>
          <span className="block font-display text-mega text-ink">
            We make
          </span>
          <span className="block font-display text-mega text-ink lg:ml-[16.6%]">
            Brands
          </span>
          <span className="block font-display text-mega text-signal lg:ml-[8.3%]">
            Audible
          </span>
        </h1>

        <div className="mt-16 grid grid-cols-4 gap-4 lg:grid-cols-12">
          <p className="col-span-4 font-mono text-mono-xs text-ink-70 lg:col-span-3">
            Sonic identity studio
            <br />
            London
            <br />
            Est. 2019
          </p>

          <p className="col-span-4 font-body text-lead text-ink-70 lg:col-span-6 lg:col-start-6">
            Sound cannot be screenshotted. This is the foundations layer —
            palette, type scale, motion tokens and the waveform rule — standing
            in until the sculpture arrives.
          </p>
        </div>
      </section>

      <WaveformRule />
    </>
  );
}
