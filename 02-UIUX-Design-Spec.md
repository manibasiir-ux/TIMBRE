# TIMBRE — UI/UX Design Specification

**Project code:** 01-TIMBRE
**Companion documents:** `01-PRD.md`, `03-Roadmap-and-Plan.md`
**Stack:** Next.js (App Router, React 19) · Tailwind CSS v4 · GSAP + ScrollTrigger · react-three-fiber + drei · Lenis · Vercel

---

## 1. Art direction and moodboard

The site should feel like standing in a mastering suite at 2am with the lights down: near-black, acoustically dead, one instrument panel glowing.

**Ground:** `#0B0B0C` — not black, a studio grey with a trace of blue that reads as "unlit room" rather than "OLED void". There is no white page anywhere in the product.

**Signal:** a single acid yellow, `#E8FF2B` — a clipping LED, a peak-hold indicator, hazard tape on a flight case. Rationed hard: never more than 4% of any viewport. It marks the live element, the thing currently making sound, the next action.

**Texture:** a 4% opacity monochrome grain overlay at 128×128, tiled and animated across three frames at 12 fps; beneath it, horizontal scanline banding at 2% opacity on hero sections only.

**Furniture:** waveform. Horizontal rules are 24px-tall SVG waveform strips rendered from real audio of the studio's own mnemonic, drawn in `--color-ink-40` — dividing sections the way a track divider divides a DAW timeline.

**Type:** enormous and condensed, filling the measure edge-to-edge with manual line breaks that behave like a poster, not a paragraph. Uppercase, tightly tracked, frequently cropped by the viewport edge on purpose.

**Photography:** monochrome, high-grain, tungsten-lit — hands on a console, a ribbon mic in a dead room, a rack of Neve preamps, an anechoic chamber. Never stock. Desaturated to 0% and re-tinted 6% toward `--color-warm-shade`.

**Motion:** mechanical and weighted — faders that overshoot slightly and settle, meters that fall with a real 300ms release, panels that slide rather than fade. Nothing bounces playfully; everything moves like equipment.

## 2. Typography system

| Role | Typeface | Foundry | Usage |
|---|---|---|---|
| Display | **Druk Wide** (Bold) | Commercial Type | Hero lockups, section numerals, big statements |
| Display alt | **Druk Condensed** (Super) | Commercial Type | Long headlines where Wide would break, case study titles |
| Body | **Söhne** (Buch, Kräftig) | Klim Type Foundry | All running copy, UI labels, navigation |
| Data / labels | **JetBrains Mono** (Regular, Medium) | JetBrains | Timecodes, LUFS values, channel labels, file trees, price bands, form hints |

Fallback stacks: `"Druk Wide", "Arial Black", system-ui, sans-serif` · `"Söhne", -apple-system, "Helvetica Neue", sans-serif` · `"JetBrains Mono", ui-monospace, "SF Mono", monospace`.

Loading: self-hosted WOFF2, subset to Latin + punctuation, `font-display: swap`, preloaded for Druk Wide Bold and Söhne Buch only. Total font payload budget: **96 KB**.

### 2.1 Scale

| Token | Element | `clamp()` | Weight | Tracking | Line-height |
|---|---|---|---|---|---|
| `--text-mega` | Hero lockup | `clamp(4rem, 13vw, 15rem)` | Druk Wide 700 | `-0.045em` | `0.82` |
| `--text-display` | Section openers | `clamp(3rem, 8.5vw, 8.5rem)` | Druk Wide 700 | `-0.035em` | `0.88` |
| `--text-h1` | Page titles | `clamp(2.5rem, 6vw, 5.5rem)` | Druk Cond 800 | `-0.02em` | `0.92` |
| `--text-h2` | Block headings | `clamp(1.875rem, 3.6vw, 3.25rem)` | Druk Cond 800 | `-0.015em` | `1.0` |
| `--text-h3` | Sub-headings | `clamp(1.375rem, 2.2vw, 1.875rem)` | Söhne 600 | `-0.01em` | `1.15` |
| `--text-lead` | Intro paragraphs | `clamp(1.125rem, 1.6vw, 1.5rem)` | Söhne 400 | `-0.005em` | `1.45` |
| `--text-body` | Running copy | `clamp(1rem, 1.05vw, 1.125rem)` | Söhne 400 | `0` | `1.6` |
| `--text-small` | Captions, credits | `0.875rem` | Söhne 400 | `0.005em` | `1.5` |
| `--text-mono` | Data, labels | `0.8125rem` | JetBrains 500 | `0.09em` | `1.35` |
| `--text-mono-xs` | Channel strips, meters | `0.6875rem` | JetBrains 500 | `0.14em` | `1.2` |

