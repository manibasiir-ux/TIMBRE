# TIMBRE — Product Requirements Document

**Project code:** 01-TIMBRE
**Product type:** Marketing + portfolio site for a B2B sonic identity studio
**Stack:** Next.js (App Router, React 19) · Tailwind CSS v4 · GSAP + ScrollTrigger · Three.js via react-three-fiber + drei · Lenis · Vercel
**Document owner:** Product / Creative Direction
**Status:** v1.0 — approved for design

---

## 1. Product vision

TIMBRE is a sonic identity studio. The website is not a brochure — it is the studio's primary instrument of proof. Sound cannot be screenshotted, and every competitor's site fails at the same point: they describe audio work in silent paragraphs and bury the actual sound behind a SoundCloud embed nobody presses.

The vision is a site where **sound is the interface**. A visitor lands, the showreel begins on consented playback, and a WebGL sound sculpture in the hero deforms in real time against live FFT data from that audio. Scrolling does not scroll a page — it scrubs a timeline. The navigation is not a menu — it is a mixing desk, with horizontal channel strips standing in for sections and a master transport bar pinned to the bottom of the viewport that doubles as scroll progress.

The strategic goal: convert a CMO who arrived from a LinkedIn post into a qualified brief within a single 4-minute session. The site must make a brand director *feel* what a sonic identity does to a product before they have read a case study paragraph.

## 2. The problem it solves

**For the market:** Sonic branding has high perceived value and near-zero buyer literacy. Brand directors know they want "our own Netflix ta-dum" but cannot articulate scope, deliverables, timeline or price. They over-anchor on the audio logo and underestimate the system work (UI sound, soundscapes, voice direction, guidelines) that carries 70% of the value.

**For TIMBRE:** The studio converts through personal network and conference talks. Inbound is thin and unqualified. Discovery calls burn 45 minutes on education a well-built site should have handled. Deal cycles run 11 weeks from first contact to signature.

**What the site fixes:**

1. **The audibility gap** — every case study plays its own sonic system in context (in-product, in-store, in-vehicle), so value is demonstrated, not asserted.
2. **The scope gap** — three named packages with published price bands so buyers self-qualify before the call.
3. **The credibility gap** — a Process page that reads like an engineering document, proving TIMBRE is a systems studio, not a jingle shop.
4. **The memory gap** — an experience distinctive enough that a brand director remembers the studio six weeks later when budget unlocks.

## 3. Target users

**Primary buyer:** Brand Director / VP Brand at a consumer company of 200–5,000 employees, budget authority £40k–£400k, mid-rebrand or pre-launch.
**Primary influencer:** Head of Product Design / Design Systems Lead at a fintech or EV company who owns the UI sound layer and needs a partner who speaks in tokens, not bars.
**Economic buyer:** CMO — signs, cares about brand recall and CFO-legible ROI.
**Sectors:** fintech apps, EV manufacturers, hospitality groups, CPG, airlines.

### Persona 1 — Marguerite Okonjo-Bell

- **Age:** 41
- **Role:** VP Brand
- **Company:** Halcyon Mobility — European EV manufacturer, 2,400 staff, launching its second-generation vehicle platform in 14 months.
- **Goals:** Own the door-close chime, the start-up sound and the charging-complete tone as trademarked assets. Deliver a sonic identity that survives regulatory acoustic requirements (AVAS). Present a coherent sound story to the board in Q3.
- **Frustrations:** Her acoustics engineering team treats sound as a compliance problem. Three agencies pitched her "an audio logo" for £180k with no explanation of what happens after delivery. She cannot play a WAV file in a board deck and have it land.
- **Quote:** *"I don't need a jingle. I need a system my engineers can implement and my lawyers can register — and I need to hear what that actually sounds like inside a car, not in a studio."*
- **What the site must do for her:** Give her an in-context case study with contextual playback (cabin, exterior, app). Publish the guidelines deliverable explicitly. Make the Identity and System packages and their price bands legible in under 90 seconds. Provide a shareable case-study URL with a timestamped audio anchor she can drop into Slack.

