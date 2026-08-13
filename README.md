# TIMBRE

**A marketing site where the interface is driven by sound.** A single WebGL
sculpture deforms in real time against live Web Audio FFT data, persists across
every route without the canvas ever remounting, and the navigation is a mixing
desk rather than a menu.

**Live:** not yet deployed — see [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

> **TIMBRE is a fictional studio.** It has no clients and has never delivered a
> project. The four case studies, their results, the names in the credits and
> the client wall are invented, and every sound on the site is synthesised by
> [scripts/generate-audio.mjs](scripts/generate-audio.mjs). The brand is made up
> so the engineering has something real to be measured against.

---

## What it does

- **Audio-reactive hero.** One `AudioContext`, one `AnalyserNode`
  (`fftSize: 2048`), three normalised frequency bands driving vertex
  displacement, emissive mix and palette in a GLSL shader.
- **One canvas, every route.** The `<Canvas>` is mounted once in the root layout
  and driven from a Zustand store rather than route props, so navigating from
  the homepage to a case study never rebuilds the WebGL context.
- **Mixing-desk navigation.** A bottom-sheet overlay with one channel strip per
  section, each with a live position meter and a draggable fader, fully
  keyboard-operable and focus-trapped.
- **Consent-gated audio with full sound-off parity.** Nothing plays before an
  explicit gesture. Decline, and the sculpture keeps moving from a baked FFT
  envelope committed as a 3 KB JSON — the visual thesis survives silence.
- **Three render profiles from a capability probe**, chosen before the canvas
  mounts, with automatic step-down when the rolling frame rate drops.
- **Reduced motion as a designed path**, not a stripped one: Lenis never
  constructs, scrubs become discrete states, the sculpture composes to a fixed
  pose, and every route still renders its content.
- **A brief form** with per-step validation, draft persistence, rate limiting,
  honeypot, Turnstile verification and transactional delivery.

## Architecture

The four decisions that shaped everything else.

**One RAF loop, and a written hierarchy.** Lenis, GSAP ScrollTrigger and
react-three-fiber each want to own `requestAnimationFrame`. Running all three
produced scroll jitter that no individual component was responsible for. The fix
was a rule rather than a patch: **Lenis drives, the GSAP ticker is the only RAF
loop, R3F subscribes to it**, with `lagSmoothing(0)` so a dropped frame never
desynchronises scrub position from scroll position.

**The canvas is state, not markup.** Mounted once in `app/layout.tsx` via
`next/dynamic` with `ssr: false`, and everything about it — active case study,
render profile, whether anything is audible — lives in a Zustand store. Route
transitions become a wipe over a continuously rendering scene.

**The audio graph is a singleton with a real mixer.** Master gain, analyser,
per-source gains, and a ducking helper that counts nesting depth so two
overlapping players cannot un-duck each other early.

**Content is typed where it is structured and MDX where it is prose.** Case
studies are a filled-in template — sector, package, an asset inventory with
loudness and formats, three context players, metrics, credits — so they are
TypeScript, checked at build time, and the index can filter and count without
parsing anything. The journal is genuinely prose, so it is MDX.

```
src/
  app/            routes · api/brief · sitemap, robots, opengraph-image
  components/
    webgl/        SceneMount → SceneRoot → SoundSculpture (shader)
    transport/    SiteControls, MixingDesk, RouteWipe
    brief/        BriefForm, TurnstileWidget
    chrome/       SiteFooter
  lib/
    audio/        AudioEngine, analyser bands, consent, baked envelope
    webgl/        capability probe, profiles, shader tuning constants
    brief/        schema, delivery adapters, rate limiters, storage
    security/     CSP builder
  content/        case studies (typed), clients
content/
  en/ui.json      all UI copy, externalised (NFR-15)
  journal/        MDX posts
```

## Tech stack, and why

| Choice | Reasoning | Rejected |
|---|---|---|
| **Next.js 16 App Router** | Case-study copy must be in the initial HTML for SEO while the hero stays client-only. Server components give both without a second rendering strategy. | Vite SPA — would have put every indexable word behind hydration |
| **react-three-fiber** | The sculpture's state is React state (active case, profile, audio bands). Reconciling it declaratively beats hand-syncing an imperative scene graph. | Raw three.js — more control, but the store would need mirroring by hand |
| **GSAP + ScrollTrigger** | `containerAnimation` drives triggers *inside* a horizontally-pinned rail. No CSS-only or IntersectionObserver approach does this. | Framer Motion — excellent for components, no equivalent scrub model |
| **Zustand** | The canvas is outside the route tree, so context would mean lifting providers above the layout. A store is simply the right shape. | Context — provider gymnastics for a global singleton |
| **Zod, shared client and server** | One schema gates step advancement *and* validates the endpoint, so the two cannot drift and accept different payloads. | Separate validators — the usual way a form accepts what the server rejects |
| **`fetch` over Resend/Upstash/Turnstile SDKs** | Each is one endpoint, a bearer token and a JSON body. Three fewer dependencies to audit and update for no capability. | The official SDKs |
| **Docker for everything** | Nothing is installed on the host and CI runs the same image, so "works on my machine" cannot diverge from "works in CI". | Local Node + nvm |

## Running it

Everything runs in Docker. Node is not installed on the host and does not need
to be.

```bash
docker compose run --rm cli "npm install" && docker compose up web
```

The dev server is then on <http://localhost:3000>. The install is only needed on
a clean clone — `node_modules` lives in a named volume, not on the bind mount.

| Task | Command |
|---|---|
| Dev server | `docker compose up web` |
| Full static gate | `docker compose run --rm cli "npm run verify"` |
| Unit tests | `docker compose run --rm cli "npm test"` |
| End-to-end | `docker compose --profile tools up -d web-prod` then `docker compose run --rm e2e "npx playwright test"` |
| Stop everything | `docker compose --profile tools down` |

Copy [.env.example](.env.example) to `.env.local` if you want the integrations.
Every one of them degrades to a working local stub when its key is absent, so
development works with the file untouched.

### Why the container is shaped the way it is

Three decisions look odd without the reasoning, and all three were measured.

**`node_modules` lives in a named volume.** The source is bind-mounted from
Windows into the WSL2 VM, and every file operation on that mount crosses the VM
boundary. `.next` deliberately stays on the bind mount, because Turbopack splits
its state between `.next` and `.next-internal` and separating them breaks
recompilation.

**`npm run dev` passes `--webpack`.** inotify events do not survive the
Windows-to-Linux mount boundary. Turbopack's watcher did not fire even with
polling configured; webpack's polling watcher does. Builds still use Turbopack,
which is unaffected because it does not watch.

**`NODE_ENV` is not set in the image.** The Next CLI derives it per command, and
pinning it to `development` leaks into `next build`, where the prerender of
`/_global-error` fails with a null React dispatcher.

## Testing

```bash
docker compose run --rm cli "npm run verify"
```

Chains lint, typecheck, a guard that no text uses the sub-3:1 ink token, **326
unit tests**, the production build, and a bundle-size gate that fails the build
if initial JS exceeds its budget.

**194 end-to-end tests** run across Chromium, WebKit and a dedicated
reduced-motion project, including axe-core on every route with zero
serious/critical violations.

What is tested is what has actually broken here, or what is invisible when
wrong: the contrast ratios in the design spec (asserted against the shipped
palette, so the table and the code cannot drift); the shader tuning constants
(which put signal yellow across 14.6% of the viewport against a 4% cap before
they were recalibrated); the CSP in all eight of its configurations; the audio
band maths; and reduced-motion parity route by route.

WebGL inside a container is software-rendered, which the capability probe
correctly rejects — so containerised runs always exercise the fallback path and
can never test the real hero. Frame-rate targets have to be measured on the
host, against the containerised dev server.

## Measured, not estimated

| | Result | Budget |
|---|---|---|
| Initial client JS | 129.3 KB gz | 210 KB |
| three.js chunk, lazy | 234.6 KB gz | 340 KB |
| Fonts downloaded | 165.9 KB | 96 KB — **missed**, documented in the design spec |
| Signal-colour viewport coverage | ≤ 3.85% at peak | 4% |
| Sculpture GPU cost, 1280×720 | ~2.0 ms of a 16.67 ms frame | — |

The font budget is the one miss. It assumed licensed static faces hand-subset to
Latin; the free stand-ins are variable fonts carrying their whole design space.
It is stated rather than quietly dropped.

## What I would do next

1. **Deploy it.** The runbook is written; it needs accounts.
2. **Core Web Vitals and Lighthouse against real field data.** Never measured —
   a persistent canvas and a 235 KB three.js chunk is exactly the shape that
   misses LCP or INP, and I would rather find out than assume.
3. **Mobile GPUs.** The ≥ 30 fps half of the frame-rate target rests on them and
   cannot be checked in a container.
4. **The pre-rendered fallback video.** The no-WebGL path is currently an honest
   CSS composition rather than the specified 8-second loop.
5. **Screen-reader passes.** axe and the WCAG patterns are construction, not
   verification; NVDA and VoiceOver are manual and have not been done.
6. **The `[locale]` route segment.** Copy is externalised and hreflang is
   emitted; the segment itself is ceremony until a second language exists.

## Specification

Self-authored, in [docs/](docs/) — [01-PRD.md](docs/01-PRD.md),
[02-UIUX-Design-Spec.md](docs/02-UIUX-Design-Spec.md) and
[03-Roadmap-and-Plan.md](docs/03-Roadmap-and-Plan.md). Each carries a note on
what in it is invented and what is measured, and the design spec carries the
revision notes recording where its first draft was wrong — the contrast table,
the shader constants, the geometry density, and a `ScrollTrigger.scrollerProxy`
that was actively harmful. Those notes are the useful part.

The working agreement for coding agents is [AGENTS.md](AGENTS.md).

## Licence

Apache 2.0 — see [LICENSE](LICENSE).
