# TIMBRE

**A marketing site where the interface is driven by sound.** A single WebGL
sculpture deforms in real time against live Web Audio analysis, persists across
every route without the canvas ever remounting, and the navigation is a mixing
desk whose faders ride real gain nodes.

**Live:** <https://timbre-liard.vercel.app>

> **TIMBRE is a fictional studio.** It has no clients and has never delivered a
> project. The four case studies, their results, the names in the credits and
> the client wall are invented, and every sound on the site is synthesised by
> [scripts/generate-audio.mjs](scripts/generate-audio.mjs). The brand is made up
> so the engineering has something real to be measured against.

---

![The TIMBRE homepage: the words "We make Brands Audible" set in enormous type over a dark studio-grey ground, with an audio-reactive WebGL sculpture glowing acid yellow behind them.](docs/screenshots/01-hero.jpg)

## What it does

- **Audio-reactive hero.** One `AudioContext`, one `AnalyserNode`
  (`fftSize: 2048`), three normalised frequency bands driving vertex
  displacement, emissive mix and palette in a GLSL shader.
- **One canvas, every route.** The canvas mounts once in the root layout and is
  driven from a Zustand store rather than route props, so navigating never
  rebuilds the WebGL context.
- **A mixing desk that mixes.** Five channels — the room and four client stems —
  with faders writing real gain values. Because the analyser sits *after* the
  master gain, the sculpture reshapes itself against whatever mix you build.

- **Per-destination route transitions.** One motion grammar, four dialects: case
  studies sweep in their own accent colour, Services in six blades for six
  service lines, Brief in four for four form steps, and going back always
  travels the opposite way to going forward.
- **Consent-gated audio with full sound-off parity.** Nothing plays before an
  explicit gesture. Decline, and the sculpture keeps moving from a baked FFT
  envelope committed as a 3 KB JSON.
- **Three render profiles** chosen by a capability probe before the canvas
  mounts, with automatic step-down when the rolling frame rate drops.
- **Reduced motion as a designed path**, not a stripped one: Lenis never
  constructs, scrubs become discrete states, the sculpture composes to a fixed
  pose, every route still renders its content.
- **A brief form** with per-step validation, draft persistence, rate limiting,
  honeypot, Cloudflare Turnstile verification and delivery via Resend.

![The mixing desk open over the site: five horizontal channel strips labelled Room, Kestrel, Halcyon, Solene and Aviation, each with a six-segment meter, a fader and a numeric level, sitting above a row of section links.](docs/screenshots/02-desk.jpg)

*The desk, mid-mix. Every fader writes a real gain node, and the analyser sits
after the master gain — so the sculpture behind it is reacting to whatever you
just built.*

<p>
  <img src="docs/screenshots/04-brief.jpg" width="66%" alt="Step two of the four-step brief form, showing a segmented progress bar, service-line toggles and the question 'What do you want to make audible?'" />
  <img src="docs/screenshots/05-mobile.jpg" width="24%" align="top" alt="The manifesto at a narrow mobile width, three statements set in large type." />
</p>

## Architecture

The decisions that shaped everything else.

**One RAF loop, and a written hierarchy.** Lenis, GSAP ScrollTrigger and
react-three-fiber each want to own `requestAnimationFrame`. Running all three
produced scroll jitter that no single component was responsible for. The fix was
a rule rather than a patch: **Lenis drives, the GSAP ticker is the only RAF
loop, R3F subscribes to it**, with `lagSmoothing(0)` so a dropped frame never
desynchronises scrub position from scroll position.

**The canvas is state, not markup.** Mounted once via `next/dynamic` with
`ssr: false`; active case, render profile and audibility live in a store. Route
transitions become a wipe over a continuously rendering scene.

![The Kestrel case study: the client name set at display size, a mono spec block reading Sector Fintech, Package Identity, Year 2025, and the same sculpture rendered as a blue cube — the per-case identity carried through from the work rail.](docs/screenshots/03-case-study.jpg)

**The audio graph is a singleton with a real mixer.** Master gain, analyser,
per-source gains, and a ducking helper that counts nesting depth so two
overlapping players cannot un-duck each other early. Voices are named
independently of buffers, so the work rail can audition a stem while the desk
holds the same file as a channel.

**Content is typed where structured, MDX where prose.** Case studies are a
filled-in template — sector, package, asset inventory with loudness and formats,
metrics, credits — so they are TypeScript, checked at build time. The journal is
genuinely prose, so it is MDX.

```
src/
  app/            routes, api/brief, sitemap, robots, opengraph-image
  components/
    webgl/        SceneMount -> SceneRoot -> SoundSculpture (shader)
    transport/    MixingDesk, SiteControls, RouteWipe
    brief/        BriefForm, TurnstileWidget
    chrome/       HomeMark, SiteFooter
  lib/
    audio/        AudioEngine, mixer, analyser bands, consent, baked envelope
    motion/       route dialects, sculpture motion, reveals
    webgl/        capability probe, profiles, shader tuning, identities
    brief/        schema, delivery adapters, rate limiters, storage
    security/     CSP builder
content/
  en/ui.json      all UI copy, externalised
  journal/        MDX posts
```

