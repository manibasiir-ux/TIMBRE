# TIMBRE — Roadmap and Build Plan

*A build story, told straight, with the receipts attached.*

---

## The room, and the people in it

The kickoff happened in TIMBRE's live room in Hackney, which was a poor choice for a meeting — it has a reverb tail of 1.9 seconds and six people talking in it sounds like a swimming pool. Nobody moved. That was the first sign this project would be run by people who liked the metaphor more than the ergonomics.

**Ines Kovač** ran the room. Creative director, ex-Merci Michel, speaks in verbs and refuses to look at a Figma file before she has heard the thing it is meant to represent. Her opening line was: *"If a single frame of this site works with the sound off, we have made a brochure."* She was wrong about that, and she would concede it in week nine, but it set the temperature.

**Douglas Ferreiro** was the technical lead. Three years of R3F in production, allergic to hero sections that ship at 34 fps. He said almost nothing for the first hour, then asked the only question that mattered: *"Is the canvas mounted once, or once per route?"* Once. It was decided in eleven seconds and it shaped everything after it.

**Nour el-Amrani** was the product lead — the one who had actually sat in on nine discovery calls and knew that CMOs bounce when they cannot find a price. She had a laminated card that said **£50k+, with a date** and she put it on the table at every meeting.

**Sam Okoye** did motion and front-end. **Wren Baptiste**, the studio's own composer, was seconded in for two days a week to build the audio bed and the per-case stems. **Kiri Tanaka** joined in week six for QA and accessibility and immediately started a spreadsheet nobody wanted and everybody eventually used.

Fourteen weeks. That was the number. Nobody believed it.

---

## Phase 1 — Discovery (weeks 1–2)

Nour spent week one doing the unglamorous thing: she pulled the transcripts from nine discovery calls and counted the questions. Forty-one percent were about scope. Twenty-six percent were about price. Only eleven percent were about the creative work. She put that chart on the wall and Ines hated it.

The argument that followed took two hours and is the reason this site has published price bands. Ines: *"Bands make us a commodity."* Nour: *"Silence makes us a phone call, and phone calls take three weeks to schedule."* They landed on bands, not fixed prices, and on the IDENTITY tier being the highlighted default — which turned out to be the single highest-leverage decision of the project.

Week two was audio inventory. Wren catalogued what actually existed as playable proof: four case studies with usable stems, two with only mixdowns, and one — an airline — locked under NDA until March. That last fact cost them a whole case study and they found out early, which was luck.

Douglas built a throwaway spike in three days: one icosahedron, one `AnalyserNode`, a slider. He put it on a Pixel 6a and a five-year-old ThinkPad. The ThinkPad ran at 19 fps and the room went quiet. That spike is why the render-profile system exists in the architecture instead of being retrofitted in week twelve.

**Exit criteria met:** content inventory signed off, price bands approved by the studio principals, three personas validated against real call transcripts, technical spike proving audio-reactive displacement at ≥ 55 fps on M1 and ≥ 30 fps on Pixel 6a, and a documented fallback strategy.

---

## Phase 2 — Design (weeks 3–6)

Ines designed the hero before she designed anything else, which is against every process document ever written and was correct. Druk Wide, three lines, cropped at the right edge, sitting over a sculpture that was still a grey placeholder sphere.

Week four broke on colour. The original palette had two accents — the acid yellow and a warm amber for secondary states. Sam built a clickable prototype and the amber made every screen look like a crypto exchange. Ines killed it in a four-minute review. From that point the rule was absolute: **one signal colour, four percent of the viewport, marks the thing making sound.** Everything else earns its place in greyscale.

The mixing desk took three attempts.

Attempt one was vertical channel strips, like a real console viewed head-on. It was beautiful and unusable — the faders ran the wrong way against a vertically scrolling page and every tester tried to scroll the page while dragging.

Attempt two was a full-screen console takeover. Kiri tested it with a keyboard and reported back in one line: *"I got in. I could not get out."* Focus trapping was possible but the mental model was wrong — people did not know they had entered a mode.

Attempt three, week six, is what shipped: horizontal strips in a bottom sheet, one per section, with the master transport bar always visible as the persistent anchor. The transport bar doing double duty as scroll progress was Sam's idea, offered half-jokingly at 11pm, and it solved the "where am I" problem that had haunted attempts one and two.

Wren delivered the master bed in week five: 94 seconds, −18 LUFS integrated, looping seamlessly at a zero crossing, plus six per-case stems. Douglas immediately asked for a baked FFT envelope — a 60 fps JSON of the same analysis — so the sculpture would still move for users who declined audio. That file is 8 KB gzipped and it is the reason the sound-off experience does not feel punished.