### Persona 2 — Tobias Renner

- **Age:** 34
- **Role:** Head of Product Design
- **Company:** Kestrel — UK neobank, 3.1m users, redesigning its payments flow.
- **Goals:** Add haptic-synced UI sound to payment confirmation, card freeze and biometric auth. Ship it as versioned tokens inside the existing design system. Prove sound reduces confirmation-anxiety support tickets.
- **Frustrations:** Sound design vendors deliver a ZIP of 40 unlabelled WAVs. No naming convention, no loudness normalisation, no dark-pattern review, no handoff for iOS/Android/web. He has been burned twice.
- **Quote:** *"Send me the file tree. If I can't see how the assets are named and versioned, I already know how this project ends."*
- **What the site must do for him:** A Process page with the actual delivery manifest — file naming, LUFS targets, format matrix, Figma/Storybook handoff. A UI sound case study he can trigger interaction-by-interaction. A brief form that lets him skip the marketing and reach a technical scoping call.

### Persona 3 — Priya Raghunathan

- **Age:** 47
- **Role:** Chief Marketing Officer
- **Company:** Solene Group — hospitality group, 31 properties across Southern Europe.
- **Goals:** Unify the guest experience across properties with a soundscape strategy — lobby, spa, restaurant, in-room — plus a brand voice for the app and IVR. Justify the spend against RevPAR and guest satisfaction scores.
- **Frustrations:** Each property GM picks their own playlist. Her previous "sonic branding" purchase was a Spotify playlist with a licence attached. She needs governance, not curation.
- **Quote:** *"Thirty-one properties, thirty-one playlists, one brand. Tell me how you fix that and how you keep it fixed after you leave."*
- **What the site must do for her:** Foreground the sonic-guardianship retainer as a distinct, priced product. Show a multi-site soundscape case study with a governance model. Present licensing terms plainly. Offer a direct route to a strategy conversation without a form gauntlet.

## 4. The service and business model

### 4.1 Packages

| Package | Scope | Duration | Price band (GBP) | Typical buyer |
|---|---|---|---|---|
| **MNEMONIC** | Audio logo / sonic mnemonic. 3 territories explored, 1 developed, 6 adaptations (short/long/percussive/orchestral/solo-voice/UI stub). Trademark-ready stems. 12-page mini-guideline. | 6–8 weeks | £45,000 – £75,000 | Challenger brands, single-product companies, rebrand add-on |
| **IDENTITY** | Mnemonic + UI/product sound set (20–40 assets) + brand voice casting direction + 40-page sonic identity guidelines + implementation support. | 12–16 weeks | £110,000 – £180,000 | Fintech, CPG, EV — the core offer |
| **SYSTEM** | Identity + retail/hospitality soundscape architecture + synthetic voice direction and model supervision + multi-territory adaptation + measurement framework + 12-month embed. | 20–30 weeks | £220,000 – £450,000 | Airlines, hospitality groups, multi-property or multi-market clients |

### 4.2 Retainer and licensing

- **Sonic Guardianship Retainer** — £4,500 – £12,000 / month, 12-month minimum. Covers quarterly audits, new-asset production (fair-use pool of 6 assets/quarter), agency and vendor briefing, sound-check on all new product surfaces, annual guidelines revision. Attach rate target: 55% of IDENTITY and SYSTEM clients.
- **Asset licensing** — TIMBRE delivers full assignment of copyright on all bespoke composition as standard. Third-party performance (session musicians, voice talent) is licensed separately: buyout £3,000–£25,000 per performer depending on territory and term. Synthetic voice models carry an annual model-hosting and refresh licence at £18,000/year.

### 4.3 Revenue mix (target, year 2)

| Stream | Share of revenue | Notes |
|---|---|---|
| Project fees (Mnemonic/Identity/System) | 62% | Lumpy, pitch-driven |
| Guardianship retainers | 26% | Predictable base, funds fixed costs |
| Licensing & model hosting | 7% | High margin, low effort |
| Workshops, audits, expert witness | 5% | Top-of-funnel and credibility |