## Tech stack, and why

| Choice | Reasoning | Rejected |
|---|---|---|
| **Next.js 16 App Router** | Case-study copy must be in the initial HTML for SEO while the hero stays client-only. Server components give both without a second rendering strategy. | Vite SPA, which puts every indexable word behind hydration |
| **react-three-fiber** | The sculpture's state *is* React state. Reconciling it declaratively beats hand-syncing an imperative scene graph. | Raw three.js: more control, more manual mirroring |
| **GSAP + ScrollTrigger** | `containerAnimation` drives triggers *inside* a horizontally-pinned rail. Nothing CSS-only does this. | Framer Motion, excellent for components but with no equivalent scrub model |
| **Zustand** | The canvas lives outside the route tree, so context would mean lifting providers above the layout. | React context |
| **Zod, shared client and server** | One schema gates step advancement *and* validates the endpoint, so the two cannot drift. | Separate validators, which is how forms come to accept what servers reject |
| **`fetch` over the Resend, Upstash and Turnstile SDKs** | Each is one endpoint, a bearer token and a JSON body. Three fewer dependencies to audit. | The official SDKs |
| **Docker for everything** | CI runs the same image as development, so "works on my machine" cannot diverge from "works in CI". | Local Node with nvm |

## Running it

Everything runs in Docker. Node is not installed on the host and does not need
to be.

```bash
docker compose run --rm cli "npm install" && docker compose up web
```

Then <http://localhost:3000>. The install is only needed on a clean clone —
`node_modules` lives in a named volume, not on the bind mount.

| Task | Command |
|---|---|
| Dev server | `docker compose up web` |
| Full static gate | `docker compose run --rm cli "npm run verify"` |
| Unit tests | `docker compose run --rm cli "npm test"` |
| End-to-end | `docker compose --profile tools up -d web-prod`, then `docker compose run --rm e2e "npx playwright test"` |
| Stop everything | `docker compose --profile tools down` |

Copy [.env.example](.env.example) to `.env.local` if you want the integrations.
**Every one degrades to a working local stub when its key is absent**, so
development works with the file untouched: the form still validates, rate-limits
and returns a reference code, and logs what it would have emailed.

### Why the container is shaped the way it is

**`node_modules` lives in a named volume.** The source is bind-mounted from
Windows into WSL2, and every file operation on that mount crosses the VM
boundary. `.next` deliberately stays on the bind mount, because Turbopack splits
its state between `.next` and `.next-internal` and separating them breaks
recompilation.

**`npm run dev` passes `--webpack`.** inotify events do not survive the
Windows-to-Linux mount boundary. Turbopack's watcher never fired even with
polling configured; webpack's does. Builds still use Turbopack, unaffected
because they do not watch.

**`NODE_ENV` is not set in the image.** The Next CLI derives it per command, and
pinning it leaks into `next build`, where the prerender of `/_global-error`
fails with a null React dispatcher.

## Testing

```bash
docker compose run --rm cli "npm run verify"
```

Chains lint, typecheck, a guard that no text uses the sub-3:1 ink token, **326
unit tests**, the production build, and a bundle-size gate that fails the build
if initial JS exceeds its budget.

**194 end-to-end tests** run across Chromium, WebKit and a dedicated
reduced-motion project, including axe-core on every route at zero
serious/critical violations.

What is tested is what has actually broken here, or what is invisible when
wrong: the contrast ratios from the design spec, asserted against the shipped
palette; the shader tuning constants, which put the accent colour across 14.6%
of the viewport against a 4% cap before recalibration; the CSP in all eight of
its configurations; the audio band maths; and reduced-motion parity route by
route.

A screen-reader pass was run by hand with **NVDA on Windows**, because
Accessibility 100 and zero axe violations are machine checks and a machine
cannot tell you whether an interface makes sense to someone who cannot see it.

It found one real defect. Pressing Continue on an invalid step set the field
errors, shook the form and announced **nothing** — every error was rendered and
correctly tied to its input with `aria-describedby`, which is only spoken when
that input takes focus, and focus stayed on the button. Sighted visitors saw red
text; a screen-reader user got silence. No automated check could have caught it,
because the markup was right and the behaviour was wrong. Fixed by announcing the
failure count in a live region and moving focus to the first failing field, then
re-tested by ear.

What passed unchanged: the consent gate, the skip link as first focusable
element, and — the one I expected to fail — route changes, which announce the
new heading rather than swapping content in silence.

WebGL inside a container is software-rendered, which the capability probe
correctly rejects — so containerised runs always exercise the fallback path and
never the real hero. Frame-rate targets have to be measured on the host.

## Measured, not estimated

Lighthouse, run through PageSpeed Insights against the live deployment — an
emulated Moto G Power on Slow 4G for mobile. Two runs, and both are quoted,
because a single run of a lab test is a sample rather than a number.

| | Mobile | Desktop |
|---|---|---|
| Performance | **93 – 95** | **99 – 100** |
| Accessibility | **100** | **100** |
| Best Practices | **100** | **100** |
| SEO | **100** | **100** |