All `--text-mono*` tokens render `text-transform: uppercase` and `font-variant-numeric: tabular-nums`. Measure is capped at `64ch` for `--text-body`, `48ch` for `--text-lead`.

## 3. Colour system

| Token | Hex | Role |
|---|---|---|
| `--color-ground` | `#0B0B0C` | Page background, the constant |
| `--color-ground-lift` | `#141416` | Cards, panels, the desk overlay |
| `--color-ground-deep` | `#050506` | Modal scrim, hero vignette |
| `--color-ink` | `#F4F4F0` | Primary text (bone white, never pure) |
| `--color-ink-70` | `#F4F4F0` @ 70% | Secondary text |
| `--color-ink-40` | `#F4F4F0` @ 40% | Waveform rules, disabled states |
| `--color-ink-15` | `#F4F4F0` @ 15% | Hairlines, borders |
| `--color-signal` | `#E8FF2B` | The accent. Live state, hover, focus, CTA |
| `--color-signal-dim` | `#8A9A1A` | Pressed signal, meter tail |
| `--color-warm-shade` | `#3A342C` | Photo tint, warm shadow in gradients |
| `--color-peak` | `#FF4A1F` | Clip/error only. Form errors, over-limit meters |
| `--color-ok` | `#5BE3A5` | Success only. Form confirmation |

### 3.1 Usage rules

1. `--color-signal` never covers more than 4% of viewport area. It marks exactly one primary action per screen.
2. Body copy is always `--color-ink` or `--color-ink-70` on `--color-ground`. Signal yellow is **never** used for running copy at any size.
3. Signal-filled buttons use `--color-ground` text, not white.
4. `--color-peak` appears only for errors and clipping. It never decorates.
5. Panel elevation is expressed by background lift (`--color-ground-lift`) plus a 1px `--color-ink-15` top border — never by drop shadow.
6. Focus rings are always `--color-signal`, 2px, 3px offset.

### 3.2 Measured contrast (WCAG 2.2)

| Pair | Ratio | Verdict |
|---|---|---|
| `#F4F4F0` on `#0B0B0C` | **18.4:1** | AAA all sizes |
| `#F4F4F0` @70% on `#0B0B0C` | **9.7:1** | AAA all sizes |
| `#F4F4F0` @40% on `#0B0B0C` | **3.6:1** | Non-text/decorative only — AA for UI components (3:1), fails for text |
| `#E8FF2B` on `#0B0B0C` | **15.9:1** | AAA all sizes |
| `#0B0B0C` on `#E8FF2B` | **15.9:1** | AAA — the signal button |
| `#F4F4F0` on `#141416` | **17.0:1** | AAA |
| `#FF4A1F` on `#0B0B0C` | **5.4:1** | AA normal text, AAA large |
| `#5BE3A5` on `#0B0B0C` | **11.8:1** | AAA |
| `#E8FF2B` on `#141416` | **14.7:1** | AAA |

`--color-ink-40` is prohibited for text. Its 3.6:1 clears the 3:1 threshold for non-text UI components (WCAG 2.2 SC 1.4.11) only.

## 4. Motion system

### 4.1 Named easings

```css
--ease-fader:    cubic-bezier(0.22, 1, 0.36, 1);      /* power4.out — settling, most UI */
--ease-transport:cubic-bezier(0.65, 0, 0.35, 1);      /* power2.inOut — symmetric moves */
--ease-attack:   cubic-bezier(0.16, 1, 0.3, 1);       /* expo.out — text reveals */
--ease-release:  cubic-bezier(0.55, 0, 1, 0.45);      /* expo.in — exits */
--ease-detent:   cubic-bezier(0.34, 1.4, 0.64, 1);    /* back.out(1.4) — fader snap only */
--ease-linear:   cubic-bezier(0, 0, 1, 1);            /* meters, scrub, scroll-linked */
```

### 4.2 Duration scale

| Token | Value | Use |
|---|---|---|
| `--dur-tick` | `0.12s` | Meter update, hover tint |
| `--dur-quick` | `0.24s` | Button, fader grab, label swap |
| `--dur-base` | `0.45s` | Panel slide, card reveal |
| `--dur-slow` | `0.9s` | Route transition, desk overlay |
| `--dur-cine` | `1.4s` | Hero entrance, sculpture morph |
| `--dur-epic` | `2.2s` | Preloader outro |

