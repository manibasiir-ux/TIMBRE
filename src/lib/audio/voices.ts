/**
 * Who owns a voice name.
 *
 * `AudioEngine` keys voices by name and `play` stops whatever is already under
 * the key it is given. That is the right behaviour — one name, one sound — but
 * it means any two features playing the same buffer fight over one slot unless
 * they agree on names in advance. This is that agreement.
 *
 * **The mixing desk owns the bare id.** Its channels are the only voices that
 * are meant to persist across routes, and they are the only thing a fader can
 * ride: `setVoiceGain` finds a voice by name, so a channel evicted by someone
 * else's audition leaves its fader driving nothing at all. Every other feature
 * plays under a scoped alias and borrows the buffer without owning it.
 *
 * This was found the hard way three times. The rail was fixed first and the
 * other two callers were not, so a visitor who built a mix and then browsed the
 * work index or a case study came back to a desk with dead channels — silent,
 * with the faders still moving.
 */

/** The work rail's per-card audition on the home page. */
export function railVoice(id: string): string {
  return `rail:${id}`;
}

/** The work index's hover preview. */
export function previewVoice(id: string): string {
  return `preview:${id}`;
}

/** A case study's inventory player and its `?t=` deep link. */
export function caseVoice(id: string): string {
  return `case:${id}`;
}
