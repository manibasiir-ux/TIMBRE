import { audioEngine } from "@/lib/audio/AudioEngine";

/**
 * One component's claim on the bed duck, which it cannot leak or over-release.
 *
 * `AudioEngine.duck` is reference-counted so that two players ducking at once
 * do not un-duck each other, and the cost of that is unforgiving arithmetic: a
 * duck taken and never released leaves the bed 12 dB down for the rest of the
 * session, and a release with nothing outstanding steals someone else's.
 *
 * Both happened. The work index ducked on every hover preview and released only
 * on the timer, so leaving a card early leaked one duck per hover; a case study
 * ducked again for each inventory item without releasing the previous one. The
 * bed those ducks attenuate is the same bus the desk's channels play on, so the
 * symptom was a mixing desk that got quieter the more of the site you looked at
 * — faders at full, sound at a quarter, nothing on screen to explain it.
 *
 * A handle holds at most one duck. `take` twice is one duck; `release` twice is
 * one release; `release` without `take` does nothing. Give each component its
 * own and release it on unmount, and the arithmetic stops being the caller's
 * problem.
 */
export type DuckHandle = {
  take: () => void;
  release: () => void;
  readonly held: boolean;
};

export function createDuckHandle(engine = audioEngine): DuckHandle {
  let held = false;

  return {
    take() {
      if (held) return;
      held = true;
      engine.duck();
    },
    release() {
      if (!held) return;
      held = false;
      engine.releaseDuck();
    },
    get held() {
      return held;
    },
  };
}