### 4.4 Unit economics (IDENTITY package, midpoint £145,000)

| Line | Value |
|---|---|
| Revenue | £145,000 |
| Creative direction (0.35 FTE × 14 wks) | £22,000 |
| Composition & sound design (1.4 FTE × 14 wks) | £41,000 |
| Session performance, voice talent, studio hire | £16,000 |
| Strategy, research, guideline authoring | £13,000 |
| Project management | £8,500 |
| **Gross margin** | **£44,500 (30.7%)** |
| Blended day rate implied | £1,180 |
| Target utilisation | 68% |
| CAC (blended, inbound-weighted) | £9,400 |
| LTV with 55% retainer attach @ 22 months | £268,000 |
| **LTV:CAC** | **28:1** |

The site's job in this model is to move inbound share from 20% to 45% of pipeline, dropping blended CAC below £6,500.

## 5. Core features — MoSCoW

| Priority | Feature | Rationale |
|---|---|---|
| **Must** | Audio-reactive WebGL hero (icosahedron / GPU point cloud driven by Web Audio FFT) | The single differentiating moment; proves the studio's thesis |
| **Must** | Mixing-desk navigation with channel strips + persistent master transport bar | The experimental navigation; also the scroll-progress system |
| **Must** | Global audio engine with consent gate, master mute, and per-section ducking | Legal + UX requirement for any autoplay |
| **Must** | Work index + case study detail template with in-context audio players | Core conversion asset |
| **Must** | Services page with the three packages and published price bands | Self-qualification |
| **Must** | Brief Us multi-step form with budget band, timeline, service line, file upload | The conversion endpoint |
| **Must** | WebGL capability detection with static/video fallback | 8–11% of B2B traffic cannot run the hero |
| **Must** | `prefers-reduced-motion` and audio-off full-content parity | WCAG 2.2 AA + legal |
| **Should** | Per-case-study geometry, material and palette morph on the hero sculpture | High-impact, cost-contained |
| **Should** | Process page with delivery manifest and file-tree component | Wins Tobias-type buyers |
| **Should** | Journal (MDX) with audio-embed component | SEO and thought leadership |
| **Should** | Studio page with team grid and per-person "signature sound" hover | Personality, differentiation |
| **Should** | Shareable case-study deep links with `?t=` audio timestamp anchors | Enables internal advocacy |
| **Could** | VU-meter cursor that responds to live output level | Delight, low utility |
| **Could** | "Sonic Palette" interactive toy — build a 4-note mnemonic and email it | Viral top-of-funnel |
| **Could** | Case study A/B "before / after sound" toggle with crossfade | Powerful, but content-expensive |
| **Could** | Multi-language (EN/ES/DE) | Only after EU pipeline justifies |
| **Won't (v1)** | Client portal / asset delivery system | Separate product; Notion + Frame.io suffices |
| **Won't (v1)** | E-commerce for stock sonic assets | Dilutes the bespoke positioning |
| **Won't (v1)** | Live chat widget | Wrong register for a £150k considered purchase |
| **Won't (v1)** | User accounts or gated content | Friction with no proven return |

## 6. User flows

### Flow A — First visit, sound-on discovery (happy path)

1. User lands on `/` from LinkedIn. Preloader shows a rising sine sweep as a waveform progress bar; assets and the first WebGL frame warm behind it.
2. At 100%, an **audio consent gate** appears: "PLAY THE ROOM" / "STAY SILENT", plus a note that all content is available without sound.
3. User selects PLAY. `AudioContext` resumes (satisfying autoplay policy), the showreel bed starts at −18 LUFS, the analyser connects, and the hero icosahedron begins displacing against the FFT bins.
4. Master transport bar animates up from the bottom edge: play/pause, elapsed/total, scrub track, channel-strip toggle.
5. User scrolls. Lenis smooths; ScrollTrigger scrubs the hero camera dolly and rotates the sculpture. The Manifesto types in per line.
6. Entering the Work rail, the sculpture morphs — geometry, shader material and accent palette shift per case study; the bed crossfades to that project's stem over 1.2s.
7. User clicks a case study. The route transition holds the sculpture (shared canvas, no unmount); the layout dissolves around it.
8. On the detail page the user triggers contextual players (in-product / in-store / in-vehicle). The global bed ducks −12 dB automatically.
9. User hits the end-of-case CTA → `/brief`.
10. Brief form, 4 steps. Submit → confirmation state, autoresponder within 60 seconds, Slack alert to the studio.

