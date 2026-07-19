# Invoice reconstruction architecture

## Root cause (why invoices became logos)

ALEYA was built as a **logo evolution** product. Upload → analyse → generate always
assumed a brand mark:

1. Vision system prompt asked for `logoMark` / `existingLogoText`.
2. PDF page 1 was rasterised and fed to that logo schema.
3. Generation derived SVG marks (Mirror/Refine/Advance) from the reference.
4. Export produced Brand Kits for logos, not invoice templates.

Receipt/invoice kinds existed only as metadata labels.

## Target product

ALEYA is an **invoice reconstruction, improvement, and template-authoring** tool.

```
Upload invoice PDF/image
  → analyse full page (text + optional vision)
  → confirm fields
  → Mirror | Refine | Advance recreation (editable regions + variables)
  → export aleya.invoiceTemplate ZIP/JSON
  → import into Aleya Invoicing
  → generate real customer PDFs
```

Logo work remains available under “Logo tools” but is no longer the primary path.

## Components (ALEYA)

| Module | Role |
|--------|------|
| `src/lib/invoice/types.ts` | Shared template + analysis schemas |
| `src/lib/invoice/analyse-invoice.ts` | Text heuristic + vision invoice analysis |
| `src/lib/invoice/recreate.ts` | Regional HTML/template builder |
| `src/lib/invoice/export-package.ts` | ZIP package (`template.json`, assets) |
| `src/lib/invoice/fixture.ts` | Northwind Tax Invoice proof fixture |
| `src/app/api/invoice/*` | analyse / recreate / export APIs |
| `src/app/invoices` | Primary studio UI |
| `src/lib/references/analyse.ts` | Kind-aware: receipt/invoice → invoice analyser |

## Aleya Invoicing

| Module | Role |
|--------|------|
| `domain/invoice-templates/schema.ts` | Import validator |
| `routes/invoice-templates.ts` | Import / active / clear |
| `services/template-invoice-pdf.ts` | PDFKit renderer driven by template |
| `routes/invoices.ts` | Uses active template when present |

## Interchange

See `TEMPLATE_INTERCHANGE_CONTRACT.md` — format `aleya.invoiceTemplate` v1.0.0.
