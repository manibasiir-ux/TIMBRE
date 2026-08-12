# TIMBRE

Marketing and portfolio site for a B2B sonic identity studio, where a single
persistent WebGL sculpture reacts to live Web Audio analysis and the navigation
is a mixing desk.

> **TIMBRE is a fictional studio.** It has no clients and has never delivered a
> project. The four case studies, their results, the names in the credits and
> the client wall are invented, and every sound on the site is synthesised by
> [scripts/generate-audio.mjs](scripts/generate-audio.mjs). This is a portfolio
> build: the brand is made up so that the engineering has something real to be
> measured against.

The specification is self-authored and lives in [docs/](docs/) —
[01-PRD.md](docs/01-PRD.md), [02-UIUX-Design-Spec.md](docs/02-UIUX-Design-Spec.md)
and [03-Roadmap-and-Plan.md](docs/03-Roadmap-and-Plan.md), each carrying a note
on what in it is invented and what is measured. The working agreement for coding
agents is [AGENTS.md](AGENTS.md).

**Stack:** Next.js 16 (App Router) · React 19 · Tailwind CSS v4 · GSAP +
ScrollTrigger · three.js via react-three-fiber + drei · Lenis · Zustand

## Running the project

Everything runs in Docker. Node is not installed on the host and does not need
to be. Run all commands from the repository root.

```bash
docker compose up web
```

The dev server is then on <http://localhost:3000>.

| Task | Command |
|---|---|
| Start the dev server | `docker compose up web` |
| Stop it | `docker compose down` |
| Install or refresh dependencies | `docker compose run --rm cli "npm install"` |
| Add a dependency | `docker compose run --rm cli "npm install <pkg>"` |
| Lint | `docker compose run --rm cli "npm run lint"` |
| Typecheck | `docker compose run --rm cli "npm run typecheck"` |
| Unit tests | `docker compose run --rm cli "npm test"` |
| Production build | `docker compose run --rm cli "npm run build"` |
| Regenerate placeholder audio | `docker compose run --rm cli "npm run audio:generate -- --force"` |
| Clear the build cache | `docker compose run --rm cli "npm run clean"` |
| Shell in the container | `docker compose run --rm cli bash` |
| Reset dependencies and caches | `docker compose down -v` |

Removing a route can leave Next's generated types in `.next/dev/types` pointing
at a file that no longer exists, which fails `typecheck` with a missing-module
error naming the deleted route. `npm run clean` is the fix.

First-time setup, if `node_modules` has never been populated:

```bash
docker compose run --rm cli "npm install"
```

The `scaffold` service that generated the application is retained for
reference. It has already been run and must not be run again.

## Why the container is shaped the way it is

Three decisions look odd without the reasoning, and all three were measured
rather than assumed.

**`node_modules` lives in a named volume, not on the bind mount.** The source is
bind-mounted from the Windows filesystem into the WSL2 VM. Every file operation
on that mount crosses the VM boundary, which makes dependency installs and
module resolution crawl. Keeping `node_modules` on the VM's own filesystem
avoids that. `.next` deliberately stays on the bind mount, because Turbopack
splits its state between `.next` and `.next-internal` and separating them across
filesystems breaks recompilation.

**`npm run dev` passes `--webpack`.** inotify events do not survive the Windows
to Linux mount boundary, so the file watcher has to poll. Turbopack's watcher
does not work here: with `watchOptions.pollIntervalMs` configured, edits made
both from Windows and from inside the container left the dev server serving a
stale render indefinitely, and a new route 404'd until the server restarted.
Webpack's polling watcher, driven by `WATCHPACK_POLLING`, does fire. Builds
still use Turbopack, which is the default and is unaffected because it does not
watch. `npm run dev:turbo` is kept for the day the source moves onto a Linux
filesystem or the watcher is fixed.

**`NODE_ENV` is not set in the image.** The Next CLI derives it per command.
Pinning it to `development` leaks into `next build`, where the prerender of
`/_global-error` then fails with a null React dispatcher.

## What cannot be verified from inside a container

WebGL in a container is software-rendered through SwiftShader, and this project
deliberately treats a software rasteriser as a signal to drop to the fallback
render profile (NFR-07). Containerised browser runs will therefore always
exercise the fallback path and never the real hero.

Frame rate targets (NFR-06), the render profiles and canvas persistence across
route transitions have to be checked in a browser on the host, against the
containerised dev server at <http://localhost:3000>.

## Placeholder audio

The studio's real bed and stems do not exist yet, and the product rests on a
sculpture reacting to live analysis, so [scripts/generate-audio.mjs](scripts/generate-audio.mjs)
synthesises real WAV files to analyse. It runs automatically before `dev` and
`build`, and is dependency-free: WAV encoding, ITU-R BS.1770 K-weighted loudness
and the FFT are written out rather than pulled in.

`public/audio/` is git-ignored. The output is deterministic, so versioning three
megabytes of WAV would buy nothing. `src/data/fft-envelope.json` **is** committed:
it is 3 KB gzipped, it is imported at build time, and it drives the sculpture
whenever audio is unavailable (edge case E2).

Replacing the placeholders with the studio's masters means dropping files into
`public/audio/` and re-running the generator for a fresh envelope. No code
changes.

## Environment variables

Copy [.env.example](.env.example) to `.env.local` and fill in what you need.
Every integration degrades to a local stub when its key is absent, so
development works with none of them set. `.env.local` is git-ignored and must
never be committed.
