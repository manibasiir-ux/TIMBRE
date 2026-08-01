import Link from "next/link";

import { WaveformRule } from "@/components/primitives/WaveformRule";

/**
 * The dead channel, FR-24 and specification §6.9.
 *
 * Primary navigation stays intact: the transport bar and desk are in the root
 * layout, so a 404 keeps the whole navigation system rather than stranding
 * anyone. The sculpture keeps rendering behind this — §6.9 asks for noise-floor
 * static, which arrives with the per-route sculpture states.
 */
export default function NotFound() {
  return (
    <section className="shell flex min-h-dvh flex-col justify-center">
      <p className="font-mono text-mono-xs text-ink-70">Error 404</p>

      <h1 className="mt-8 font-display text-mega text-ink">Dead channel</h1>

      <p className="mt-10 max-w-[48ch] text-lead text-ink-70">
        Nothing is routed here. The signal path is intact everywhere else.
      </p>

      <div className="mt-12">
        <Link
          href="/"
          className="inline-block min-h-11 bg-signal px-8 py-4 font-mono text-mono text-ground"
        >
          Back to the room
        </Link>
      </div>

      <WaveformRule seed={13} className="mt-24" />
    </section>
  );
}
