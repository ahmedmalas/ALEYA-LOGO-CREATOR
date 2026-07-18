# ALEYA Logo Creator — Architecture

## Chosen stack

| Layer | Choice | Rationale |
| --- | --- | --- |
| Frontend | **Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS** | Vercel-native, SSR/auth cookies, API routes in one deployable unit |
| Backend / API | **Next.js Route Handlers** (`src/app/api/*`) | Server-only secrets, Fluid Compute compatible, no separate API service |
| Database | **Supabase Postgres** | Auth + RLS + Storage in one platform; matches Aleya ecosystem |
| Storage | **Supabase Storage** bucket `logo-assets` | Private assets with signed URLs; workspace-scoped paths |
| Auth | **Supabase Auth** (email/password) via `@supabase/ssr` | Cookie sessions, RLS using `auth.uid()`, no service role in browser |
| Image generation | **Provider adapter** (`IMAGE_PROVIDER`) | Replaceable: `openai` (Images API) primary; `svg` deterministic vector composer always available for editable outputs |
| Hosting | **Vercel** | Preview + production for the standalone product |

## Database / storage requirements

Core tables (all RLS-scoped to `owner_id = auth.uid()`):

- `workspaces` — ownership boundary
- `logo_projects` — brief + style selections + status
- `logo_concepts` — generated concepts with prompts + asset refs
- `generation_jobs` — idempotency keys, status, provider metadata (prevents duplicate charges)
- `brand_kits` — selected brand identity pack
- `brand_kit_assets` — exported variants (PNG/SVG/layouts)
- `integration_links` — secure handoff tokens to Aleya Invoicing

Storage paths: `{workspace_id}/{project_id}/{concept_id}/{variant}.{ext}`

## Image-generation provider strategy

1. `ImageProvider` interface: `generateConcepts`, `refineConcept`, with timeout, retries (idempotent), and structured errors.
2. `OpenAIImageProvider` uses server-only `OPENAI_API_KEY` (or `AI_GATEWAY_API_KEY` via gateway base URL). Never exposed to the browser.
3. `SvgCompositionProvider` produces distinct vector concepts from the brief (name, palette, personality, layout). Used for editable SVG/PNG variants and as a tested fallback when paid credentials are missing.
4. Generation jobs store `idempotency_key`. Retries with the same key reuse the existing job instead of re-billing.
5. Rate limit: per-user sliding window in `generation_jobs` (default 20 generations / hour).

**Credential required for paid AI raster generation:** `OPENAI_API_KEY` (model `gpt-image-1` or `dall-e-3`) **or** `AI_GATEWAY_API_KEY` with `IMAGE_PROVIDER=openai`.

## Authentication strategy

- Email/password via Supabase Auth
- Server Components / Route Handlers use `createServerClient`
- Browser uses `createBrowserClient` with publishable/anon key only
- Service role key used only in server-side integration webhook delivery when needed
- Workspace isolation enforced by RLS policies

## Integration contract with Aleya Invoicing

### Ownership model

| System | Owns |
| --- | --- |
| **Logo Creator** | Projects, concepts, generation history, Brand Kits, export assets |
| **Aleya Invoicing** | Active branding *reference* for a business/workspace used in live documents |

Historical invoices store a **frozen branding snapshot** (`branding_snapshot_json` + asset bytes/URL at issue time) so later logo changes never rewrite issued PDFs.

### Secure handoff flow

1. Aleya opens Logo Creator with signed query:
   - `return_url`, `business_id`, `workspace_id`, `state`, `exp`, `sig` (HMAC-SHA256 with shared `INTEGRATION_HMAC_SECRET`)
2. User creates/selects a Brand Kit in Logo Creator.
3. Logo Creator `POST`s to Aleya `POST /api/integrations/logo-creator/receive`:
   ```json
   {
     "state": "...",
     "businessId": "...",
     "brandKitId": "...",
     "primaryLogoUrl": "https://...",
     "iconUrl": "https://...",
     "horizontalLogoUrl": "https://...",
     "palette": { "primary": "#...", "secondary": "#...", "accent": "#..." },
     "typography": { "display": "...", "body": "..." },
     "metadata": { "businessName": "...", "tagline": "...", "source": "aleya-logo-creator" },
     "exp": 123,
     "sig": "..."
   }
   ```
4. Aleya stores active branding refs on the business profile and copies durable logo bytes into its own storage (or caches signed URL + content hash) for PDF rendering.
5. Issued documents snapshot branding at finalize/send time.

### Source-of-truth rules

- Updating the selected Brand Kit refreshes Aleya’s **active** branding via the receive webhook (or refresh endpoint).
- Removing/changing a logo does **not** mutate historical invoice/quote PDF assets.
- No uncontrolled duplication: Aleya keeps a content-addressed copy for document rendering; Logo Creator remains canonical for editing.

## Environment variables

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=                 # optional; required for OpenAI raster generation
AI_GATEWAY_API_KEY=             # optional alternative
IMAGE_PROVIDER=openai|svg       # default: openai if key present else svg
INTEGRATION_HMAC_SECRET=
ALEYA_INVOICING_RECEIVE_URL=
NEXT_PUBLIC_APP_URL=
```