### Flow B — Mixing-desk navigation

1. User clicks the channel-strip toggle on the transport bar (or presses `M`).
2. The overlay expands from the bottom: seven horizontal channel strips, one per section (HOME · WORK · SERVICES · STUDIO · PROCESS · JOURNAL · BRIEF).
3. Each strip carries a label, a live mini-VU showing that section's relative scroll position, and a fader.
4. Dragging a fader scrubs *within* that section's content; releasing snaps and navigates.
5. Clicking a channel label navigates directly with a 0.9s transition.
6. `Esc`, an outside click, or `M` collapses the desk, returning focus to the trigger.

### Flow C — Brief Us submission

1. Step 1 — Who: name, company, role, email (validated on blur).
2. Step 2 — What: multi-select of the six service lines; free text "what's the moment?" (280 char).
3. Step 3 — Scale: budget band radio (Under £50k / £50–110k / £110–220k / £220k+ / Not yet defined), target date, optional upload (max 25 MB, PDF/ZIP).
4. Step 4 — Review and send. Honeypot + Turnstile verification runs invisibly.
5. Success: the transport bar plays a bespoke 1.4s confirmation mnemonic; reference code `TMB-YYMMDD-XXX` is displayed and emailed.

### Edge cases and failure states

| # | Condition | Behaviour |
|---|---|---|
| E1 | WebGL unavailable or `WEBGL_debug_renderer_info` reports software rasteriser | Replace canvas with a pre-rendered 8s H.265/VP9 loop (poster fallback for `<img>`); all copy and layout identical |
| E2 | `AudioContext` blocked or consent declined | Sculpture drives from a baked FFT envelope JSON (60 fps, 8 KB gzipped) so motion persists; all players show captions and waveform stills |
| E3 | `prefers-reduced-motion: reduce` | Lenis disabled, ScrollTrigger scrub replaced with discrete `toggleActions`, sculpture renders static at 30 fps with no camera motion, all durations ≤ 0.2s |
| E4 | Device memory < 4 GB or `hardwareConcurrency` ≤ 4 | Particle count drops 120k → 24k, DPR capped at 1, post-processing disabled |
| E5 | Sustained frame rate < 45 fps over a 3s window | Automatic step-down to the E4 profile; logged as an analytics event |
| E6 | Audio stem fetch fails (network) | Silent retry ×2 with exponential backoff; then transport shows "STEM UNAVAILABLE", page continues |
| E7 | Brief form submit fails | Payload persisted to `localStorage`, inline error with a retry button and a `mailto:` escape hatch |
| E8 | User navigates away mid-transition | GSAP timelines killed via `ctx.revert()` in the route cleanup; canvas persists at root layout |
| E9 | Tab backgrounded | `document.visibilitychange` pauses the render loop and suspends the `AudioContext` |
| E10 | Slow 3G (effective type `2g`/`slow-2g`) | Hero degrades to fallback video; stems load only on explicit play |

## 7. Page-by-page breakdown

### `/` Home
**Purpose:** Convert curiosity into conviction in 60 seconds.
**Blocks:** Preloader + consent gate · WebGL hero with the display lockup ("WE MAKE / BRANDS / AUDIBLE") · Manifesto (3 lines, scroll-typed) · Work rail (4 featured, horizontal-scrubbed) · Service lines ticker · Selected clients wall · Journal teaser (2) · Brief CTA slab.
**Entry:** Direct, LinkedIn, referral, search.
**Exit:** Case study detail (primary), `/services`, `/brief`.

