# Applying Aleya Invoicing integration

This repository includes a ready patch for `ahmedmalas/ai-invoicing-app`:

`docs/integration/ai-invoicing-app-logo-password.patch`

The Cloud Agent token for `ALEYA-LOGO-CREATOR` does **not** have push permission to `ai-invoicing-app`. Apply the patch in that repository:

```bash
git clone https://github.com/ahmedmalas/ai-invoicing-app.git
cd ai-invoicing-app
git checkout -b cursor/logo-integration-password-f1e1
git apply ../ALEYA-LOGO-CREATOR/docs/integration/ai-invoicing-app-logo-password.patch
# or: git am < path/to/ai-invoicing-app-logo-password.patch
```

## What the patch adds

- **Create or manage logo** launch flow with HMAC-signed URL
- Receive endpoint for Brand Kit delivery
- Business profile logo asset persistence (`brand_kit_id`, `logo_asset_path`)
- Invoice branding snapshots for historical PDFs
- Logo embedding in invoice + quote PDFs
- Show/hide password SVG eye controls on all password fields
- Unit/integration tests (170 passing in the patch branch)

## Shared env

```bash
LOGO_CREATOR_URL=https://<logo-creator-host>
INTEGRATION_HMAC_SECRET=<same value as Logo Creator>
```

Local branch with these changes was verified at commit `6ad584a` before the push was denied.
