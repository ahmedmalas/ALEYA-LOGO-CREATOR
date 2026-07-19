# ALEYA Logo Creator

Standalone logo generation product for Aleya businesses. Deployed separately from Aleya Invoicing and connected through a signed integration contract.

**Version:** 1.0.0 (Release Candidate)

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind CSS
- Supabase Auth, Postgres (RLS), Storage
- Replaceable image providers (`svg` default; `openai` optional — not required for v1)
- Vercel-ready

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for ownership, data model, and the Aleya integration contract.

## Features

- Brief capture (name, tagline, industry, personality, style, colours, icon ideas, typography, layout)
- Multi-concept generation, regenerate, refine
- Light/dark preview and side-by-side compare
- Editable exports: SVG, transparent PNG, hi-res PNG, icon, horizontal, stacked, monochrome
- Automatic Brand Kit on final selection
- Owner-scoped persistence with RLS
- Secure handoff to Aleya Invoicing (HMAC + httpOnly claims cookie)
- Password reset, WCAG-minded UI, security headers

## Quick start

```bash
git clone https://github.com/ahmedmalas/ALEYA-LOGO-CREATOR.git
cd ALEYA-LOGO-CREATOR
cp .env.example .env.local
npm install
# Apply supabase/migrations/* to your Supabase project
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_APP_URL` | Yes | Canonical site URL (auth redirects, SEO) |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Browser + SSR anon/publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | No* | Reserved for future admin jobs; not used by the browser |
| `IMAGE_PROVIDER` | No | `svg` (default) or `openai` |
| `OPENAI_API_KEY` / `AI_GATEWAY_API_KEY` | No | Only if using OpenAI raster provider |
| `INTEGRATION_HMAC_SECRET` | For Aleya handoff | Shared HMAC secret with Aleya Invoicing |
| `ALEYA_INVOICING_RECEIVE_URL` | For Aleya handoff | Aleya receive endpoint |
| `ALEYA_RETURN_URL_ALLOWLIST` | Recommended | Comma-separated allowed return origins |
| `GENERATION_RATE_LIMIT_PER_HOUR` | No | Default `20` |

\* Keep the service-role key out of client bundles. v1 APIs use the user session + RLS.

Full template: [`.env.example`](.env.example).

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Local development server |
| `npm run build` | Production build |
| `npm start` | Serve production build |
| `npm test` | Unit tests (Vitest) |
| `npm run typecheck` | TypeScript |
| `npm run lint` | ESLint |

## Deployment (Vercel)

1. Import the GitHub repo into Vercel under your team.
2. Set the environment variables above for Production / Preview / Development.
3. Apply SQL in `supabase/migrations/` to the Supabase project.
4. Deploy. Production URL: configure `NEXT_PUBLIC_APP_URL` to match the live domain.
5. In Supabase Auth settings, allow redirect URLs:
   - `{APP_URL}/auth/callback`
   - `{APP_URL}/reset-password`

## Architecture summary

- **Auth:** Supabase email/password with cookie sessions (`@supabase/ssr`). Middleware refreshes sessions and fails closed if env is missing.
- **Data:** Postgres tables with RLS (`owner_id = auth.uid()`). Private storage bucket `logo-assets`.
- **Generation:** Provider adapter; SVG composer ships logos without OpenAI. Jobs are idempotent via `idempotency_key`.
- **Aleya handoff:** Signed launch → `/api/integrate/validate` sets an httpOnly claims cookie → project create binds only verified `business_id` / `return_url` → deliver signs payload to Aleya.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| 503 “Authentication is not configured” | `NEXT_PUBLIC_SUPABASE_URL` / `ANON_KEY` missing on the deployment |
| “Invalid integration signature” | Same `INTEGRATION_HMAC_SECRET` on both apps; clock / `exp` not expired |
| “Return URL is not allowed” | Add Aleya origin to `ALEYA_RETURN_URL_ALLOWLIST` or match `ALEYA_INVOICING_RECEIVE_URL` origin |
| “Aleya handoff must be validated…” | Open Logo Creator from Aleya (validate sets cookie) before creating a linked project |
| Generation rate limit | Wait for the hourly window or raise `GENERATION_RATE_LIMIT_PER_HOUR` |
| Password reset email missing | Confirm Supabase Auth email templates and redirect allowlist |
| Export empty / failed | Concept must have SVG or storage assets; re-generate if assets missing |

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Changelog](CHANGELOG.md)
- [Security audit summary](docs/SECURITY.md)
- [Release notes / RC checklist](docs/RELEASE_NOTES_v1.0.0.md)
- [Test evidence](docs/TEST_EVIDENCE.md)

## License

Private — ALEYA / ahmedmalas.
