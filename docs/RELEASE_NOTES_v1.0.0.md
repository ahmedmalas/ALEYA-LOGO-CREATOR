# ALEYA Logo Creator v1.0.0 — Release Candidate

## Status

Release Candidate for commercial v1.0. Ready to tag **v1.0.0** after this PR merges and production verification passes with no critical/high regressions.

## What’s included

- Full product loop: signup → project → generate → refine/regenerate → Brand Kit → ZIP export
- Public marketing: home, gallery, pricing
- Aleya Invoicing signed handoff (validated + cookie-bound)
- Password reset
- Accessibility and mobile polish
- Security hardening (redirects, SVG colours, headers, integration binding)
- Documentation for new developers

## Explicitly out of scope (deferred)

- OpenAI as required provider
- Stripe / Pro billing
- Team features / multi-seat
- Product redesign

## Verification checklist

- [x] Unit tests green (12/12)
- [x] Typecheck / lint / build green
- [x] Lighthouse (protected preview — SEO depressed by Vercel `noindex`)
  - Desktop home: **Perf 100 / A11y 100 / BP 100** (FCP 0.3s, LCP 0.7s, CLS 0)
  - Mobile home: **Perf 100 / A11y 100 / BP 100** (FCP 1.0s, LCP 1.8s, CLS 0)
  - Desktop gallery/pricing: Perf 100 / A11y 100
- [x] Desktop + mobile browser QA — **29/29** (SE, 15 Pro, Pixel 8, iPad)
- [x] Security summary reviewed (`docs/SECURITY.md`)
- [x] No critical / high open issues remaining in app code

### Remaining (non-blocking)
- Preview SEO score reflects deployment protection `noindex` (not a production defect)
- Moderate PostCSS advisory via Next.js (upstream)
- CSP still allows `'unsafe-inline'` for Next hydration (nonce follow-up)

## Tagging

After merge to `main` and green production checks:

```bash
git tag -a v1.0.0 -m "ALEYA Logo Creator v1.0.0"
git push origin v1.0.0
```