### `/work` Work index
**Purpose:** Prove range and depth across sectors.
**Blocks:** Filter row (sector / service line) as channel-strip buttons · Asymmetric project grid, 12 items, each with a hover-triggered 4s audio preview and animated waveform thumbnail · Sector counter · "Not seeing yours?" CTA.
**Entry:** Nav, home rail, search.
**Exit:** Case study detail, `/brief`.

### `/work/[slug]` Case study detail
**Purpose:** Full narrative proof.
**Blocks:** Hero (client, sector, package, year) · The brief · The insight · The system (asset inventory with a playable list) · In-context players (3 environments) · Guidelines spread gallery · Results with named metrics · Credits · Next project.
**Entry:** Work index, home rail, shared link with `?t=` anchor.
**Exit:** Next case study, `/brief`.

### `/services`
**Purpose:** Self-qualification and scope education.
**Blocks:** Six service lines as expandable channel strips · Package comparison table (Mnemonic/Identity/System with price bands) · Guardianship retainer panel · Licensing plain-English summary · FAQ (9 questions) · Brief CTA.
**Entry:** Nav, home ticker, pricing search queries.
**Exit:** `/brief`, `/process`.

### `/studio`
**Purpose:** Trust, personality, hiring.
**Blocks:** Studio statement · Team grid (9 people, each with a 2s signature sound on hover) · Room gallery (live room, mix suite, foley) · Kit list · Awards · Open roles.
**Entry:** Nav, case study credits.
**Exit:** `/process`, `/brief`, careers mail.

### `/process`
**Purpose:** Convert technical evaluators.
**Blocks:** Five phases (Listen · Territories · Development · System · Guardianship) as a scrubbed horizontal timeline · Delivery manifest (file-tree component, naming convention, LUFS/format matrix) · Handoff formats (Figma, Storybook, Unity, Wwise, FMOD) · Governance model · Typical timelines by package.
**Entry:** Services, case studies, direct share.
**Exit:** `/brief`, `/services`.

### `/journal` and `/journal/[slug]`
**Purpose:** SEO, category authority.
**Blocks:** Index — reverse-chronological list with reading time and an audio-essay flag. Post — MDX with a custom `<Listen>` embed, pull-quotes, waveform dividers, author card, related posts.
**Entry:** Search, newsletter, home teaser.
**Exit:** Related post, `/brief`, subscribe.

### `/brief` Brief Us
**Purpose:** The single conversion endpoint.
**Blocks:** 4-step form · "What happens next" 3-step timeline · Direct contacts (new business email, studio phone, address) · Response-time promise (2 working days).
**Entry:** Every page CTA, transport bar BRIEF channel.
**Exit:** Success state; secondary exits to `/work`.

### Supporting routes
`/privacy`, `/cookies`, `/accessibility`, `/404` (a "dead channel" state with noise-floor visual), `/sitemap.xml`, `/robots.txt`, `/opengraph-image`.

## 8. Functional requirements

