# Test evidence — ALEYA Logo Creator

## Automated

| Check | Result |
| --- | --- |
| `npm test` | 3/3 passed (SVG composer + HMAC) |
| `npm run typecheck` | passed |
| `npm run build` | passed |
| `npm run lint` | passed after integrate-page fix |

## End-to-end persistence (Supabase project `aleya-logo-creator` / `wrmwthsfbpkjsxsqigpw`)

Script: `scripts/e2e-generation.ts`

Observed result (2026-07-18):

- Authenticated user created and confirmed
- Workspace + project created
- **4 distinct concepts** generated via `svg-composer`
- Assets uploaded for each concept (SVG, transparent PNG, hi-res, icon, horizontal, stacked, mono, light/dark previews)
- Brand Kit created and reopened
- Anon client could **not** read the project (RLS isolation)

Artifacts:

- `/opt/cursor/artifacts/logo-e2e/e2e-result.json`
- `/opt/cursor/artifacts/logo-e2e/sample-logo.svg`
- `/opt/cursor/artifacts/logo-e2e/sample-logo.png`

## AI raster provider

`OPENAI_API_KEY` / `AI_GATEWAY_API_KEY` were **not** present in this environment.

- Provider status endpoint reports `activeProvider: "svg"`
- Required credential for paid AI raster generation: **`OPENAI_API_KEY`** (preferred) or **`AI_GATEWAY_API_KEY`**
- OpenAI adapter is implemented in `src/lib/providers/openai-provider.ts` and selected when a key is configured
- No fake AI raster outputs are returned

## Aleya Invoicing integration

Full integration + password-eye changes were implemented locally in `/tmp/ai-invoicing-app` on branch `cursor/logo-integration-password-f1e1` (commit `6ad584a`).

Verification there:

- `npm run typecheck` ✅
- `npm test` ✅ (170 passed, 5 skipped)
- `npm run build` ✅

Push to `ahmedmalas/ai-invoicing-app` was **denied** for this agent token (GitHub 403).  
Patch is vendored at `docs/integration/ai-invoicing-app-logo-password.patch` with apply instructions.

## Local runtime

- Dev server health: `GET /api/health` → `ok: true`
- Landing + login routes render with ALEYA branding and password show/hide control component