### 4.3 Principles

1. **Everything has release.** Nothing snaps to zero. Meters fall over 300ms, panels ease out over 450ms.
2. **Scroll-linked motion is always `--ease-linear`** with `scrub: 1` (1s catch-up). Time-based motion uses the named curves.
3. **One hero motion per viewport.** Never two competing scrub timelines on screen.
4. **Overshoot is reserved for faders.** `--ease-detent` appears nowhere else.
5. **Motion carries meaning.** If an element moves, it is because state changed or sound changed.
6. **`prefers-reduced-motion` is a first-class art direction**, not a stripped version: opacity-only transitions at `--dur-quick`, static composed sculpture, full content parity.

## 5. Grid and spacing

- **Container:** `max-width: 1680px`, gutters `clamp(1.25rem, 4vw, 5rem)`.
- **Grid:** 12 columns, `gap: clamp(1rem, 1.6vw, 2rem)`. Mobile collapses to 4 columns.
- **Asymmetry rule:** no full-width 12-col text blocks. Editorial copy sits on `col-start-2 / span 6` or `col-start-6 / span 6`; imagery breaks the grid by bleeding one gutter.
- **Spacing scale (Tailwind v4 `@theme`):** `--spacing-1: 0.25rem` … `2: 0.5`, `3: 0.75`, `4: 1`, `6: 1.5`, `8: 2`, `12: 3`, `16: 4`, `24: 6`, `32: 8`, `48: 12`, `64: 16`, `96: 24rem`.
- **Section rhythm:** vertical padding `clamp(6rem, 14vh, 14rem)` top and bottom. Waveform rule sits in the gap, centred.
- **Transport bar reserve:** every page has `padding-bottom: calc(64px + env(safe-area-inset-bottom))` so the bar never overlaps content.
- **Baseline:** 8px vertical rhythm for all body-level components; display type opts out.

## 6. Section-by-section UI

### 6.1 Home `/`

1. **Preloader** — full-bleed `--color-ground`. Centred: `TIMBRE` in `--text-display`, mono percentage below, and a 320px waveform progress bar that fills left-to-right in `--color-signal` as assets load.
2. **Consent gate** — the preloader does not leave; it transforms. Percentage swaps for two stacked mono buttons: `▶ PLAY THE ROOM` (signal-filled) and `STAY SILENT` (ghost, `--color-ink-15` border). Beneath, `--text-small` in `--color-ink-70`: "Everything works without sound. You can change this at any time."
3. **Hero** — WebGL canvas fixed at `inset-0`, `z-0`. Over it, the lockup on a 12-col grid: `WE MAKE` (cols 1–7), `BRANDS` (cols 3–10, offset), `AUDIBLE` (cols 2–9), each in `--text-mega`. Bottom-left: mono metadata block (`SONIC IDENTITY STUDIO / LONDON / EST. 2019`). Bottom-right: scroll cue — a 1px vertical line with a travelling signal dot.
4. **Manifesto** — three lines at `--text-display`, each on its own scroll beat, right-aligned in cols 4–12. Sculpture recedes and desaturates behind.
5. **Work rail** — horizontal, scrub-driven. Four featured cases as full-height cards: client name `--text-h1`, sector + package as mono chips, a live 120px waveform thumbnail. Active card's waveform animates against the playing stem.
6. **Service ticker** — a single marquee line at `--text-h2` scrolling right-to-left at 40px/s, six service lines separated by a signal diamond `◆`. Direction reverses with scroll direction.
7. **Client wall** — 5×3 asymmetric logo grid in `--color-ink-40`, each becoming `--color-ink` on hover with a 0.12s crossfade.
8. **Journal teaser** — two posts, editorial layout, waveform rule between.
9. **Brief slab** — full-bleed. `LET'S MAKE / SOMETHING / AUDIBLE` in `--text-mega`, with a signal-filled CTA. Sculpture collapses into a flat pulsing line behind it.

### 6.2 Work `/work`
Sticky filter row of channel-strip buttons (`ALL · FINTECH · MOBILITY · HOSPITALITY · CPG · AVIATION`) with a mono result count. Below, a 12-col asymmetric grid where cards occupy 4, 5, 6 or 7 columns in a deliberately irregular rhythm — no two rows share a layout. Hover: card lifts 8px, waveform thumbnail animates, a 4s preview plays at −22 LUFS with a `PREVIEWING` mono badge.