- **FR-01** The system SHALL present an audio consent gate before any audio playback and persist the choice in `localStorage` under `timbre.audio.consent` for 180 days.
- **FR-02** The system SHALL expose a single global `AudioContext` with a master gain node, an analyser node (`fftSize: 2048`, `smoothingTimeConstant: 0.82`), and per-source gain nodes.
- **FR-03** The WebGL hero SHALL read the analyser's frequency data each frame and drive vertex displacement, emissive intensity and palette mix.
- **FR-04** The hero sculpture SHALL morph geometry, material and palette when a Work rail item enters the viewport, transitioning over 1.2s.
- **FR-05** The Three.js canvas SHALL be mounted once in the root layout and persist across all client-side route transitions.
- **FR-06** The master transport bar SHALL persist on all routes at all breakpoints and SHALL reflect document scroll progress on its scrub track.
- **FR-07** The transport bar SHALL provide play/pause, mute, elapsed/total time, a draggable scrubber, and the channel-desk toggle.
- **FR-08** The mixing-desk overlay SHALL render one channel strip per top-level section with a live position VU and a draggable fader.
- **FR-09** Fader drag SHALL scrub within the target section's content and, on release, navigate to the corresponding scroll position.
- **FR-10** The system SHALL detect WebGL2 support and GPU tier on first paint and select one of three render profiles (`high`, `medium`, `fallback`).
- **FR-11** The system SHALL monitor rolling frame rate and step down one profile when the 3s mean drops below 45 fps.
- **FR-12** Case study pages SHALL support contextual audio players with automatic −12 dB ducking of the global bed while active.
- **FR-13** Case study URLs SHALL accept a `?t=<seconds>` parameter that seeks the primary player and auto-scrolls to it.
- **FR-14** The Work index SHALL filter client-side by sector and service line without a route change, updating the URL via `history.replaceState`.
- **FR-15** The Brief form SHALL validate per-step, block advancement on invalid input, and preserve state across steps and reloads.
- **FR-16** The Brief form SHALL accept one file up to 25 MB (`application/pdf`, `application/zip`) uploaded to a signed Vercel Blob URL.
- **FR-17** Brief submissions SHALL be protected by Cloudflare Turnstile and a honeypot field, delivered by email via Resend, and mirrored to a Slack webhook.
- **FR-18** The system SHALL generate a reference code `TMB-YYMMDD-XXX` per submission and include it in the confirmation and autoresponder.
- **FR-19** Journal content SHALL be authored in MDX in-repo and statically generated with ISR at a 3600s revalidation interval.
- **FR-20** All pages SHALL emit per-route `generateMetadata` with OpenGraph and Twitter card images generated at the edge via `next/og`.
- **FR-21** The system SHALL respect `prefers-reduced-motion: reduce` by disabling Lenis, scrub-linked animation and camera motion.
- **FR-22** A visible global "SOUND OFF" control SHALL be reachable within one interaction from any scroll position.
- **FR-23** Every audio asset SHALL have an associated transcript or descriptive caption exposed in the DOM.
- **FR-24** The 404 route SHALL render a themed "dead channel" state with primary navigation intact.

## 9. Non-functional requirements

