"use client";

import { create } from "zustand";

import { audioEngine } from "@/lib/audio/AudioEngine";
import {
  type AudioConsent,
  readConsent,
  writeConsent,
} from "@/lib/audio/consent";
import {
  type RenderProfile,
  stepDown as stepProfileDown,
} from "@/lib/webgl/detectProfile";

/**
 * Shared experience state.
 *
 * The canvas is mounted once in the root layout and never unmounts (FR-05), so
 * it cannot receive route props. Everything the sculpture reacts to therefore
 * lives here and is read by whichever component needs it, which is what lets a
 * route change be a wipe over a continuously rendering scene rather than a
 * remount.
 *
 * Per-frame audio values are deliberately absent. Writing 60 times a second
 * into a store would re-render every subscriber 60 times a second; the analyser
 * hook keeps those in a ref instead.
 */

export type ExperienceState = {
  consent: AudioConsent;
  /** True once the context is running and the bed has started. */
  isPlaying: boolean;
  muted: boolean;
  /** Slug of the case study currently driving the sculpture, or null. */
  activeCase: string | null;
  profile: RenderProfile;
  /** Document scroll progress, 0..1, feeding the transport scrub track. */
  scrollProgress: number;
  deskOpen: boolean;
  /** Stems that failed to load after retries, edge case E6. */
  unavailableStems: string[];

  hydrateConsent: () => void;
  grantConsent: () => Promise<void>;
  declineConsent: () => void;
  setPlaying: (playing: boolean) => void;
  toggleMute: () => void;
  setMuted: (muted: boolean) => void;
  setActiveCase: (slug: string | null) => void;
  setProfile: (profile: RenderProfile) => void;
  degradeProfile: () => void;
  setScrollProgress: (progress: number) => void;
  setDeskOpen: (open: boolean) => void;
  toggleDesk: () => void;
  markStemUnavailable: (id: string) => void;
};

export const useExperience = create<ExperienceState>((set, get) => ({
  // Starts pending on both server and client. Reading storage during render
  // would make the server and client markup disagree, so hydrateConsent runs
  // from an effect after mount instead.
  consent: "pending",
  isPlaying: false,
  muted: false,
  activeCase: null,
  profile: "fallback",
  scrollProgress: 0,
  deskOpen: false,
  unavailableStems: [],

  hydrateConsent: () => {
    const stored = readConsent();
    if (stored !== "pending") set({ consent: stored });
  },

  grantConsent: async () => {
    writeConsent("granted");
    set({ consent: "granted" });
    // resume() must be called synchronously enough to stay inside the gesture
    // that triggered it, or the autoplay policy refuses the context.
    const running = await audioEngine.resume();
    set({ isPlaying: running });
  },

  declineConsent: () => {
    writeConsent("declined");
    set({ consent: "declined", isPlaying: false });
  },

  setPlaying: (isPlaying) => set({ isPlaying }),

  toggleMute: () => {
    const muted = !get().muted;
    audioEngine.setMuted(muted);
    set({ muted });
  },

  setMuted: (muted) => {
    audioEngine.setMuted(muted);
    set({ muted });
  },

  setActiveCase: (activeCase) => {
    if (get().activeCase === activeCase) return;
    set({ activeCase });
  },

  setProfile: (profile) => set({ profile }),

  degradeProfile: () => set({ profile: stepProfileDown(get().profile) }),

  setScrollProgress: (scrollProgress) => set({ scrollProgress }),

  setDeskOpen: (deskOpen) => set({ deskOpen }),

  toggleDesk: () => set({ deskOpen: !get().deskOpen }),

  markStemUnavailable: (id) => {
    const current = get().unavailableStems;
    if (current.includes(id)) return;
    set({ unavailableStems: [...current, id] });
  },
}));

/** True when audio is genuinely audible: consented, playing and not muted. */
export const selectAudible = (state: ExperienceState): boolean =>
  state.consent === "granted" && state.isPlaying && !state.muted;
