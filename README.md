# Martin Kučera's Blog

Personal blog at [kuceramartin.com](https://www.kuceramartin.com). Content is written in Notion and served by a Next.js app on Vercel that reads Notion directly with ISR. Cloudflare R2 hosts article audio (mp3) only.

## How publishing works (the whole runbook)

1. Write or edit an article in the [Notion database](https://www.notion.so/f30f2af70c6b4e809af31936989fab56?v=0a3b3a69341441ccbd14f8ccb403b2c4).
2. Wait up to 10 minutes (ISR revalidation). Done.

Notion title rules: plain text, no bold, no manual numbering — the site numbers articles itself and derives the URL slug from the title.

### Audio (automatic)

A daily Vercel cron (`/api/generate-missing-audio`, 06:00 UTC) finds articles without `blog/posts/<slug>/audio.mp3` in R2 and generates the narration. New articles get audio within a day; the player appears automatically once the file exists. The run is stateless and idempotent — file presence in R2 is the only state — and reports to Sentry (errors + a daily check-in, so you're alerted if it stops running).

To generate immediately instead of waiting for the cron:

```bash
vercel env pull .env.audio --environment=production
npx tsx --env-file=.env.audio scripts/generate-audio.ts <slug>
rm .env.audio
```

## Architecture

- **Next.js 14 (App Router) on Vercel** — `app/page.tsx` (article list), `app/[slug]/page.tsx` (article). Both read Notion at render time with `revalidate: 600`.
- **Notion API** — the single source of truth for content (`lib/notion.ts`).
- **Cloudflare R2** — audio files only, at deterministic keys `blog/posts/<slug>/audio.mp3` (`lib/r2.ts`).
- **ElevenLabs TTS** — used only by `scripts/generate-audio.ts`, run manually.
- **Sentry** (`michal-kucera` org, `martin-kucera-blog` project) — server-side error reporting via `instrumentation.ts`. Render/API failures email michal.kucera04@gmail.com.

There is deliberately no sync pipeline, no cron, no content cache layer — a 2026 incident showed they silently masked failures for months. If Notion errors, ISR keeps serving the last good page and Sentry reports the exception: stale but loud.

## Failure modes & what you'd see

| Symptom | Likely cause | Check |
| --- | --- | --- |
| New article not appearing after ~10 min | Notion API error or invalid `NOTION_TOKEN` | Sentry issues; `sentry issue list michal-kucera/martin-kucera-blog` |
| Audio player missing | mp3 not generated/uploaded | run `scripts/generate-audio.ts` |
| Site down | Vercel/deploy problem | Vercel dashboard → Deployments |

## Local development

```bash
npm install
vercel env pull .env.local   # or use the sops/.env.enc + direnv setup
npm run dev
```

Env vars: `NOTION_TOKEN`, `NOTION_DATABASE_ID`, `NEXT_PUBLIC_R2_PUBLIC_URL` (site); `R2_*`, `ELEVENLABS_API_KEY` (audio script only); `SENTRY_DSN` (optional locally).

## Checks

```bash
npm run check   # biome + tsc
npm run test    # playwright e2e
```
