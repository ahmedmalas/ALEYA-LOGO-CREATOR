# Production Auth email (SMTP) — ALEYA Logo Creator

**Status:** App-side cooldown + friendly rate-limit UX can ship without SMTP.  
**Delivery is NOT fixed** until custom SMTP is configured and real inbox tests pass.

Supabase project: `wrmwthsfbpkjsxsqigpw` (`aleya-logo-creator`)  
Production app: `https://aleya-logo-creator.vercel.app`

## What Auth logs showed

Production Auth logs hit the built-in provider cap (`over_email_send_rate_limit` / `429: email rate limit exceeded`) on:

1. **Signup confirmation** — `POST /signup` → `user_confirmation_requested`
2. **Password recovery** — `POST /recover` → `user_recovery_requested`

No `/resend` traffic was present in recent logs (the app previously had no resend control). The hotfix adds a **Resend confirmation** control with the same client cooldown.

The built-in Supabase email service is ~2 messages/hour project-wide and is not suitable for production.

## Hard stop — Ahmed action required

No Resend / SendGrid / Postmark / SMTP credentials exist in this repo or its Vercel env for Logo Creator. Supabase MCP cannot set Auth SMTP, templates, Site URL, or rate limits. A Management API token was also not available in this environment.

**Do not buy a new domain or paid plan without approval.** Prefer an already-approved business domain + existing mail infra (Google Workspace SMTP, Microsoft 365, or a free Resend account on a domain you already control).

### Recommended path (fastest unblock)

**Provider:** [Resend](https://resend.com) (free tier is enough to leave the built-in 2/hour cap), or Google Workspace SMTP if ALEYA already has it.

**Sender**

- **Sender name:** `ALEYA Logo Creator`
- **Sender address:** `noreply@<your-approved-domain>`  
  Fallback while domain DNS is pending (Resend only): `beth.t@example.com` — works for tests, not ideal for brand trust.

### Exact dashboard screens (Ahmed)

1. **Custom SMTP**  
   https://supabase.com/dashboard/project/wrmwthsfbpkjsxsqigpw/auth/smtp  
   - Enable custom SMTP  
   - Host / port / user / pass from your provider  
   - Sender name: `ALEYA Logo Creator`  
   - Sender email: `noreply@…` (or temporary Resend onboarding address)

2. **URL configuration**  
   https://supabase.com/dashboard/project/wrmwthsfbpkjsxsqigpw/auth/url-configuration  
   - **Site URL:** `https://aleya-logo-creator.vercel.app`  
   - **Redirect URLs allowlist** (add all):
     - `https://aleya-logo-creator.vercel.app/**`
     - `https://aleya-logo-creator.vercel.app/auth/callback`
     - `https://aleya-logo-creator.vercel.app/auth/callback?next=/dashboard`
     - `https://aleya-logo-creator.vercel.app/auth/callback?next=/reset-password`
     - `https://aleya-logo-creator.vercel.app/reset-password`
     - Localhost variants only if still needed for dev

3. **Email templates**  
   https://supabase.com/dashboard/project/wrmwthsfbpkjsxsqigpw/auth/templates  
   Update branding for:
   - Confirm signup
   - Reset password
   - Change email address  
   **Magic link:** not used by this app (email/password + reset only) — leave default or skip.

   Suggested subject lines:
   - Confirm: `Confirm your ALEYA Logo Creator account`
   - Reset: `Reset your ALEYA Logo Creator password`
   - Change email: `Confirm your new email for ALEYA Logo Creator`

4. **Rate limits (only after SMTP is active)**  
   https://supabase.com/dashboard/project/wrmwthsfbpkjsxsqigpw/auth/rate-limits  
   - Raise **email sent** to a sensible production value (e.g. 30/hour to start; increase only if deliverability looks healthy).  
   - Do **not** disable abuse protection.

### DNS (if verifying a domain on Resend / similar)

Add the provider’s records on the approved domain DNS host (exact values come from the provider UI):

| Type | Name | Value |
|------|------|--------|
| TXT | `resend._domainkey` (or provider DKIM host) | DKIM public key from provider |
| TXT | `@` or provider SPF host | `v=spf1 include:… ~all` |
| TXT | `_dmarc` | `v=DMARC1; p=none;` (tighten later) |

Complete domain verification in the provider dashboard before switching Supabase sender to `noreply@domain`.

## App-side protections (this hotfix)

- 60s client cooldown per email for signup, resend confirmation, and forgot-password
- Buttons disabled with countdown copy while cooling down
- Friendly message instead of raw `Email rate limit exceeded`
- Forgot-password always uses non-enumerating success copy (except rate-limit / network errors)

## Production verification checklist (after SMTP)

Use **separate** test inboxes:

1. New signup receives confirmation from `ALEYA Logo Creator`
2. Resend confirmation works after the client cooldown
3. Forgot-password email arrives
4. Reset link lands on `https://aleya-logo-creator.vercel.app/reset-password` (via `/auth/callback`)
5. Rapid repeat clicks stay blocked client-side
6. Legitimate sends are no longer blocked by the built-in ~2/hour project cap

Do not mark this incident fixed until those inbox checks pass.