**Exit criteria met:** all eight page templates designed at 1440px and 375px, motion prototype approved, design tokens exported as a Tailwind v4 `@theme` block, accessibility contrast audit passed with `--color-ink-40` demoted to non-text use only.

---

## Phase 3 — Build (weeks 7–11)

Douglas set up the repo on a Monday and had the canvas persisting across route transitions by Wednesday. The trick — mounting the `<Canvas>` in the root layout and driving it from a Zustand store rather than from route props — meant that navigating from Home to a case study never remounted a single WebGL context. Route transitions became a wipe over a continuously rendering scene, which is why they feel like scene changes rather than page loads.

Week eight was the work rail and it was miserable. Pinned horizontal scroll plus `containerAnimation` triggers plus Lenis plus a canvas reacting to the same timeline — four systems that each want to own `requestAnimationFrame`. The fix was discipline: **Lenis drives, GSAP's ticker is the only RAF loop, R3F subscribes to it.** Two calls to `gsap.ticker.add` and one `ScrollTrigger.update` listener. Once that hierarchy was written down, the jitter went away.

Week nine, Ines conceded her opening line. Kiri ran a session with a director at a CPG company who had headphones out and would not put them in. She read the whole Kestrel case study in silence and briefed at the end of it. Ines watched the recording twice and then rewrote the case study template so every audio moment carries a written equivalent that stands on its own. The sound-off path stopped being a compliance exercise and became a designed experience.

Week ten was the setback. A Lighthouse run on a throttled Moto G returned an LCP of 4.8 seconds. The Three.js chunk was in the critical path because the hero component imported it at module scope. The fix took two days: `next/dynamic` with `ssr: false`, a capability probe running before mount, and an AVIF poster carrying LCP while the canvas warmed behind it. LCP came back at 2.3 seconds. Douglas added a bundle-size check to CI the same afternoon so it could never regress silently.

Week eleven: forms, Turnstile, Resend, the Slack webhook, the reference-code generator, and Wren's 1.4-second confirmation mnemonic — which the team played roughly four hundred times in one afternoon and which is still, by unanimous vote, the best thing on the site.

---

## Phase 4 — Polish (weeks 12–13)

Kiri's spreadsheet came into its own. Two hundred and six items. Eleven were serious accessibility defects, including one that mattered: the fader `role="slider"` reported its value as a bare number, so VoiceOver announced "forty" with no unit and no context. `aria-valuetext="Work, 40 percent"` fixed it in one line and Kiri made everyone read the WCAG 2.2 slider pattern out loud.

Sam spent four days on release curves. Every meter had been snapping to zero on silence, which read as digital and cheap. A 30ms attack and a 300ms release, with peak-hold caps, made the transport bar feel like hardware. It is a detail nobody will consciously notice and everybody will feel.

Reduced-motion was audited as a design, not a fallback. Ines reviewed it as its own deliverable and rejected the first version because it was "the site with the fun removed". The second version composes the sculpture at a fixed, deliberately good camera angle and uses opacity-only reveals. It looks intentional.

Performance step-down was tested by throttling a real machine until the rolling frame rate dropped below 45 fps, confirming the automatic drop from 120,000 to 24,000 points and the DPR clamp, and that the event fired to analytics.

---

## Phase 5 — Launch (week 14)

Preview deploy on the Monday, shared with six people under NDA. Two content corrections, one broken `?t=` deep link on Safari 17 (a `URLSearchParams` parse running before hydration), one request from a principal to raise a price band by £10k, which was granted.

Production on the Thursday at 07:00 GMT, deliberately before the studio's newsletter went out at 09:00. Douglas watched Sentry. Kiri watched the Checkly synthetics. Nour watched the Slack webhook channel.

The first brief arrived at 09:41. Fintech. Budget band £110–220k. Timeline: Q1. Nour took a photograph of the laminated card next to the screen and sent it to the group chat with no caption.

---

## Roadmap summary

| Phase | Weeks | Owner | Key outputs | Exit criteria |
|---|---|---|---|---|
| **Discovery** | 1–2 | Nour | Content inventory, price bands, personas, technical spike | Spike ≥ 55 fps M1 / ≥ 30 fps Pixel 6a; fallback strategy documented; pricing signed off |
| **Design** | 3–6 | Ines | 8 page templates ×2 breakpoints, motion prototype, token set, master bed + 6 stems | Prototype approved; contrast audit passed; tokens exported to `@theme` |
| **Build** | 7–11 | Douglas | Next.js app, persistent canvas, all routes, forms, CMS-less MDX content | All routes rendering real content; Lighthouse ≥ 80 mobile; axe-core clean in CI |
| **Polish** | 12–13 | Kiri / Sam | A11y remediation, motion refinement, perf profiles, reduced-motion design | 0 serious/critical axe issues; LCP ≤ 2.5s p75 mobile; INP ≤ 180ms |
| **Launch** | 14 | Nour | Preview review, DNS, analytics, monitoring, redirects | Synthetics green 48h; Sentry error rate < 0.3%; first brief received |

