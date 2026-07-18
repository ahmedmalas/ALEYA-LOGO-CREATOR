# ALEYA Logo Creator

Standalone logo generation product for Aleya businesses. Deployed separately from Aleya Invoicing and connected through a signed integration contract.

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind
- Supabase Auth, Postgres (RLS), Storage
- Replaceable image providers (`openai` / `svg`)
- Vercel-ready

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full design, ownership model, and Aleya integration contract.

## Features

- Brief capture (name, tagline, industry, personality, style, colours, icon ideas, typography, layout)
- Multi-concept generation, regenerate, refine
- Light/dark preview and side-by-side compare
- Editable exports: SVG, transparent PNG, hi-res PNG, icon, horizontal, stacked, monochrome
- Automatic Brand Kit on final selection
- Workspace-scoped persistence with RLS
- Secure handoff to Aleya Invoicing

## Setup

```bash
cp .env.example .env.local
npm install
npm run dev
```

Required env vars are listed in `.env.example`.

### Image generation credentials

| Provider | Env | Notes |
| --- | --- | --- |
| OpenAI raster | `OPENAI_API_KEY` | Preferred for AI concept images (`OPENAI_IMAGE_MODEL`, default `dall-e-3`) |
| Vercel AI Gateway | `AI_GATEWAY_API_KEY` | Alternative; sets gateway base URL automatically |
| SVG composer | none | Always available; used when AI credentials are absent or `IMAGE_PROVIDER=svg` |

If paid AI credentials are not configured, the app still generates real, distinct SVG logo concepts and export packs. It does **not** fake AI raster results.

## Scripts

- `npm run dev` — local server
- `npm run build` — production build
- `npm test` — unit tests
- `npm run typecheck` — TypeScript check
- `npm run lint` — ESLint

## Supabase

Project migrations live in `supabase/migrations/`. Apply them to your Supabase project before first run.

## Aleya Invoicing integration

1. Set the same `INTEGRATION_HMAC_SECRET` in both apps.
2. Set `ALEYA_INVOICING_RECEIVE_URL` to Aleya’s receive endpoint.
3. From Aleya, use **Create or manage logo** to open this app with a signed launch URL.
4. Selecting a Brand Kit delivers active branding back to Aleya for Business Profile, invoice workspace, and PDFs. Historical issued documents keep branding snapshots.
