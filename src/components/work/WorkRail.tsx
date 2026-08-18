"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

import { WaveformRule } from "@/components/primitives/WaveformRule";
import { CASES, stemFor } from "@/content/cases";
import { audioEngine } from "@/lib/audio/AudioEngine";
import {
  MORPH_SECONDS,
  NEUTRAL_IDENTITY,
  activeIdentity,
  identityFor,
} from "@/lib/webgl/sculptureIdentity";
import { useExperience } from "@/store/useExperience";

gsap.registerPlugin(ScrollTrigger);

/**
 * `useLayoutEffect` on the client, `useEffect` on the server.
 *
 * This component is server-rendered before it hydrates, and `useLayoutEffect`
 * warns there. Nothing needs cleaning up during an SSR pass, so the fallback
 * costs nothing.
 */
const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

/**
 * The work rail, specification §6.1 item 5 and FR-04.
 *
 * A pinned horizontal scrub: the section holds the viewport while the track
 * translates sideways, and each card entering the centre morphs the sculpture
 * into that client's identity over 1.2s.
 *
 * Two deliberate departures from the written spec, both for reasons the spec
 * could not have known:
 *
 * §6.1 asks for full-height cards. Full-height opaque cards would cover the
 * sculpture, which is the one thing this section exists to show changing — the
 * morph would happen entirely behind the card that triggered it. The cards are
 * therefore tall but not full-height, leaving the sculpture visible above and
 * below the rail.
 *
 * The cards are opaque `ground-lift` panels rather than copy laid over the
 * scene. Text over a lit sculpture measures about 1.1:1, which is the failure
 * the hero and the manifesto each hit in turn; a panel makes it 16.69:1 and
 * removes the question. The sculpture stays visible in the gaps instead.
 */

const FEATURED = CASES.filter((entry) => entry.featured);

/** §7 "Work rail": scrub 1.2, linear. */
const RAIL_SCRUB = 1.2;

/**
 * How loud a case stem plays as its card centres.
 *
 * Louder than the work index's 0.35 audition, because there the bed is still
 * running underneath and here it has been ducked 12dB to make room. The stem is
 * meant to be the thing you are listening to, not a hint under the music.
 */
const RAIL_STEM_GAIN = 0.7;

/**
 * The rail's own name for a stem voice.
 *
 * The mixing desk plays these same buffers as its client channels. Voices are
 * keyed by name, so auditioning under the bare id evicted the desk's channel,
 * and the visitor's mix vanished the moment they scrolled past the rail — their
 * faders left driving voices that no longer existed. Prefixing keeps the two
 * independent: the desk holds the buffer as a channel, the rail holds it as an
 * audition, and neither stops the other.
 */
function railVoice(id: string): string {
  return `rail:${id}`;
}

