# Security audit summary — v1.0.0 RC

**Scope:** `ahmedmalas/ALEYA-LOGO-CREATOR`  
**Date:** 2026-07-19

## Findings addressed in this RC

| Severity | Issue | Resolution |
| --- | --- | --- |
| Critical | Arbitrary `aleyaBusinessId` on project create → cross-tenant delivery | Verified httpOnly claims cookie required to bind Aleya fields |
| Critical | Open redirect via `next` on auth callback / login | `safeInternalPath()` — same-origin relative paths only |
| High | SVG colour injection via `dangerouslySetInnerHTML` | Hex-only sanitization + attribute escaping in composer |
| High | Untrusted `returnUrl` navigation after deliver | Origin allowlist (`ALEYA_INVOICING_RECEIVE_URL` + `ALEYA_RETURN_URL_ALLOWLIST`) |
| High | Middleware fail-open without Supabase env | Fail closed with HTTP 503 |
| High | Missing security headers / CSP | Added in `next.config.ts` |
| Medium | Uncaught Zod errors → opaque 500s | Shared `handleRouteError` / `readJson` helpers |
| Medium | Pricing advertised unenforced limits | Copy aligned to enforced generation rate limit |
| Medium | No password reset | `/forgot-password` + `/reset-password` |
| Medium | Stuck busy UI on network failure | try/finally on client mutations |
| Low | `/api/health` leaked provider posture | Returns `{ ok: true }` only |
| Low | Unused service-role helper | Removed from server client module |

## Residual / accepted risks

| Item | Notes | Plan |
| --- | --- | --- |
| CSP includes `'unsafe-inline'` / `'unsafe-eval'` | Required by Next.js hydration without a nonce pipeline | Tighten with nonces in a follow-up |
| Generation rate limit TOCTOU | Check-then-insert under concurrency | Acceptable for Free tier; revisit with Redis/KV |
| SVG still rendered via `innerHTML` | Mitigated by hex sanitization + escaping; owner-scoped data | Prefer blob/`img` rendering later |
| Dependency audit | `npm audit` reports moderate PostCSS via Next.js (no safe fix without breaking Next) | Track upstream Next.js patch; no high/critical production advisories |
| Auth email via built-in SMTP | Project-wide ~2 emails/hour; production users hit `over_email_send_rate_limit` | **Ahmed:** configure custom SMTP + templates + Site URL — see [AUTH_EMAIL_SMTP.md](./AUTH_EMAIL_SMTP.md). App cooldown/UX shipped separately. |

## Controls already in place (unchanged)

- RLS on all app tables
- Private storage with `auth.uid()` path policies
- `getUser()` on protected APIs
- HMAC with `timingSafeEqual` for integration signatures
- Generation idempotency keys
- No OpenAI / service-role secrets in the browser