### 6.3 Case study `/work/[slug]`
Hero: client name in `--text-mega` cropped at the right viewport edge; mono spec block (`SECTOR / PACKAGE / YEAR / TERRITORIES`) bottom-left. Then in order — **The Brief** (one `--text-lead` paragraph, cols 2–7); **The Insight** (pull-quote at `--text-h1`, signal-coloured opening quote mark); **The System** (asset inventory as a playable file-tree list — name, duration, LUFS, format; the playing row takes a `--color-ground-lift` background and a signal left-border); **In Context** (three environment players — IN-VEHICLE / IN-APP / IN-STORE — as large tappable panels with looping muted video and a signal speaker glyph); **Guidelines** (horizontal-scrubbed gallery of spread photography); **Results** (three metrics at `--text-display`, count-up on enter); **Credits** (mono, two-column); **Next Project** (full-bleed, pre-morphs the sculpture on hover).

### 6.4 Services `/services`
Six service lines as stacked channel strips. Collapsed: mono number (`01`–`06`), name at `--text-h2`, mini waveform, `+`. Expanded (accordion, 0.45s `--ease-fader`): description, deliverables, typical duration, containing packages. Below: the package comparison table — three columns on `--color-ground-lift`, IDENTITY highlighted with a signal top border and a `MOST COMMON` mono tag, price bands in `--text-h3` mono. Then the retainer panel (full-bleed, signal hairline frame), a plain-English licensing summary, and a 9-item FAQ accordion.

### 6.5 Studio `/studio`
Statement at `--text-display`, cols 1–8. Team grid 3×3, monochrome portraits; hover warms the portrait to full tone over 0.3s while a 2s signature sound plays and a mini-waveform draws under the name. Room gallery as a horizontal scrubbed strip. Kit list in mono, three columns. Awards as a mono list (year / body / project). Open roles as signal-underlined links.

### 6.6 Process `/process`
The spine is a horizontally scrubbed five-phase timeline, pinned for 500vh. A signal playhead travels left-to-right along a waveform track; each phase's content fades in at its marker. Below the pin, the **delivery manifest** — a monospace file-tree with expandable folders showing real naming conventions (`tmb_kestrel_ui_confirm_v03_-16LUFS_48k24.wav`), a format matrix (WAV/AIFF/OGG/MP3/M4A × platform), the handoff-target list (Figma, Storybook, Unity, Wwise, FMOD), and a governance diagram.

### 6.7 Journal `/journal`, `/journal/[slug]`
Index: reverse-chronological rows — date (mono), title (`--text-h2`), reading time, and a signal `◉ AUDIO ESSAY` flag where applicable. Hover fills the row with `--color-ground-lift` and slides the title 16px right. Post: single column, cols 3–9, `--text-body` at 64ch; `<Listen>` embeds render as full-width dark panels with a real waveform, timecode and transcript disclosure; pull-quotes break to cols 2–10.

### 6.8 Brief Us `/brief`
Four steps, with a mono progress readout top-right (`STEP 02 / 04`) and a four-segment signal bar. Inputs are borderless with a 1px `--color-ink-15` bottom rule that becomes 2px `--color-signal` on focus; mono uppercase labels translate up 18px and scale to 0.75 on focus/fill. Budget bands are radio cards laid out as faders — selecting one raises a signal fill from the bottom. Errors: `--color-peak` text plus a 0.3s 6px shake at `--ease-transport`. Success: the form dissolves upward, the transport bar plays a 1.4s confirmation mnemonic, and the reference code renders in `--text-h1` mono.

### 6.9 404
"DEAD CHANNEL" at `--text-mega`. The sculpture renders as pure noise-floor static. A single signal CTA returns to `/`.

## 7. Animation and interaction specs