| Metric | Mobile | Desktop | Target |
|---|---|---|---|
| Largest Contentful Paint | 2.9 – 3.0 s | 0.6 s | ≤ 2.5 s mobile — **missed** · ≤ 2.0 s desktop — met |
| First Contentful Paint | 1.0 s | 0.3 s | — |
| Cumulative Layout Shift | **0** | **0** | ≤ 0.05 |
| Total Blocking Time | 50 – 140 ms | 90 ms | — |
| Speed Index | 2.4 s | 0.9 s | — |

**One target is missed and it is the interesting one.** Mobile LCP lands around
2.9 – 3.0 s against a stated 2.5 s, on exactly the device profile the spec
names. Desktop LCP is 0.6 s against a 2.0 s target, so the cost is specific to a
throttled phone: Lighthouse points at roughly 70 – 90 ms of render-blocking
requests and 225 KB of JavaScript that is downloaded and not used on first
paint. A persistent WebGL canvas is precisely the shape that costs LCP, which is
why the target was set before anything was built rather than after.

CLS is a flat zero on both, which is the number that usually suffers on a site
with this much motion.

Bundle and paint budgets, from the build's own gate:

| | Result | Budget |
|---|---|---|
| Initial client JS | 129.3 KB gz | 210 KB |
| three.js chunk, lazy-loaded | 234.6 KB gz | 340 KB |
| Fonts downloaded | 165.9 KB | 96 KB — **missed** |
| Signal-colour viewport coverage | 3.85% at peak | 4% |
| Sculpture GPU cost at 1280x720 | ~2.0 ms of a 16.67 ms frame | — |

The font budget assumed licensed static faces hand-subset to Latin; the free
stand-ins are variable fonts carrying their whole design space. Stated rather
than quietly dropped.

Real-device check: the site was exercised by hand on a phone — the sculpture
renders, scrolling holds up, and the desk's faders drag under touch. Frame rate
was not instrumented, so no fps figure is claimed.

## Three bugs worth reading about

Every one of these passed the entire automated suite.

**A `<span>` that killed every navigation.** GSAP's `SplitText` replaces a
heading's text node with per-character spans. React still held references to the
nodes it rendered, so unmounting the hero — every navigation away from home —
threw `NotFoundError: Failed to execute 'removeChild'` and took the whole tree
down with it. `useEffect` cleanup runs *after* React detaches a deleted subtree,
so the revert arrived too late; `useLayoutEffect` runs before it.

**A transform that broke a pin.** Animating `main` with `y` left a transform on
it, and a transformed ancestor becomes the containing block for every
`position: fixed` descendant — including ScrollTrigger's pin on the work rail,
which then measured itself against `main` instead of the viewport and lost the
whole section until it had scrolled past.

**A wipe that could not cover its own swap.** A prefetched route swaps in tens of
milliseconds while any cover worth watching takes hundreds, so the destination
painted before the blades arrived. Delaying navigation fixed the flash and fought
`next/link`, which navigates regardless of `preventDefault`. Covering *instantly*
and sweeping away afterwards has neither problem.

## Known gaps

Named rather than left for someone to find.

1. **LCP is 2.9 s on mobile against a 2.5 s target.** A persistent WebGL canvas
   is the likely cost. The lever is the render-blocking chain Lighthouse flags —
   about 90 ms of it — and the 47 KB of unused JavaScript on first load.
2. **The `M` shortcut is unusable under a screen reader.** NVDA's browse mode
   claims single letters for its own navigation, so `M` never reaches the page.
   That also puts it against WCAG 2.1.4, which requires a single-character
   shortcut to be remappable, disableable, or scoped to a focused component.
   The desk is still reachable by its button; the shortcut is a convenience that
   only works for sighted keyboard users.
3. **Heading navigation is unverified.** One NVDA pass reported no headings from
   its starting position, which may have been browse-mode state rather than the
   document. Not retested, so not claimed either way.
4. **VoiceOver has not been run.** The NVDA pass covered Windows only.
5. **No frame-rate instrumentation on mobile.** The site was checked by hand on
   a real phone and behaves, but the 30 fps floor in the spec is unverified.
6. **The pre-rendered fallback video does not exist.** The no-WebGL path is an
   honest CSS composition rather than the specified 8-second loop.
7. **The Process page** is specified as a pinned horizontal scrub and built as a
   vertical list.
8. **A custom domain**, which would also let Resend deliver to addresses other
   than my own.

## Specification

Self-authored, in [docs/](docs/) — [PRD](docs/01-PRD.md),
[UI/UX spec](docs/02-UIUX-Design-Spec.md) and
[roadmap](docs/03-Roadmap-and-Plan.md). Each carries a note on what in it is
invented and what is measured, and the design spec carries revision notes
recording where its first draft was wrong: the contrast table, the shader
constants, the geometry density, and a `ScrollTrigger.scrollerProxy` that was
actively harmful. Those notes are the useful part.

Deployment runbook: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## Licence

Apache 2.0 — see [LICENSE](LICENSE).
