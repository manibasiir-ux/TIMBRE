/**
 * The audio assets and what plays them.
 *
 * Files are synthesised by scripts/generate-audio.mjs into public/audio and are
 * git-ignored. Swapping in the studio's masters means replacing the files and
 * keeping these ids; nothing here encodes anything about how they sound.
 */

export type AudioAsset = { id: string; url: string; label: string };

export const BED: AudioAsset = {
  id: "bed",
  url: "/audio/bed.wav",
  label: "Showreel bed",
};

export const CONFIRM_MNEMONIC: AudioAsset = {
  id: "mnemonic-confirm",
  url: "/audio/mnemonic-confirm.wav",
  label: "Confirmation mnemonic",
};

/** Per-case stems, keyed by the slug that will own the case study route. */
export const STEMS: Record<string, AudioAsset> = {
  kestrel: {
    id: "stem-kestrel",
    url: "/audio/stem-kestrel.wav",
    label: "Kestrel",
  },
  halcyon: {
    id: "stem-halcyon",
    url: "/audio/stem-halcyon.wav",
    label: "Halcyon Mobility",
  },
  solene: {
    id: "stem-solene",
    url: "/audio/stem-solene.wav",
    label: "Solene Group",
  },
  aviation: {
    id: "stem-aviation",
    url: "/audio/stem-aviation.wav",
    label: "Aviation (anonymised)",
  },
};

export function stemForCase(slug: string | null): AudioAsset | null {
  if (!slug) return null;
  return STEMS[slug] ?? null;
}