| Element | Trigger | Motion | Easing | Duration | Stagger |
|---|---|---|---|---|---|
| Preloader waveform | Asset progress | Width 0→100%, signal fill | `--ease-linear` | tied to load | — |
| Preloader outro | Consent choice | Panel splits vertically, halves exit ±100vh | `--ease-release` | 1.1s | 0.08s between halves |
| Hero lockup | Load complete | Per-character `y: 110% → 0`, `rotateX: -40deg → 0` | `power4.out` | 1.1s | **0.04s** per char |
| Hero metadata | Load + 0.6s | Fade + `y: 20 → 0` | `--ease-attack` | 0.7s | 0.06s |
| Sculpture entrance | Load complete | Scale `0.4 → 1`, camera dolly `z: 9 → 5.2` | `power3.out` | 1.8s | — |
| Sculpture scroll | ScrollTrigger scrub | Camera orbit 0→0.9rad, displacement gain 1→2.4 | linear | `scrub: 1` | — |
| Sculpture morph | Work card enters | Geometry lerp, palette mix, roughness `0.9→0.15` | `power2.inOut` | 1.2s | — |
| Manifesto lines | Line enters 75% | Per-word mask reveal `y: 100% → 0` | `expo.out` | 0.9s | 0.05s per word |
| Work rail | Pinned scrub | `x: 0 → -(scrollWidth - vw)` | linear | `scrub: 1.2` | — |
| Work card hover | Pointer enter | `y: -8px`, waveform amplitude ×1.6 | `--ease-fader` | 0.35s | — |
| Section reveal | 80% viewport | `opacity 0→1`, `y: 48 → 0` | `power3.out` | 0.8s | 0.07s |
| Waveform rule | Enters view | SVG `stroke-dashoffset` draws L→R | `power2.out` | 1.2s | — |
| Metric count-up | Enters view | 0 → value, tabular-nums | `power2.out` | 1.6s | 0.12s |
| Transport meter | Every frame | Attack 30ms, release 300ms peak-hold | — | continuous | — |
| Fader grab | Pointerdown | `scaleY 1 → 1.08`, cap glows signal | `--ease-quick` | 0.12s | — |
| Fader release | Pointerup | Snap to detent | `--ease-detent` | 0.5s | — |
| Desk overlay open | Toggle / `M` | `y: 100% → 0`, backdrop-blur `0 → 12px` | `--ease-fader` | 0.9s | 0.045s per strip |
| Desk overlay close | Esc / outside | `y: 0 → 100%` | `--ease-release` | 0.6s | reversed |
| Route transition | Link click | Signal wipe 0→100% width, content swap, wipe out | `--ease-transport` | 0.45s + 0.45s | — |
| Accordion | Click | `height auto` via GSAP, chevron rotate 90° | `--ease-fader` | 0.45s | — |
| Form field focus | Focus | Rule `--color-ink-15 → --color-signal`, 1px→2px; label `y: -18px, scale 0.75` | `--ease-fader` | 0.24s | — |
| Form error | Invalid submit | `x: ±6px` ×3 | `--ease-transport` | 0.3s | — |
| Cursor VU | Pointermove | Ring radius maps to RMS, 60fps lerp 0.15 | — | continuous | — |
| Grain | Always | 3-frame `background-position` cycle | steps(3) | 0.25s loop | — |

### 7.1 Lenis + ScrollTrigger integration

```ts
// app/providers/SmoothScroll.tsx
'use client'
import { useEffect } from 'react'
import Lenis from 'lenis'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

export function SmoothScroll({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) {
      ScrollTrigger.normalizeScroll(false)
      return
    }

    const lenis = new Lenis({
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // expo.out
      orientation: 'vertical',
      smoothWheel: true,
      syncTouch: false,        // native momentum on touch — do not fight iOS
      touchMultiplier: 1.6,
      wheelMultiplier: 1.0,
    })

    lenis.on('scroll', ScrollTrigger.update)

    const raf = (time: number) => lenis.raf(time * 1000)
    gsap.ticker.add(raf)
    gsap.ticker.lagSmoothing(500, 33)

    ScrollTrigger.scrollerProxy(document.body, {
      scrollTop: (v) => (v !== undefined ? lenis.scrollTo(v, { immediate: true }) : lenis.scroll),
    })
    ScrollTrigger.refresh()

    return () => {
      gsap.ticker.remove(raf)
      lenis.destroy()
      ScrollTrigger.getAll().forEach((t) => t.kill())
    }
  }, [])

  return <>{children}</>
}
```

### 7.2 GSAP timeline — hero entrance

