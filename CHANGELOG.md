# Changelog

## [1.0.0] — 2026-07-19

### Release candidate — production hardening

#### Security
- Bind Aleya handoff with httpOnly signed claims cookie after HMAC validation
- Reject unbound `aleyaBusinessId` / `aleyaReturnUrl` on project create
- Allowlist return URLs for Aleya delivery redirects
- Sanitize post-auth `next` redirects (block open redirects)
- Strict hex colour sanitization for SVG composition (XSS hardening)
- Security headers: CSP, X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy, HSTS
- Middleware fails closed when Supabase env is missing
- Trim public `/api/health` payload

#### Accessibility & UX
- Focus-visible rings, disabled button styles, reduced-motion support
- Hero / dark-surface CTAs with WCAG-friendly contrast
- Live regions for errors and status messages
- Password reset (forgot + update) flows
- Dashboard empty state: single primary CTA (no duplicate “New project”)
- Larger touch targets; app nav shows Gallery/Pricing on small screens
- Refine field labelled for assistive tech; preview toggles use `aria-pressed`

#### Reliability
- Client fetch paths use try/finally so busy states cannot stick
- Clearer offline / session-expired / export / generation error copy
- Zod errors mapped to 400 across key APIs
- Refine asserts concept belongs to project
- Export returns 404 when no assets are available

#### Product accuracy
- Pricing copy matches enforced Free limits (20 gens/hour); removes unenforced claims
- Pro remains waitlist-only (no Stripe)

#### Documentation
- README installation, env, deploy, troubleshooting
- Architecture, security summary, release notes aligned with schema

### Known deferred (v1.x / v2)
- OpenAI raster generation as default provider
- Stripe / billing for Pro
- Team workspaces
- Stricter CSP without `unsafe-inline` (requires nonce pipeline)
