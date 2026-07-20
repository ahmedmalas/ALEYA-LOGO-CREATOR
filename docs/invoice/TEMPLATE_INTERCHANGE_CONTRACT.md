# Aleya Invoice Template Interchange Contract

**Format:** `aleya.invoiceTemplate`  
**Version:** `1.0.0`  
**Package:** ZIP containing `template.json` + optional `assets/*`

## Purpose

ALEYA (invoice reconstruction / template authoring) exports a package that
**Aleya Invoicing** imports to render real customer invoices as PDF without
flattening the design into a single image.

## Package layout

```
invoice-template.zip
├── template.json          # required — schema below
├── manifest.json          # required — format, version, createdAt, sourceMode
└── assets/
    └── logo.png           # optional brand mark
```

## `template.json` schema (summary)

| Field | Description |
|-------|-------------|
| `format` | Always `"aleya.invoiceTemplate"` |
| `version` | Semver string, currently `"1.0.0"` |
| `page` | `{ size: "A4"\|"Letter", orientation, widthPt, heightPt, margins }` |
| `theme` | colours, fonts, border styles |
| `regions` | editable layout regions with bindings |
| `table` | line-items column schema + binding `{{items}}` |
| `variables` | catalogue of supported mustache-style keys |
| `sampleData` | realistic preview payload |
| `sourceMode` | `mirror` \| `refine` \| `advance` |
| `analysis` | detected fields / confidence (optional audit) |

### Region types

`logo` · `company` · `invoiceMeta` · `customer` · `shipping` · `table` ·
`totals` · `notes` · `payment` · `footer` · `title` · `decorative`

Each region:

```json
{
  "id": "customer",
  "type": "customer",
  "label": "Bill To",
  "bounds": { "x": 48, "y": 220, "width": 260, "height": 90 },
  "style": { "fontSize": 11, "color": "#111827", "align": "left" },
  "binding": "{{customer.name}}\n{{customer.address}}\n{{customer.email}}",
  "editable": true
}
```

Coordinates are **PDF points** with origin top-left of the page content box
(compatible with PDFKit after converting `y` to bottom-up).

### Required variables

- `{{company.name}}` `{{company.logo}}` `{{company.address}}` `{{company.email}}` `{{company.phone}}` `{{company.abn}}`
- `{{customer.name}}` `{{customer.address}}` `{{customer.email}}`
- `{{invoice.number}}` `{{invoice.issueDate}}` `{{invoice.dueDate}}` `{{invoice.title}}`
- `{{items}}` (array of `{ description, quantity, unitPrice, tax, total }`)
- `{{subtotal}}` `{{tax}}` `{{discount}}` `{{total}}`
- `{{payment.instructions}}` `{{notes}}` `{{terms}}`

## Import API (Aleya Invoicing)

`POST /api/integrations/invoice-templates/import`

- Auth: workspace session **or** HMAC-signed handoff (same secret family as Logo Creator).
- Body: multipart ZIP **or** JSON `{ template, assets? }`.
- Effect: stores active template for the workspace; subsequent
  `GET /api/invoices/:id/pdf` renders through the template engine when an
  active template exists; otherwise falls back to the legacy fixed layout.

`GET /api/integrations/invoice-templates/active` — returns the active template.

## Export API (ALEYA)

`POST /api/invoice/export` — builds the ZIP from a confirmed analysis + recreation mode.

## Compatibility rule

Do not invent a parallel format. Both apps share this contract. Additive
fields must be optional; unknown fields are ignored on import.
