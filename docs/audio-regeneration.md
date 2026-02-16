# Audio Regeneration Guide

After migrating from Vercel Blob to Cloudflare R2, the audio files need to be regenerated. This guide explains how to do it once the ElevenLabs quota resets.

## Background

- **What happened:** Vercel Blob storage was blocked due to billing limits
- **Migration:** Storage moved to Cloudflare R2 (completed Feb 2026)
- **Audio files:** Could not be migrated because Vercel Blob blocked all downloads
- **Solution:** Regenerate audio using ElevenLabs TTS after quota resets

## Prerequisites

1. ElevenLabs API quota has reset (check at https://elevenlabs.io/app/usage)
2. Access to production environment or `CRON_SECRET` token

## Steps to Regenerate Audio

### Option 1: Regenerate All Audio (Recommended)

Run the sync endpoint which will detect missing audio and trigger generation:

```bash
curl -X POST "https://www.kuceramartin.com/api/sync-content" \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json"
```

Note: This only generates audio for NEW articles (those without existing meta). For existing articles, use Option 2.

### Option 2: Regenerate Specific Article

To regenerate audio for a specific article:

```bash
curl -X POST "https://www.kuceramartin.com/api/regenerate-audio" \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"slug": "article-slug-here"}'
```

### Option 3: Regenerate All Articles One by One

List of all article slugs that need audio:

1. `-a-vzpomnel-si-na-budouci-zivot`
2. `zacatek-vseho`
3. `zastavit-cas`
4. `nadeje-i`
5. `tolerancni-pole`
6. `elektronicky-prenos-hmoty`
7. `system-a-nahoda`
8. `komunikace-predstavy-nekonecno-a-rene-descartes`
9. `svetlo`
10. `vaza`
11. `nadeje-ii`
12. `odnekud-nekam`
13. `cerstva-zprava`
14. `operace`

Run the regenerate-audio endpoint for each slug.

## Verification

After regeneration, verify audio works:

1. Visit an article page (e.g., https://www.kuceramartin.com/zacatek-vseho)
2. Audio player should appear below the title
3. Click play to test

## Troubleshooting

### "Quota exceeded" error
Wait for the next billing cycle or upgrade ElevenLabs plan.

### Audio not appearing after regeneration
Check the meta.json in R2:
```bash
curl "https://pub-cfc71fbd9bcd408ca5f89f67da1ea044.r2.dev/blog/posts/SLUG/meta.json"
```

The `audioStatus` should be `ready` and `audioUrl` should have a valid URL.

### API returns 401 Unauthorized
Verify `CRON_SECRET` environment variable is set correctly in Vercel.

## Environment Variables

These should already be configured in Vercel:

| Variable | Description |
|----------|-------------|
| `ELEVENLABS_API_KEY` | API key for TTS generation |
| `CRON_SECRET` | Secret for authenticating API calls |
| `R2_*` | Cloudflare R2 credentials |
| `NEXT_PUBLIC_R2_PUBLIC_URL` | Public URL for R2 storage |
