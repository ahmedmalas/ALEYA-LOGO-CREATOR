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

- [ ] Unit tests green
- [ ] Typecheck / lint / build green
- [ ] Lighthouse performance ≥ target on marketing pages
- [ ] Desktop + mobile production browser QA
- [ ] Security summary reviewed (`docs/SECURITY.md`)
- [ ] No critical / high open issues

## Tagging

After merge to `main` and green production checks:

```bash
git tag -a v1.0.0 -m "ALEYA Logo Creator v1.0.0"
git push origin v1.0.0
```
