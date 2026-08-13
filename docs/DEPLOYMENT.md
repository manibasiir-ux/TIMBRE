# Deploying TIMBRE

The runbook for putting this on Vercel. Everything here needs a browser and an
account login, which is why it is written down rather than automated.

---

## 1. What you need, and what each thing is for

| Service | For | Free tier | Strictly required? |
|---|---|---|---|
| **Vercel** (Hobby) | Hosting, build, the live URL | Yes | Yes |
| **Resend** | Delivering brief submissions by email | 100/day, 3,000/month | No — without it briefs are logged, not sent |
| **Upstash Redis** | Rate limiting that survives serverless | 10,000 commands/day | No — falls back to in-memory, which on serverless is no limiter |
| **Cloudflare Turnstile** | Bot verification on the brief form | Unlimited | No — without it the verifier passes everything |

**Every one of these degrades to a working local stub when its key is absent.**
The site deploys and works with none of them configured; what you lose is stated
in the last column. Deploy first with Vercel alone, confirm it works, then add
the others one at a time — a broken deploy with four new integrations is four
times harder to diagnose.

## 2. Deploy

No CLI. The `vercel` CLI would need installing on the host, and this project's
standing rule is that nothing is installed on the host — the GitHub integration
does the same job from a browser.

1. Push `main` to GitHub if it is not already there.
2. Vercel dashboard → **Add New → Project** → import `manibasiir-ux/TIMBRE`.
3. **Change nothing in the build settings.** Vercel detects Next.js; the Build
   Command is `npm run build`, which triggers the `prebuild` hook that
   synthesises the audio. Both build scripts use only Node builtins, so there is
   nothing to install for them.
4. Deploy.

The first build takes longer than later ones: `next/font/google` downloads
Archivo, Inter and JetBrains Mono at build time and self-hosts them.

### If the deploy fails on `regions`

[vercel.json](../vercel.json) pins `fra1`, which is what NFR-13 asks for — brief
submissions processed in the EU. Hobby accounts are limited to a single region,
and if that pin is rejected, delete `vercel.json` and set the region under
**Project Settings → Functions** instead. The file exists only for that one
line; nothing else in it is load-bearing.

## 3. Environment variables

**Project Settings → Environment Variables.** Never in the repo, never in this
chat, never in a commit.

| Variable | Environment | Notes |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | Production only | The final canonical origin, e.g. `https://timbre.vercel.app`. **Leave it unset on Preview** so previews fall back to `VERCEL_URL` and each canonicalises to itself. |
| `RESEND_API_KEY` | Production | |
| `BRIEF_FROM_EMAIL` | Production | Must be on a domain verified in Resend |
| `BRIEF_TO_EMAIL` | Production | Where enquiries land |
| `SLACK_BRIEF_WEBHOOK` | Production | Optional. A Slack failure never fails a submission |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Production | |
| `TURNSTILE_SECRET_KEY` | Production | |
| `UPSTASH_REDIS_REST_URL` | Production | |
| `UPSTASH_REDIS_REST_TOKEN` | Production | |
| `NEXT_PUBLIC_ANALYTICS_URL` | — | Leave unset. The eleven events are instrumented and dormant; a collector is out of scope |

Three traps, each of which produces a failure that looks like something else:

- **`NEXT_PUBLIC_*` variables are inlined at build time**, not read at runtime.
  Changing one and clicking nothing else does nothing — you have to redeploy.
- **Turnstile is both keys or neither.** With only the site key, the widget
  renders and the server accepts anything. With only the secret, the server
  demands a token that no widget on the page is producing, and **every genuine
  submission is rejected**. `csp.ts` and `TurnstileWidget.tsx` both key off the
  site key, so "neither" is a coherent state and "secret only" is not.
- **Resend without a verified domain can only send to the address that owns the
  Resend account.** For a portfolio build that is usually fine — you are the
  only recipient — but it is not a bug when a test to another address vanishes.

## 4. Verify after the first deploy

Work down this list. Each line is something that has broken here before or is
invisible when wrong.

- [ ] **Every route renders**: `/`, `/work`, a case study, `/services`,
      `/studio`, `/process`, `/journal`, a post, `/brief`, and a 404.
- [ ] **The sculpture is there.** A blank hero on real hardware means the
      capability probe took the fallback path. Container browsers always do this
      — a real GPU should not.
- [ ] **Security headers.** `curl -sI https://<host> | grep -i content-security`
      should show `frame-ancestors 'none'`, no `unsafe-eval`, and
      `upgrade-insecure-requests` (which only appears on an HTTPS origin).
- [ ] **`/robots.txt` allows crawling on production and disallows it on a
      preview.** The preview rule keys off `VERCEL_ENV`; getting it backwards
      means a preview competing with production in search results.
- [ ] **`/sitemap.xml`** lists every route at the production origin, not
      `localhost` — that would mean `NEXT_PUBLIC_SITE_URL` did not reach the
      build.
- [ ] **Submit one real brief.** Confirm the reference code renders, the email
      arrives, and Slack posts if configured. This is the only end-to-end test of
      the backend that exists.
- [ ] **Submit six briefs in ten minutes** and confirm the sixth returns 429.
      Without Upstash on serverless it will not, and that is the point of the
      check.
- [ ] **Console is clean** on a production build, on every route.

## 5. Afterwards

Submit the sitemap to Google Search Console, and — if the numbers matter to you —
run Lighthouse against the live URL rather than against anything local. Nothing
measured inside a container is trustworthy for performance: WebGL there is
software-rendered, which is precisely the case the render-profile probe is built
to reject.