---

## Step-by-step build plan

### 1. Environment setup

```bash
npx create-next-app@latest timbre \
  --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
cd timbre

npm i gsap lenis three @react-three/fiber @react-three/drei zustand
npm i -D @types/three prettier prettier-plugin-tailwindcss vitest \
  @vitejs/plugin-react @axe-core/playwright @playwright/test
npm i resend @vercel/blob @vercel/kv zod react-hook-form @hookform/resolvers
npm i next-mdx-remote gray-matter

npx playwright install --with-deps chromium webkit
git init && git add -A && git commit -m "chore: scaffold"
```

GSAP's Club plugins (SplitText, ScrollSmoother) install from the private registry:

```bash
npm config set @gsap:registry https://npm.greensock.com
npm config set //npm.greensock.com/:_authToken $GSAP_TOKEN
npm i gsap@npm:@gsap/business
```

`.env.local`:

```
RESEND_API_KEY=re_xxx
SLACK_BRIEF_WEBHOOK=https://hooks.slack.com/services/xxx
TURNSTILE_SECRET_KEY=0x4xxx
NEXT_PUBLIC_TURNSTILE_SITE_KEY=0x4xxx
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxx
NEXT_PUBLIC_SITE_URL=https://timbre.studio
```

### 2. Tokens before components

Everything from the design spec goes into `src/app/globals.css` as a Tailwind v4 `@theme` block first. No component is written until the tokens exist.

```css
@import "tailwindcss";

@theme {
  --color-ground: #0B0B0C;
  --color-ground-lift: #141416;
  --color-ground-deep: #050506;
  --color-ink: #F4F4F0;
  --color-signal: #E8FF2B;
  --color-signal-dim: #8A9A1A;
  --color-peak: #FF4A1F;
  --color-ok: #5BE3A5;

  --font-display: "Druk Wide", "Arial Black", sans-serif;
  --font-body: "Söhne", -apple-system, sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, monospace;

  --text-mega: clamp(4rem, 13vw, 15rem);
  --text-display: clamp(3rem, 8.5vw, 8.5rem);
  --text-h1: clamp(2.5rem, 6vw, 5.5rem);

  --ease-fader: cubic-bezier(0.22, 1, 0.36, 1);
  --ease-transport: cubic-bezier(0.65, 0, 0.35, 1);
  --ease-detent: cubic-bezier(0.34, 1.4, 0.64, 1);
}
```

### 3. Component build order

Build bottom-up. Nothing depends on something unbuilt.

1. `lib/audio/AudioEngine.ts` — singleton `AudioContext`, master gain, `AnalyserNode` (`fftSize: 2048`, `smoothingTimeConstant: 0.82`), per-source gain, ducking helper.
2. `lib/audio/useAudioAnalyser.ts` — returns a ref of `{ low, mid, high }` normalised bands; falls back to the baked FFT JSON when consent is declined.
3. `lib/webgl/detectProfile.ts` — WebGL2 probe, `MAX_TEXTURE_SIZE`, `deviceMemory`, `hardwareConcurrency`, renderer denylist → `'high' | 'medium' | 'fallback'`, cached in `sessionStorage`.
4. `store/useExperience.ts` — Zustand: `consent`, `isPlaying`, `activeCase`, `profile`, `scrollProgress`, `deskOpen`.
5. `components/webgl/SceneRoot.tsx` — the single `<Canvas>` mounted in `app/layout.tsx`, dynamically imported.
6. `components/webgl/SoundSculpture.tsx` — the shader mesh (see design spec §7.4).
7. `components/transport/TransportBar.tsx` — persistent, keyboard-complete.
8. `components/transport/MixingDesk.tsx` — the overlay, focus-trapped.
9. Primitives: `WaveformRule`, `ChannelStrip`, `Meter`, `SignalButton`, `MonoLabel`, `SplitHeading`.
10. Page sections: hero → manifesto → work rail → services strips → process timeline → forms.
11. Routes, in order: `/` → `/work` → `/work/[slug]` → `/services` → `/process` → `/studio` → `/journal` → `/brief` → `/404`.