export function WorkRail() {
  const section = useRef<HTMLElement>(null);
  const track = useRef<HTMLUListElement>(null);
  /**
   * Scrolls a focused card into view, set from inside the GSAP context.
   *
   * A pinned horizontal rail is a keyboard trap waiting to happen: the cards
   * are all in the DOM at once, so Tab reaches the fourth one while the track
   * still has it translated off-screen, and focus lands somewhere invisible.
   * Null under reduced motion, where the rail is a plain vertical list and the
   * browser's own scroll-into-view is correct.
   */
  const revealCard = useRef<((card: HTMLElement) => void) | null>(null);

  const setActiveCase = useExperience((state) => state.setActiveCase);
  const markStemUnavailable = useExperience(
    (state) => state.markStemUnavailable,
  );
  const consent = useExperience((state) => state.consent);
  const muted = useExperience((state) => state.muted);
  const canPlay = consent === "granted" && !muted;

  /**
   * The rail's audio, §6.1 item 5.
   *
   * Held in refs rather than state because the GSAP callbacks that drive it are
   * created once and would otherwise read whatever `canPlay` was at mount
   * forever — which is how a muted visitor ends up hearing something.
   *
   * `ducked` is a boolean and not a counter on purpose. The engine's duck is
   * reference-counted, so an unmatched duck leaves the bed quiet for the rest
   * of the session with nothing on screen to explain it. One duck is taken when
   * the rail starts playing and released when it stops, whatever happens to the
   * cards in between.
   */
  const [sounding, setSounding] = useState<string | null>(null);
  const canPlayRef = useRef(canPlay);
  const wantedSlug = useRef<string | null>(null);
  const voice = useRef<{ playing: string | null; ducked: boolean }>({
    playing: null,
    ducked: false,
  });

  /**
   * Silences the rail. Touches the engine and refs only, never state.
   *
   * The badge is cleared separately, by `silenceRail`, because this also runs
   * from effects — when the visitor mutes, and on unmount — and setting state
   * synchronously inside an effect cascades renders. The badge does not need
   * it: it is rendered through `canPlay`, so muting hides it without anything
   * having to be set.
   */
  const stopRailAudio = useCallback(() => {
    const state = voice.current;
    if (state.playing) {
      audioEngine.stop(state.playing, 0.35);
      state.playing = null;
    }
    if (state.ducked) {
      audioEngine.releaseDuck();
      state.ducked = false;
    }
  }, []);

  /** Silences the rail from an event callback, where clearing state is safe. */
  const silenceRail = useCallback(() => {
    stopRailAudio();
    setSounding(null);
  }, [stopRailAudio]);

  const playCase = useCallback(
    async (slug: string) => {
      if (!canPlayRef.current) return;

      const entry = FEATURED.find((item) => item.slug === slug);
      const asset = entry ? stemFor(entry) : null;
      if (!asset) return;

      const buffer = await audioEngine.load(asset.id, asset.url);

      // The await is long enough to scroll past two more cards, and long enough
      // for the visitor to mute or leave. Edge case E6: a stem that will not
      // load says so rather than failing silently.
      if (!buffer) {
        markStemUnavailable(asset.id);
        return;
      }
      if (wantedSlug.current !== slug || !canPlayRef.current) return;

      const state = voice.current;

      // The outgoing stem is silenced and disowned in the same breath. Stopping
      // it while leaving the badge pointing at it would leave the previous card
      // lit with nothing playing if the incoming one then failed to start.
      if (state.playing && state.playing !== railVoice(asset.id)) {
        audioEngine.stop(state.playing, 0.25);
        state.playing = null;
        setSounding(null);
      }

      const started = audioEngine.play(asset.id, {
        as: railVoice(asset.id),
        bus: "sfx",
        fadeSeconds: 0.25,
        gain: RAIL_STEM_GAIN,
      });

      // Both the badge and the duck follow what the engine did, not what was
      // asked of it. Ducking first would leave the bed quiet under a card that
      // never sounded, and lighting the badge from intent would claim audio
      // nobody can hear — the one thing this section cannot get wrong.
      if (!started) return;

      if (!state.ducked) {
        audioEngine.duck();
        state.ducked = true;
      }
      state.playing = railVoice(asset.id);
      setSounding(slug);
    },
    [markStemUnavailable],
  );

  // Declining or muting has to silence the rail immediately, not at the next
  // card. FR-22 puts a sound-off control one interaction away from anywhere,
  // and it is worth nothing if this keeps playing through it.
  useEffect(() => {
    canPlayRef.current = canPlay;
    if (!canPlay) stopRailAudio();
  }, [canPlay, stopRailAudio]);

  // A route change unmounts the rail mid-card. Without this the stem keeps
  // playing over the case study and the bed stays ducked for good.
  useEffect(() => stopRailAudio, [stopRailAudio]);

  // A layout effect, not a passive one, because this pins.
  //
  // `pin: true` makes ScrollTrigger wrap the pinned element in a `pin-spacer`
  // div — the element is reparented out from under React. React still believes
  // the section is a direct child of what it rendered it into, so when this
  // component unmounts (every navigation away from `/`, since the rail is a
  // home-page section) React calls removeChild on the original parent and the
  // browser throws:
  //
  //     NotFoundError: Failed to execute 'removeChild' on 'Node':
  //     The node to be removed is not a child of this node.
  //
  // That exception escapes rendering, so the entire tree dies and the browser
  // shows its own "This page couldn't load" screen instead of anything the site
  // controls. `THREE.WebGLRenderer: Context Lost` follows as the canvas is torn
  // down. Reloading always worked, which is what made this look like a network
  // or hosting problem rather than a rendering one.
  //
  // React detaches a deleted subtree's DOM during the commit phase and flushes
  // `useEffect` cleanups afterwards, so the teardown that unwraps the spacer
  // arrived too late. `useLayoutEffect` cleanup runs synchronously in that same
  // mutation phase, before React removes anything, so the section is back in
  // its original parent by the time React looks for it. This is why
  // `@gsap/react`'s `useGSAP` is built on `useLayoutEffect`.
  useIsomorphicLayoutEffect(() => {
    const root = section.current;
    const rail = track.current;
    if (!root || !rail) return;

    const morphTo = (index: number) => {
      const entry = FEATURED[index];
      if (!entry) return;

      // The store slug is what gives the canvas its accessible name in
      // SceneRoot, so this is also the text equivalent for the morph.
      setActiveCase(entry.slug);

      // §6.1 item 5: the card that reaches the centre is auditioned.
      wantedSlug.current = entry.slug;
      void playCase(entry.slug);

      // overwrite because a fast scroll can cross three cards inside one 1.2s
      // morph, and three live tweens on the same five floats fight each other.
      gsap.to(activeIdentity, {
        ...identityFor(entry.slug),
        duration: MORPH_SECONDS,
        ease: "power2.inOut",
        overwrite: true,
      });
    };

    const leaveRail = () => {
      setActiveCase(null);
      wantedSlug.current = null;
      silenceRail();
      gsap.to(activeIdentity, {
        ...NEUTRAL_IDENTITY,
        duration: MORPH_SECONDS,
        ease: "power2.inOut",
        overwrite: true,
      });
    };

    const context = gsap.context(() => {
      const media = gsap.matchMedia();

      // Reduced motion gets no pin and no morph. §10 holds the sculpture in a
      // fixed composed pose, and the canvas is decorative and aria-hidden by
      // design — the case identities are carried by the cards themselves, so
      // nothing is lost by leaving the form still. Pinning a section for four
      // viewports of scroll would be hostile here, not merely animated.
      //
      // It also gets no rail audio, and that is a decision rather than a
      // consequence of there being no centred card to trigger it. Sound that
      // starts because the page moved is the audible half of scroll-jacking,
      // and someone who has asked for less of that has not asked for it in
      // another sense. Every stem stays reachable, by name and on purpose, from
      // the case study each card links to.
      media.add("(prefers-reduced-motion: no-preference)", () => {
        const cards = gsap.utils.toArray<HTMLElement>("[data-case-card]", root);

        /**
         * How far the track travels: exactly far enough to centre the last card.
         *
         * It was `scrollWidth - viewport`, which is the usual formula and is
         * wrong here. Chrome omits a flex container's trailing padding from
         * scrollWidth, so with the rail padded to centre its end cards the
         * measurement came back 600px short of the content and the track
         * stopped with the last card still 600px right of centre — near enough
         * to look deliberate, far enough that it was never the nearest card and
         * so never sounded.
         *
         * Stating the intent directly is both correct and self-documenting: the
         * end of the scrub is where the last card is centred, whatever the
         * padding does or does not report.
         */
        const distanceFor = () => {
          const last = cards[cards.length - 1];
          if (!last) return 0;
          return Math.max(
            0,
            last.offsetLeft + last.offsetWidth / 2 - window.innerWidth / 2,
          );
        };

        /**
         * The card nearest the centre of the viewport at a given scrub progress.
         *
         * The rail was originally entered with morphTo(0) forwards and
         * morphTo(last) backwards, which is right only when the rail is entered
         * at one of its ends. Scrolling straight into the middle of it — a
         * reload with scroll restoration, a deep link, a flick — landed past
         * the boundary the card triggers watch, so nothing fired and the
         * sculpture stayed as the manifesto left it: fully receded, colour mix
         * 0.15, no visible morph at all. Measured on the real canvas: max green
         * 38/255 inside the rail against 201 when entered from above.
         */
        const nearestCard = (progress: number) => {
          const trackX = -distanceFor() * progress;
          const centre = window.innerWidth / 2;

          let best = 0;
          let bestDistance = Infinity;
          cards.forEach((card, index) => {
            const offset = Math.abs(
              card.offsetLeft + card.offsetWidth / 2 + trackX - centre,
            );
            if (offset < bestDistance) {
              bestDistance = offset;
              best = index;
            }
          });
          return best;
        };

        let inside = false;
        let active = -1;

        /**
         * Selects a card, once, when it becomes the nearest to centre.
         *
         * This runs on every scrub frame, so the index guard is what keeps it
         * from restarting a stem and a 1.2s morph sixty times a second.
         */
        const selectCard = (index: number) => {
          if (index === active) return;
          active = index;
          morphTo(index);
        };

        // `inside` is checked before `timeline` is read: onRefresh fires while
        // the timeline is still being constructed, and touching the binding
        // then is a temporal-dead-zone error rather than an undefined.
        const syncToRail = () => {
          if (!inside) return;
          const trigger = timeline.scrollTrigger;
          if (!trigger) return;
          selectCard(nearestCard(trigger.progress));
        };

        const timeline = gsap.timeline({
          scrollTrigger: {
            trigger: root,
            start: "top top",
            end: () => `+=${distanceFor() + window.innerHeight}`,
            pin: true,
            scrub: RAIL_SCRUB,
            anticipatePin: 1,
            invalidateOnRefresh: true,
            /**
             * Which card is active is derived from the scrub itself.
             *
             * It was a ScrollTrigger per card with `start: "left center"`,
             * firing as a card's left edge swept across the middle of the
             * screen. That reads correctly and is geometrically wrong: the
             * track only travels `scrollWidth - viewport`, and once the cards
             * are wide relative to the viewport most of them never make that
             * crossing at all. Measured on the deployed site at 1920x1080, the
             * left edges reached centre at progress -0.72, -0.08, 0.56 and
             * 1.21 — so of four cards exactly one, Solene, ever became active,
             * and three never sounded. It survived review because the pane it
             * was tested in was narrow enough for the geometry to work.
             *
             * Nearest-to-centre has no such dependency: some card is always
             * nearest, at every width, so every card is reachable by
             * construction.
             */
            onUpdate: (self) => {
              if (!inside) return;
              selectCard(nearestCard(self.progress));
            },
            onRefresh: syncToRail,
          },
        });

        /**
         * Whether the rail is on screen, which decides whether the sculpture
         * wears a case identity or the neutral one.
         *
         * ScrollTrigger's own enter/leave callbacks were the obvious mechanism
         * and were wrong twice. `onEnter`/`onEnterBack` fire only at the ends,
         * so scrolling straight into the middle of the rail morphed nothing.
         * `onToggle` fires only when `isActive` changes, and `isActive` is
         * false when the scroll sits exactly on the trigger's start — which is
         * precisely where scroll restoration and anchor links land. Measured
         * there: colour mix 0.143 and silhouette 14.7% of the viewport, the
         * manifesto's state, with the rail filling the screen.
         *
         * An observer has no such edge: it reports the state on its first
         * callback whatever the scroll position, so a page that loads inside
         * the rail is correct on first paint rather than on first scroll.
         *
         * It is deliberately not what moves `recede` — see recedeScrub. A
         * discrete signal is the right shape for "which case is this" and the
         * wrong shape for a value another scrub is continuously asserting.
         */
        const presence = new IntersectionObserver(
          ([entry]) => {
            inside = entry.isIntersecting;
            if (inside) {
              syncToRail();
              return;
            }
            // Forgetting the selection matters as much as stopping the sound:
            // leaving and returning on the same card would otherwise find the
            // index unchanged and never restart its stem or its morph.
            active = -1;
            leaveRail();
          },
          { threshold: 0 },
        );
        presence.observe(root);

        timeline.to(rail, {
          x: () => -distanceFor(),
          ease: "none",
        });


        revealCard.current = (card) => {
          const trigger = timeline.scrollTrigger;
          const distance = distanceFor();
          if (!trigger || distance <= 0) return;

          // Where the track has to sit for this card to be centred, converted
          // back into a document scroll position through the pin's range.
          const offset =
            card.offsetLeft + card.offsetWidth / 2 - window.innerWidth / 2;
          const progress = Math.min(1, Math.max(0, offset / distance));
          window.scrollTo({
            top: trigger.start + (trigger.end - trigger.start) * progress,
            behavior: "auto",
          });
        };

        return () => {
          revealCard.current = null;
          presence.disconnect();
          // kill(true) so the pin is reverted and the pin-spacer unwrapped,
          // putting the section back under the parent React rendered it into.
          timeline.scrollTrigger?.kill(true);
          timeline.kill();
          leaveRail();
        };
      });
    }, root);

    return () => context.revert();
  }, [setActiveCase, playCase, silenceRail]);

  return (
    <>
      {/* A zero-height marker in normal flow. SculptureChoreography times the
          sculpture's return off this rather than off the section, because the
          section is pinned and a pinned element reports positions that no
          longer describe where it sits in the document. */}
      <div data-choreo="rail" aria-hidden="true" className="h-px w-full" />

      <section
        ref={section}
        aria-labelledby="work-rail-title"
        className="relative flex h-dvh flex-col justify-center overflow-hidden motion-reduce:h-auto motion-reduce:overflow-visible motion-reduce:py-[12vh]"
      >
        <div className="relative shrink-0 pb-10">
          {/* The heading is the one piece of copy in this section not sitting
              on a card, and the sculpture is centred in the viewport with
              nothing stopping it reaching up here. On a tall phone the two are
              well clear, but the gap closes as the viewport shortens: at
              485x310 the form already reached into the heading's band. Rather
              than rely on every viewport staying tall enough, this settles the
              text onto ground — the same job, and the same technique, as the
              vignette in SceneRoot. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 -top-[10vh] bottom-0"
            style={{
              background:
                "linear-gradient(to bottom, var(--color-ground) 0%, var(--color-ground) 62%, transparent 100%)",
            }}
          />

          <div className="shell relative">
            <h2 id="work-rail-title" className="font-display text-h2 text-ink">
              Selected work
            </h2>
            <p className="mt-3 font-mono text-mono-xs text-ink-70">
              {String(FEATURED.length).padStart(2, "0")} projects
            </p>
          </div>
        </div>

        {/* The horizontal padding is half a viewport minus half a card, so the
            first card begins centred and the last ends centred.

            A flat 6vw looked equivalent and was not. The track travels
            `scrollWidth - viewport`, which at 1920 with 720px cards is 1171px,
            while the card centres span 2256px — so the sweep could only ever
            bring the middle of the set past the middle of the screen. Measured
            there, Kestrel and the carrier were never the nearest card at any
            scroll position, which is why they never sounded and never morphed.
            Sizing the padding to the viewport makes reaching every card a
            property of the layout rather than a coincidence of how many cards
            there are and how wide they happen to be. */}
        <ul
          ref={track}
          className="flex shrink-0 items-stretch gap-8 px-[calc(50vw-min(40vw,360px))] will-change-transform motion-reduce:flex-col motion-reduce:gap-10 motion-reduce:px-0 motion-reduce:will-change-auto"
        >
          {FEATURED.map((entry, index) => {
            // Sounding, not merely centred: with sound declined or muted the
            // card is still the active one and nothing is playing, and marking
            // it as playing would be a lie told to exactly the people who
            // cannot hear it.
            const isSounding = canPlay && sounding === entry.slug;

            return (
            <li
              key={entry.slug}
              data-case-card
              className="h-[min(62vh,560px)] w-[min(80vw,720px)] shrink-0 motion-reduce:h-auto motion-reduce:w-full motion-reduce:px-[6vw]"
            >
              <Link
                href={`/work/${entry.slug}`}
                onFocus={(event) => revealCard.current?.(event.currentTarget)}
                className={`group flex h-full flex-col justify-between border bg-ground-lift p-8 transition-colors duration-[var(--dur-base)] hover:border-ink-40 focus-visible:outline-2 motion-reduce:h-auto motion-reduce:gap-8 ${
                  isSounding ? "border-signal" : "border-ink-15"
                }`}
              >
                <div>
                  <p className="flex items-center gap-3 font-mono text-mono-xs text-ink-70">
                    <span>
                      {String(index + 1).padStart(2, "0")} · {entry.sector} ·{" "}
                      {entry.tier} · {entry.year}
                    </span>
                    {isSounding && (
                      <span className="text-signal">◉ SOUNDING</span>
                    )}
                  </p>

                  <p
                    data-case-title
                    className="mt-8 font-display text-h1 text-ink"
                  >
                    {entry.client}
                  </p>
                </div>

                {/* §6.1 item 5: a 120px waveform thumbnail that reads against
                    the playing stem. The shape is the deterministic rule seeded
                    per case rather than live analyser data — the analyser holds
                    one mix, not one trace per card — but it marks the card that
                    is actually sounding, which is what the requirement is for.

                    signal-dim, not signal. 160 strokes across a 120px box is a
                    lot of area: measured at 486x702 the lit waveform alone came
                    to 3.43% of the viewport, and with the card border and the
                    two mono labels the screen totalled 4.46% against the 4%
                    ceiling §3.1 rule 1 puts on the accent. signal-dim is the
                    token for a meter tail, which is exactly what this is, and
                    it leaves full signal to the border and the badge — the two
                    marks that actually say "this one". Measured at 5.96:1 on
                    ground-lift, comfortably past the 3:1 SC 1.4.11 asks of a
                    non-text indicator. */}
                <WaveformRule
                  seed={index + 11}
                  className="h-[120px] shrink-0 transition-colors duration-[var(--dur-base)]"
                  // Inline, not a utility class. WaveformRule carries its own
                  // `text-ink-40` default, and two colour utilities on one
                  // element are resolved by their order in the generated
                  // stylesheet rather than in the class attribute — so which
                  // one wins is a coincidence of token declaration order. It
                  // happened to favour `text-signal` and not `text-signal-dim`,
                  // which is how this shipped grey for a minute.
                  style={
                    isSounding
                      ? { color: "var(--color-signal-dim)" }
                      : undefined
                  }
                />

                <div>
                  <p className="max-w-[46ch] text-body text-ink-70">
                    {entry.summary}
                  </p>
                  <p className="mt-6 font-mono text-mono-xs text-signal">
                    Open case →
                  </p>
                </div>
              </Link>
            </li>
            );
          })}
        </ul>
      </section>
    </>
  );
}