```ts
// components/hero/useHeroIntro.ts
import gsap from 'gsap'
import SplitText from 'gsap/SplitText'

export function playHeroIntro(scope: HTMLElement, onSculpture: (v: number) => void) {
  const ctx = gsap.context(() => {
    const split = new SplitText('[data-hero-line]', { type: 'chars', charsClass: 'char' })

    const tl = gsap.timeline({ defaults: { ease: 'power4.out' } })

    tl.set('[data-hero-line]', { autoAlpha: 1 })
      .from(split.chars, {
        yPercent: 110,
        rotateX: -40,
        duration: 1.1,
        stagger: 0.04,
        transformOrigin: '50% 100%',
      })
      .to({ v: 0 }, {
        v: 1, duration: 1.8, ease: 'power3.out',
        onUpdate() { onSculpture(this.targets()[0].v) },
      }, 0.2)
      .from('[data-hero-meta] > *', {
        y: 20, autoAlpha: 0, duration: 0.7, stagger: 0.06, ease: 'expo.out',
      }, 0.6)
      .from('[data-transport]', {
        yPercent: 100, duration: 0.8, ease: 'power4.out',
      }, 0.9)
      .from('[data-scroll-cue]', { autoAlpha: 0, duration: 0.5 }, 1.4)
  }, scope)

  return () => ctx.revert()
}
```

### 7.3 GSAP timeline — pinned work rail with per-case sculpture morph

```ts
// components/work/useWorkRail.ts
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

export function initWorkRail(
  section: HTMLElement,
  track: HTMLElement,
  morphTo: (index: number) => void,
) {
  const ctx = gsap.context(() => {
    const distance = track.scrollWidth - window.innerWidth

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: section,
        start: 'top top',
        end: () => `+=${distance + window.innerHeight}`,
        pin: true,
        scrub: 1.2,
        anticipatePin: 1,
        invalidateOnRefresh: true,
      },
    })

    tl.to(track, { x: -distance, ease: 'none' })

    gsap.utils.toArray<HTMLElement>('[data-case-card]').forEach((card, i) => {
      ScrollTrigger.create({
        trigger: card,
        containerAnimation: tl,
        start: 'left center',
        end: 'right center',
        onEnter: () => morphTo(i),
        onEnterBack: () => morphTo(i),
      })
      gsap.from(card.querySelector('[data-case-title]'), {
        yPercent: 60, autoAlpha: 0, ease: 'power3.out', duration: 0.8,
        scrollTrigger: { trigger: card, containerAnimation: tl, start: 'left 85%', toggleActions: 'play none none reverse' },
      })
    })
  }, section)

  return () => ctx.revert()
}
```

### 7.4 react-three-fiber — audio-reactive sculpture

