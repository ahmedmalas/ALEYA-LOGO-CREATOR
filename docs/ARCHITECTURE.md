# ALEYA Logo Creator — Architecture

## Chosen stack

| Layer | Choice | Rationale |
| --- | --- | --- |
| Frontend | **Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS** | Vercel-native, SSR/auth cookies, API routes in one deployable unit |
| Backend / API | **Next.js Route Handlers** (`src/app/api/*`) | Server-only secrets, Fluid Compute compatible |
| Database | **Supabase Postgres** | Auth + RLS + Storage in one platform |
| Storage | **Supabase Storage** bucket `logo-assets` | Private assets with signed URLs; owner-scoped paths |
| Auth | **Supabase Auth** (email/password) via `@supabase/ssr` | Cookie sessions, RLS using `auth.uid()` |
| Image generation | **Provider adapter** (`IMAGE_PROVIDER`) | `svg` deterministic composer for v1; `openai` optional later |
| Hosting | **Vercel** | Preview + production for the standalone product |

## Database / storage

Core tables (all RLS-scoped to `owner_id = auth.uid()`):

- `workspaces` — ownership boundary
- `logo_projects` — brief + style selections + status + optional Aleya link fields
- `logo_concepts` — generated concepts with prompts + asset refs
- `generation_jobs` — idempotency keys, status, provider metadata
- `brand_kits` — selected brand identity pack (asset paths embedded)
- `integration_deliveries` — delivery attempts to Aleya Invoicing

Storage paths: `{owner_id}/{project_id}/{concept_id}/{variant}.{ext}`

## Image-generation provider strategy

1. `ImageProvider` interface: `generateConcepts`, `refineConcept`, with structured errors.
2. `SvgCompositionProvider` produces distinct vector concepts from the brief (default for v1.0).
3. `OpenAIImageProvider` is available when credentials exist; **not required** for commercial SVG/PNG export.
4. Generation jobs store `idempotency_key`. Retries with the same key reuse the existing job.
5. Rate limit: per-user sliding window in `generation_jobs` (default 20 / hour).

## Authentication

- Email/password via Supabase Auth
- Forgot / reset password via `/forgot-password` → email link → `/auth/callback?next=/reset-password`
- Server Components / Route Handlers use `createClient()` from `@/lib/supabase/server`
- Browser uses anon/publishable key only
- Middleware fails closed (503) when Supabase env is missing
- Post-login redirects sanitized to same-origin relative paths

## Security model (v1.0)

- **RLS** on all app tables + private storage policies
- **Security headers** via `next.config.ts` (CSP, frame deny, nosniff, referrer, HSTS in prod)
- **Hex-only colour sanitization** before SVG composition
- **Integration claims cookie** after HMAC validation; project create cannot bind arbitrary `business_id`
- **Return URL allowlist** against Aleya origins
- **Zod validation** on mutating APIs with consistent 400 responses

## Integration contract with Aleya Invoicing

### Ownership

| System | Owns |
| --- | --- |
| **Logo Creator** | Projects, concepts, generation history, Brand Kits, export assets |
| **Aleya Invoicing** | Active branding *reference* for a business used in live documents |

### Secure handoff flow

1. Aleya opens Logo Creator with signed query: `return_url`, `business_id`, `workspace_id`, `state`, `exp`, `sig`
2. `/integrate` → `POST /api/integrate/validate` verifies HMAC + return URL allowlist, sets httpOnly `aleya_integration_claims`
3. User creates a project; API binds Aleya fields **only** from verified claims
4. Selecting a Brand Kit can `POST /api/integrate/deliver` with a re-signed payload to Aleya
5. Issued Aleya documents snapshot branding at finalize/send time

## App surfaces

| Route | Audience |
| --- | --- |
| `/`, `/gallery`, `/pricing` | Public marketing |
| `/login`, `/signup`, `/forgot-password`, `/reset-password` | Auth |
| `/dashboard`, `/projects/*`, `/brand-kits/*` | Authenticated product |
| `/integrate` | Signed Aleya launch |
| `/api/*` | Server APIs (auth required except health + integrate/validate) |