### 4. Persistent canvas wiring

```tsx
// src/app/layout.tsx
import dynamic from 'next/dynamic'
import { SmoothScroll } from '@/app/providers/SmoothScroll'
import { TransportBar } from '@/components/transport/TransportBar'

const SceneRoot = dynamic(() => import('@/components/webgl/SceneRoot'), { ssr: false })

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="bg-ground text-ink">
      <body className="min-h-dvh pb-[calc(64px+env(safe-area-inset-bottom))]">
        <a href="#main" className="sr-only focus:not-sr-only">Skip to content</a>
        <SceneRoot />
        <SmoothScroll>
          <main id="main">{children}</main>
        </SmoothScroll>
        <TransportBar />
      </body>
    </html>
  )
}
```

### 5. Animation implementation order

Motion goes in last per component, never first, and always inside `gsap.context()` so route cleanup is one call.

1. Global: Lenis + ScrollTrigger provider (design spec §7.1). Verify `ScrollTrigger.refresh()` on resize and on font load.
2. Hero intro timeline with SplitText, 0.04s per-character stagger (§7.2).
3. Scroll-scrubbed camera and displacement gain — always `ease: 'none'`, `scrub: 1`.
4. Pinned work rail with `containerAnimation` per-card triggers and the sculpture morph callback (§7.3).
5. Section reveals via a shared `useReveal()` hook — `y: 48 → 0`, `power3.out`, 0.8s, 0.07s stagger.
6. Process timeline pin (500vh) with the travelling playhead.
7. Transport meters and fader physics — outside GSAP, in the RAF loop, attack 30ms / release 300ms.
8. Route transitions last, once every page exists.

Reduced motion is guarded once, globally:

```ts
const mm = gsap.matchMedia()
mm.add('(prefers-reduced-motion: no-preference)', () => {
  // all scrub timelines live here
})
mm.add('(prefers-reduced-motion: reduce)', () => {
  gsap.set('[data-reveal]', { autoAlpha: 1, y: 0 })
})
```

### 6. Brief form endpoint

```ts
// src/app/api/brief/route.ts
import { z } from 'zod'
import { Resend } from 'resend'
import { kv } from '@vercel/kv'

const schema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email(),
  company: z.string().min(2),
  services: z.array(z.string()).min(1),
  budget: z.enum(['<50', '50-110', '110-220', '220+', 'tbd']),
  brief: z.string().max(280),
  hp: z.string().max(0),           // honeypot
  token: z.string(),               // Turnstile
})

export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for') ?? 'unknown'
  const hits = await kv.incr(`brief:${ip}`)
  if (hits === 1) await kv.expire(`brief:${ip}`, 600)
  if (hits > 5) return Response.json({ error: 'rate_limited' }, { status: 429 })

  const data = schema.parse(await req.json())

  const verify = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ secret: process.env.TURNSTILE_SECRET_KEY, response: data.token }),
  }).then(r => r.json())
  if (!verify.success) return Response.json({ error: 'verification_failed' }, { status: 400 })

  const ref = `TMB-${new Date().toISOString().slice(2,10).replace(/-/g,'')}-${
    Math.random().toString(36).slice(2,5).toUpperCase()}`

  await new Resend(process.env.RESEND_API_KEY).emails.send({
    from: 'briefs@timbre.studio', to: 'new@timbre.studio',
    subject: `[${ref}] ${data.company} — ${data.budget}`,
    text: JSON.stringify(data, null, 2),
  })
  await fetch(process.env.SLACK_BRIEF_WEBHOOK!, {
    method: 'POST',
    body: JSON.stringify({ text: `New brief ${ref} · ${data.company} · ${data.budget}` }),
  })

  return Response.json({ ok: true, ref })
}
```

### 7. Testing

```bash
npm run test                       # vitest — audio band maths, profile detection, ref-code format
npx playwright test                # e2e: consent gate, desk keyboard path, brief happy + failure
npx playwright test --project=a11y # axe-core on all 9 routes, 0 serious/critical
npx lhci autorun --collect.numberOfRuns=3
```

CI gates on: typecheck, lint, unit, e2e, axe, Lighthouse mobile Performance ≥ 82 / Accessibility ≥ 95, and a bundle-size check failing the build if initial JS exceeds 210 KB gzipped.

Manual matrix before each release: iPhone SE 3, iPhone 15 Pro, Pixel 6a, iPad Air, MacBook Air M1, 27" 2560px — each with sound on, sound off, and reduced motion. One NVDA pass, one VoiceOver pass.

### 8. Deployment

```bash
npm i -g vercel
vercel link
vercel env pull .env.local
vercel --prod
```