- **NFR-01 — LCP:** ≤ 2.0s on desktop cable, ≤ 2.5s on Moto G Power / 4G, p75.
- **NFR-02 — INP:** ≤ 180ms p75 across all routes, including with the canvas active.
- **NFR-03 — CLS:** ≤ 0.05 p75. The transport bar reserves its 64px band from first paint.
- **NFR-04 — TTFB:** ≤ 400ms p75 from Vercel edge.
- **NFR-05 — Bundle:** initial client JS ≤ 210 KB gzipped excluding the Three.js chunk; the Three.js + R3F chunk (≤ 340 KB gzipped) loads lazily after first paint and is excluded from LCP path.
- **NFR-06 — Frame rate:** ≥ 55 fps on Apple M1 / RTX 3060 at 1440p; ≥ 30 fps on iPhone 12 and Pixel 6a.
- **NFR-07 — WebGL detection:** a probe runs before canvas mount, checking WebGL2 context creation, `MAX_TEXTURE_SIZE ≥ 4096`, `deviceMemory`, `hardwareConcurrency` and the unmasked renderer string against a software-rasteriser denylist. Result selects a render profile, cached in `sessionStorage`.
- **NFR-08 — Fallback:** the `fallback` profile serves an 8s pre-rendered loop (VP9 1.1 MB / H.265 0.9 MB) with an AVIF poster; additional weight ≤ 1.3 MB.
- **NFR-09 — Browser matrix:** full experience on Chrome/Edge ≥ 118, Safari ≥ 17, Firefox ≥ 121, iOS Safari ≥ 17, Chrome Android ≥ 118. Degraded but fully functional on Safari 15–16, Firefox 115–120, and any browser without WebGL2. Unsupported: IE, Chrome < 100.
- **NFR-10 — Device matrix:** tested on iPhone SE 3 (375px), iPhone 15 Pro, Pixel 6a, iPad Air, MacBook Air M1 (1440px), 27" 2560px and a 3440px ultrawide.
- **NFR-11 — SEO:** server-rendered HTML for all indexable content including case study copy; `Organization`, `Service`, `Article` and `BreadcrumbList` JSON-LD; canonical URLs; XML sitemap regenerated on build; Lighthouse SEO 100.
- **NFR-12 — Security:** strict CSP with per-request nonces (`script-src 'self' 'nonce-…' 'strict-dynamic'`), `frame-ancestors 'none'`, HSTS 2 years with preload, `Permissions-Policy: microphone=(), camera=(), geolocation=()`. Form endpoints rate-limited to 5 requests / 10 min / IP via Vercel KV.
- **NFR-13 — Privacy/GDPR:** no cookies before consent; analytics cookieless by default. Brief submissions stored 24 months then purged; documented DSAR route at `privacy@timbre.studio` with a 30-day SLA. Data processed in the EU (Vercel `fra1`, Resend EU region). DPA on request. Cookie banner appears only on opt-in to enhanced analytics.
- **NFR-14 — Analytics:** Vercel Web Analytics + Speed Insights, plus self-hosted Plausible for events: `audio_consent_granted`, `audio_consent_declined`, `reel_played_30s`, `case_study_audio_play`, `desk_opened`, `fader_dragged`, `pricing_viewed`, `brief_step_completed`, `brief_submitted`, `webgl_profile_selected`, `perf_stepdown`.
- **NFR-15 — i18n readiness:** copy externalised to `/content/[locale]/*.json`; a `[locale]` App Router segment defaulting to `en` and rewritten away for the default; `hreflang` emitted; no hardcoded strings; type scale validated against German string lengths (+35%).
- **NFR-16 — Accessibility:** WCAG 2.2 AA. Full keyboard operation of transport bar and mixing desk. Canvas `aria-hidden` with an adjacent visually-hidden text equivalent.
- **NFR-17 — Observability:** Vercel + Sentry (errors, 10% performance traces), Checkly synthetics on `/` and `/brief` every 5 minutes, 99.9% monthly availability.
- **NFR-18 — Content ops:** case studies and journal posts as MDX in-repo, previewable via Vercel preview deploys; a non-developer can publish via a GitHub web-editor commit.

## 10. Success metrics

### North star
**Qualified briefs per month** — a brief submission with a stated budget of £50k+ and a defined timeline. **Target: 9/month by month 6 post-launch** (baseline: 2.4/month).

### Primary

| Metric | Target |
|---|---|
| Brief submission rate (all sessions) | ≥ 2.8% |
| Inbound share of closed-won pipeline | ≥ 45% by month 12 (from 20%) |
| Audio consent grant rate | ≥ 62% |
| Median session duration, consented sessions | ≥ 3m 40s |
| Case study completion (scroll ≥ 90%) | ≥ 41% |
| Sales cycle, first contact → signature | ≤ 8 weeks (from 11) |

### Secondary

| Metric | Target |
|---|---|
| Pricing section view rate | ≥ 55% of sessions |
| Mixing desk open rate | ≥ 28% of sessions |
| Case study audio play rate | ≥ 70% of case study viewers |
| Journal → brief assisted conversions | ≥ 12/quarter |
| Organic sessions | +140% by month 9 |
| Shared case-study deep links (`?t=`) | ≥ 150/quarter |
| Retainer attach rate on new IDENTITY/SYSTEM wins | ≥ 55% |

### Guardrail

| Metric | Threshold |
|---|---|
| Bounce rate | ≤ 38% (alert above) |
| Mobile Lighthouse Performance | ≥ 82 |
| INP p75 | ≤ 180ms |
| Reduced-motion sessions reaching `/brief` | within 15% of the site average — proves parity |
| Sound-off sessions completing a case study | within 20% of sound-on |
| Accessibility defects (axe-core, serious/critical) | 0 in CI |
| Perf step-down events (`perf_stepdown`) | ≤ 6% of WebGL sessions |
| Unqualified briefs (< £50k or spam) | ≤ 35% of total submissions |