```tsx
// components/webgl/SoundSculpture.tsx
'use client'
import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Icosahedron } from '@react-three/drei'
import * as THREE from 'three'
import { useAudioAnalyser } from '@/lib/audio/useAudioAnalyser'

const vertex = /* glsl */ `
  uniform float uTime, uLow, uMid, uHigh, uGain;
  varying float vDisp;
  ${/* simplex noise omitted for brevity — import from lib/glsl/snoise.glsl */ ''}
  void main() {
    vec3 p = position;
    float n = snoise(p * 1.7 + uTime * 0.18);
    float disp = n * (0.18 + uLow * 0.9) * uGain
               + sin(p.y * 14.0 + uTime * 3.0) * uMid * 0.09
               + uHigh * 0.05;
    vDisp = disp;
    p += normal * disp;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`

const fragment = /* glsl */ `
  uniform vec3 uBase, uSignal;
  uniform float uMix;
  varying float vDisp;
  void main() {
    float t = smoothstep(-0.1, 0.5, vDisp);
    vec3 c = mix(uBase, uSignal, t * uMix);
    gl_FragColor = vec4(c, 1.0);
  }
`

export function SoundSculpture({ detail = 64, gain = 1 }: { detail?: number; gain?: number }) {
  const mat = useRef<THREE.ShaderMaterial>(null!)
  const mesh = useRef<THREE.Mesh>(null!)
  const { bands } = useAudioAnalyser() // { low, mid, high } 0..1, smoothed

  const uniforms = useMemo(() => ({
    uTime:   { value: 0 },
    uLow:    { value: 0 }, uMid: { value: 0 }, uHigh: { value: 0 },
    uGain:   { value: gain },
    uBase:   { value: new THREE.Color('#141416') },
    uSignal: { value: new THREE.Color('#E8FF2B') },
    uMix:    { value: 1 },
  }), [gain])

  useFrame((state, dt) => {
    const u = mat.current.uniforms
    u.uTime.value += dt
    u.uLow.value  = THREE.MathUtils.lerp(u.uLow.value,  bands.current.low,  0.18)
    u.uMid.value  = THREE.MathUtils.lerp(u.uMid.value,  bands.current.mid,  0.22)
    u.uHigh.value = THREE.MathUtils.lerp(u.uHigh.value, bands.current.high, 0.3)
    mesh.current.rotation.y += dt * 0.06
  })

  return (
    <Icosahedron ref={mesh} args={[1.6, detail]}>
      <shaderMaterial ref={mat} uniforms={uniforms} vertexShader={vertex} fragmentShader={fragment} />
    </Icosahedron>
  )
}
```

## 8. Experimental navigation — the mixing desk

**Resting state.** A 64px master transport bar fixed to the bottom of the viewport: `--color-ground-lift`, 1px `--color-ink-15` top border, `backdrop-filter: blur(16px)`. Left to right — play/pause (36px), a live stereo VU pair (2×4px columns, peak-hold caps in `--color-signal`), the current stem label in `--text-mono-xs`, elapsed/total timecode, a full-width scrub track, a mute toggle, and the desk toggle `≡ DESK`.

**The scrub track is the scroll-progress indicator.** Its signal fill maps to `document` scroll progress, not audio position; audio position is a separate 2px inner marker. Dragging the track scrolls the document via `lenis.scrollTo`.

**Open state.** The desk expands to `min(70vh, 620px)`, revealing seven stacked horizontal channel strips — HOME · WORK · SERVICES · STUDIO · PROCESS · JOURNAL · BRIEF. Each strip carries, left to right: a two-digit mono channel number (`01`…`07`), the section name at `--text-h3`, a 6-segment mini-VU showing scroll position *within* that section, and a horizontal fader (4px `--color-ink-15` rail, 48×24px cap in `--color-ground-lift` that turns `--color-signal` on grab).

**Fader behaviour.** Dragging scrubs a live preview: the strip background fills with that section's key image at 30% opacity and the label swaps to the sub-section under the playhead. Release snaps the cap to the nearest of five detents (`--ease-detent`, 0.5s) and navigates to that scroll position. Clicking the channel name navigates to the section start.

**Keyboard.** `M` toggles the desk. `↑`/`↓` move between strips, `←`/`→` move the focused fader in 5% increments, `Home`/`End` jump to 0%/100%, `Enter` commits, `Esc` closes and returns focus to `≡ DESK`. Each fader is `role="slider"` with `aria-valuemin/max/now` and `aria-valuetext="Work, 40 percent"`.

**Mobile.** Below 768px the desk becomes a full-screen sheet with a drag handle; detents reduce to three; the VU pair collapses to a single mono meter.

## 9. Responsive behaviour

| Breakpoint | Width | Changes |
|---|---|---|
| `xs` | < 480px | 4-col grid, `--text-mega` floors at 4rem, work rail becomes vertical stack, hero lockup left-aligned single column, transport bar drops the stem label |
| `sm` | 480–767px | Manifesto left-aligns, client wall 3×5, journal rows stack |
| `md` | 768–1023px | 8-col grid, desk becomes a bottom sheet at 60vh, team grid 2×5, process timeline unpins and becomes vertical |
| `lg` | 1024–1439px | Full 12-col grid, all pinned scrub sections active, desk overlay full behaviour |
| `xl` | 1440–1919px | Reference design width. Container 1440px |
| `2xl` | ≥ 1920px | Container caps at 1680px; hero type caps at 15rem; sculpture camera FOV widens 42° → 48° to keep composition |

**Mobile WebGL degradation:**

1. Icosahedron detail drops `64 → 24`; the GPU point cloud drops from 120,000 to 24,000 points.
2. `dpr` clamped to `[1, 1.5]` (desktop `[1, 2]`).
3. Post-processing (bloom, film grain pass) disabled; grain moves to a CSS overlay.
4. Camera scrub replaced with three discrete keyframed positions triggered by `toggleActions`.
5. Canvas renders on demand (`frameloop="demand"`) when the sculpture is off-screen.
6. On `deviceMemory < 4` or a matched software-rasteriser string, the canvas is not mounted at all — the pre-rendered VP9 loop plays instead.
7. Audio: only the master bed loads eagerly (48 kbps HE-AAC on mobile vs 128 kbps AAC desktop); stems load on demand.

## 10. Accessibility

**Standard:** WCAG 2.2 AA, verified with axe-core in CI (0 serious/critical) and one manual NVDA + one VoiceOver pass per release.

- **Contrast:** all pairs in §3.2 meet AA or better. `--color-ink-40` is never used for text.
- **Reduced motion:** disables Lenis, converts every `scrub` ScrollTrigger to `toggleActions: 'play none none none'`, freezes camera motion, renders the sculpture at a fixed composed pose, caps all durations at 0.2s, stops the grain animation, and makes marquee tickers static. Content parity is absolute — no information exists only in motion.
- **Keyboard paths:** a skip link is the first focusable element. Ordered path: skip link → logo → desk toggle → transport controls → main content → footer. Every fader, accordion, filter and player is keyboard-operable. Focus ring `outline: 2px solid var(--color-signal); outline-offset: 3px`, never removed.
- **Focus management:** opening the desk moves focus to the first channel strip and traps it; closing returns focus to `≡ DESK`. Route changes move focus to the new `<h1>` and announce the title via `aria-live="polite"`.
- **The 3D canvas:** `<canvas aria-hidden="true">` inside a container with `role="img"` and an `aria-label` updated per case study — "Abstract sound sculpture reacting to the Kestrel payment confirmation tone." A visually-hidden `<p>` describes the current state. The canvas is never focusable and holds no information absent from the DOM.
- **Audio autoplay consent:** no audio before an explicit gesture. The gate offers a genuinely equal "STAY SILENT" path; the choice persists, is respected on return visits, and is reversible from the transport bar in one interaction. Global mute on `Shift + M`. Every asset has a transcript (voice) or descriptive caption (music/SFX) in a `<details>` disclosure, not a tooltip.
- **Motion sensitivity:** nothing flashes above 3 Hz; VU meters are amplitude-mapped, not strobing.
- **Targets:** all interactive targets ≥ 44×44px (SC 2.5.8); fader caps are 48×24px with a 44px-tall invisible hit area.
- **Forms:** persistent visible labels (never placeholder-only), errors announced via `aria-live="assertive"` and linked with `aria-describedby`, budget bands in a proper `fieldset`/`legend`.

## 11. What this borrows from the three reference sites

### 11.1 normalisboring.es (LaNegrita)
**Taken:** the "unconventional narrative in a conventional sector" thesis, oversized editorial type with dramatic manual line breaks, enormous negative space, asymmetric gallery grids, and the modal "unlock your dream" contact overlay as progressive disclosure.
**Transformed:** their sector is luxury real estate in oak and limestone; ours is B2B audio in studio grey and clipping-LED yellow — a material-led palette becomes an *equipment*-led palette. Their contact modal becomes our four-step Brief Us flow, disclosing progressively for a different reason: to qualify budget without a paywall. Their asymmetric galleries become our Work index rhythm where no two rows share a column layout. Their quiet-luxury restraint becomes the 4%-of-viewport rationing of signal yellow.

### 11.2 tabasco.abdurrahimali.com (Abdurrahim Ali)
**Taken:** ONE hero 3D object carried through the entire page, scroll-scrubbed camera moves instead of conventional scrolling, cinematic studio lighting, and a scrollbar that behaves like a timeline scrubber.
**Transformed:** their object is a static product heroised by light. Ours is a *live instrument*: the same object persists across every route (one canvas in the root layout, never unmounted), but its geometry, material and palette are driven by real Web Audio FFT data and morph per case study. Their scrubber metaphor becomes literal — the master transport bar genuinely is a transport, controlling scroll and audio position on one strip. Their text-and-3D choreography on a single timeline becomes our per-case morph, driven by the same ScrollTrigger `containerAnimation` as the work rail.

### 11.3 members-play.lacoste.com/polo-factory-experience (Merci Michel)
**Taken:** a guided, gamified tour through a world; hotspot-driven exploration of machines; fullscreen immersion; PWA-grade mobile treatment; black theme-colour, safe-area-aware chrome; a progress system that rewards completion.
**Transformed:** their hotspots reveal machines (knitting, dyeing, embroidering); ours reveal *contexts* — the in-vehicle, in-app and in-store players on every case study, each a hotspot into a different acoustic environment. The gamification is dialled down for a B2B audience: instead of badges, completion is rewarded with Wren's bespoke 1.4s confirmation mnemonic on brief submission plus the reference code. Their mobile chrome discipline is inherited wholesale — `theme-color: #0B0B0C`, `viewport-fit=cover`, every fixed element padded with `env(safe-area-inset-bottom)`, and a manifest with maskable icons so the site behaves when added to a home screen from a conference floor.