`next.config.ts` sets the security headers from NFR-12; `vercel.json` pins the region:

```json
{
  "regions": ["fra1"],
  "headers": [{
    "source": "/fonts/(.*)",
    "headers": [{ "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }]
  }]
}
```

Post-deploy: verify `theme-color: #0B0B0C` and `viewport-fit=cover` in the rendered head, confirm the manifest and maskable icons, add the Checkly synthetics on `/` and `/brief` at a 5-minute interval, enable Vercel Speed Insights, and submit the sitemap.

---

## Milestones and exit criteria

| # | Milestone | Week | Exit criteria |
|---|---|---|---|
| M1 | Spike approved | 2 | Audio-reactive displacement ≥ 55 fps M1, ≥ 30 fps Pixel 6a; fallback documented; price bands signed |
| M2 | Design system frozen | 4 | Tokens exported to `@theme`; contrast audit passed; type scale validated at 375px and 2560px |
| M3 | Navigation approved | 6 | Mixing desk usable by keyboard end-to-end; transport bar doubling as scroll progress validated with 5 testers |
| M4 | Canvas persistence proven | 8 | Zero WebGL context recreations across all route transitions, verified in devtools |
| M5 | Feature complete | 11 | All 9 routes rendering real content; all Must-have PRD features shipped; forms delivering to Resend and Slack |
| M6 | Performance gate | 12 | LCP ≤ 2.5s p75 mobile, INP ≤ 180ms, CLS ≤ 0.05, initial JS ≤ 210 KB gz |
| M7 | Accessibility gate | 13 | 0 serious/critical axe issues; NVDA + VoiceOver passes signed off; reduced-motion reviewed as a design |
| M8 | Launch | 14 | Synthetics green 48h; Sentry error rate < 0.3%; analytics events firing; sitemap submitted |

---

## Risks and mitigations

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R1 | Audio autoplay blocked; users never hear the reel | High | High | Explicit consent gate as a designed moment; baked FFT envelope keeps the sculpture alive without audio; full sound-off content parity designed in week 9 |
| R2 | Three.js chunk lands in the LCP path | High | High | `next/dynamic` with `ssr: false`; AVIF poster carries LCP; CI bundle-size gate at 210 KB gz |
| R3 | Low-end devices below 30 fps | High | Medium | Three render profiles from a pre-mount capability probe; automatic step-down below 45 fps rolling mean; pre-rendered VP9 fallback |
| R4 | RAF contention between Lenis, GSAP and R3F | Medium | High | Single ticker hierarchy: Lenis drives, GSAP ticker is the only RAF, R3F subscribes. Documented in the repo README |
| R5 | Mixing-desk navigation confuses first-time users | Medium | High | Transport bar always visible as an anchor; channel labels are plain section names; conventional links remain in the footer; validated with 5 testers at M3 |
| R6 | NDA blocks a flagship case study | Medium | Medium | Identified in week 2; two anonymised sector case studies held in reserve; content plan assumes 4 not 6 |
| R7 | Published price bands invite undercutting | Medium | Medium | Bands not fixed prices; IDENTITY highlighted to anchor mid; qualification via budget-band selector rather than a public quote |
| R8 | Pinned horizontal sections break on iOS Safari dynamic toolbar | Medium | Medium | `100dvh` units; `ScrollTrigger.refresh()` on `visualViewport` resize, debounced 150ms; manual iOS test in every release |
| R9 | Spam and unqualified briefs flood the inbox | Medium | Low | Turnstile + honeypot + KV rate limit (5 per 10 min per IP); budget band is a required field |
| R10 | 14-week timeline slips on content, not code | Medium | High | Content deadlines set 2 weeks ahead of build need; MDX in-repo so copy edits ship without a CMS dependency |
| R11 | Accessibility defects discovered late | Low | High | Kiri joins week 6, not week 12; axe-core gates every PR from the first merged route |
| R12 | Key-person dependency on Douglas for WebGL | Medium | High | Shader and profile logic documented with inline rationale; Sam pairs on the sculpture in weeks 9–10; no undocumented magic numbers |

---

## The thing they got right

Ines's rule survived in a modified form. Not *"nothing works with the sound off"* — that was ego. What shipped is better: **everything works with the sound off, and everything is better with it on.** The sculpture still moves, driven by a baked envelope. The case studies still read. The transport bar still tells you where you are.

But when a brand director puts headphones in and hears a payment confirmation tone bloom into a geometry they can watch deform in real time, they stop reading and start listening. That is the whole product. Fourteen weeks and eleven serious accessibility defects later, that is the thing that made it out of the room.
