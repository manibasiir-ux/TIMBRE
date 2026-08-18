import { audioEngine } from "@/lib/audio/AudioEngine";
import { BED, STEMS } from "@/lib/audio/manifest";

/**
 * The mixing desk's channels, and the state behind them.
 *
 * §8 drew a mixing desk and wired its faders to scroll position, which made six
 * of the seven inert — a fader only did anything on the page you were already
 * on, where it duplicated the scrollbar. The object was a console that mixed
 * nothing.
 *
 * These faders ride real gain nodes instead. The room is the master bed; the
 * four client channels are the same per-case stems the work rail auditions, so
 * a visitor can hold two identities up against each other, or against the room,
 * from anywhere on the site. That is the argument the whole site is making —
 * that an identity is a system you can take apart — made operable rather than
 * asserted.
 *
 * Nothing here is loaded until the desk is opened for the first time. The five
 * files are about 2.9 MB together and most visitors will never touch a fader,
 * so they are not part of anyone's first paint.
 */

export type MixChannel = {
  id: string;
  /** Two-digit number shown on the strip, per §8. */
  number: string;
  label: string;
  url: string;
  /** Where the fader sits before anyone touches it. */
  initial: number;
};

export const MIX_CHANNELS: readonly MixChannel[] = [
  { id: BED.id, number: "01", label: "Room", url: BED.url, initial: 1 },
  {
    id: STEMS.kestrel.id,
    number: "02",
    label: "Kestrel",
    url: STEMS.kestrel.url,
    initial: 0,
  },
  {
    id: STEMS.halcyon.id,
    number: "03",
    label: "Halcyon",
    url: STEMS.halcyon.url,
    initial: 0,
  },
  {
    id: STEMS.solene.id,
    number: "04",
    label: "Solene",
    url: STEMS.solene.url,
    initial: 0,
  },
  {
    id: STEMS.aviation.id,
    number: "05",
    label: "Aviation",
    url: STEMS.aviation.url,
    initial: 0,
  },
] as const;

/**
 * Fader positions, held outside React so a mix survives closing the desk.
 *
 * Someone who builds a mix and closes the overlay has not asked to undo it —
 * component state would throw it away on unmount, which is the one behaviour
 * that would make the thing feel like a toy rather than a control.
 */
const levels = new Map<string, number>(
  MIX_CHANNELS.map((channel) => [channel.id, channel.initial]),
);

export function mixLevel(id: string): number {
  return levels.get(id) ?? 0;
}

export function setMixLevel(id: string, value: number): void {
  const clamped = Math.max(0, Math.min(1, value));
  levels.set(id, clamped);
  audioEngine.setVoiceGain(id, clamped);
}

let engaging: Promise<boolean> | null = null;

/**
 * Loads every channel and starts them together, all at their stored levels.
 *
 * Deliberately idempotent and deliberately memoised: opening and closing the
 * desk repeatedly must not stack voices or re-fetch buffers, and two rapid
 * opens must not race each other into two sets of sources.
 */
export function engageMixer(): Promise<boolean> {
  if (engaging) return engaging;

  engaging = (async () => {
    const loaded = await Promise.all(
      MIX_CHANNELS.map((channel) => audioEngine.load(channel.id, channel.url)),
    );
    if (loaded.some((buffer) => buffer === null)) return false;

    audioEngine.setMixEngaged(true);

    // Started in one pass so every channel shares a phase. The generator writes
    // whole numbers of cycles per loop, so sources begun together stay in step.
    for (const channel of MIX_CHANNELS) {
      audioEngine.ensureVoice(channel.id, mixLevel(channel.id));
    }
    return true;
  })();

  return engaging;
}
