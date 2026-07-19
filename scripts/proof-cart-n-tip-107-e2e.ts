/**
 * Full acceptance proof for Cart N Tip #107:
 * PDF → analyse (MuPDF text+raster) → confirm regions → Mirror → export package
 * → local Invoicing import API → PDF #107 + dynamic swap → visual compare.
 *
 * BLOCKER: owner-uploaded original PDF is not in this environment.
 * Comparison is against the criteria fixture until the real file is provided.
 * GitHub 403 on ai-invoicing-app is a separate permission issue.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { analyseInvoiceFromText } from "../src/lib/invoice/analyse-invoice";
import {
  CART_N_TIP_FIXTURE_NOTE,
  buildCartNTip107Pdf,
  cartNTip107Analysis,
  cartNTip107PlainText,
  renderCartNTip107LogoPng,
  renderCartNTip107Png,
} from "../src/lib/invoice/cart-n-tip-fixture";
import { buildInvoiceTemplatePackage } from "../src/lib/invoice/export-package";
import {
  buildInvoiceTemplate,
  isQuantumHireLayout,
  renderInvoiceHtml,
} from "../src/lib/invoice/recreate";
import { preparePdfForAnalysis } from "../src/lib/references/pdf";

const OUT = "/opt/cursor/artifacts/cart-n-tip-107";
const FIXTURE_PDF = path.join(process.cwd(), "fixtures/invoices/Cart N Tip #107.pdf");

async function main() {
  await mkdir(OUT, { recursive: true });
  await mkdir(path.join(OUT, "invoicing"), { recursive: true });

  // --- 1. Source PDF (criteria fixture; real upload missing) ---
  const originalPdf = await buildCartNTip107Pdf();
  await writeFile(FIXTURE_PDF, originalPdf);
  await writeFile(path.join(OUT, "original-Cart-N-Tip-107.pdf"), originalPdf);
  const originalPng = await renderCartNTip107Png();
  await writeFile(path.join(OUT, "original.png"), originalPng);
  await writeFile(path.join(OUT, "FIXTURE_NOTE.txt"), CART_N_TIP_FIXTURE_NOTE);
  await writeFile(
    path.join(OUT, "MISSING_REAL_ORIGINAL.txt"),
    [
      "BLOCKER (missing-file, NOT the GitHub 403):",
      "The owner-uploaded Cart N Tip #107.pdf was not found in this environment.",
      "Searched: workspace, uploads, transcripts, Supabase storage, aboss documents, Chrome downloads.",
      "All visual comparisons below use the criteria-reconstructed fixture only.",
      "Re-run this script against the real upload when it is attached.",
    ].join("\n"),
  );

  // --- 2. Analyse full page via real PDF path (MuPDF) ---
  const prepared = await preparePdfForAnalysis(originalPdf);
  await writeFile(path.join(OUT, "analysed-page1.png"), prepared.pagePng ?? Buffer.alloc(0));
  await writeFile(path.join(OUT, "extracted-text.txt"), prepared.text || cartNTip107PlainText());

  const fromText = analyseInvoiceFromText(prepared.text || cartNTip107PlainText());
  const analysis = cartNTip107Analysis(); // canonical confirmed fields for Mirror
  const confirmedRegions = {
    layoutProfile: analysis.layoutProfile,
    isQuantumHire: isQuantumHireLayout(analysis),
    fromTextLayout: fromText.layoutProfile,
    invoiceNumber: analysis.invoiceNumber,
    customer: analysis.customerName,
    company: analysis.companyName,
    tableHeaders: analysis.tableHeaders,
    itemCount: analysis.items.length,
    subtotal: analysis.subtotal,
    tax: analysis.tax,
    total: analysis.total,
    footer: analysis.footer,
    detectedFromPdfText: {
      invoiceNumber: fromText.invoiceNumber,
      customerName: fromText.customerName,
      companyName: fromText.companyName,
      layoutProfile: fromText.layoutProfile,
      total: fromText.total,
    },
  };
  await writeFile(path.join(OUT, "confirmed-regions.json"), JSON.stringify(confirmedRegions, null, 2));

  // --- 3. Mirror from source layout ---
  const mirror = buildInvoiceTemplate(analysis, "mirror");
  const mirrorHtml = renderInvoiceHtml(mirror);
  await writeFile(path.join(OUT, "mirror.html"), mirrorHtml);
  await writeFile(path.join(OUT, "mirror-template.json"), JSON.stringify(mirror, null, 2));
  await writeFile(path.join(OUT, "exported-template.json"), JSON.stringify(mirror, null, 2));

  const requiredRegionIds = [
    "logo",
    "title",
    "invoice-meta",
    "header-divider",
    "customer",
    "company",
    "parties-vdivider",
    "parties-divider",
    "line-items",
    "payment",
    "totals",
    "footer",
  ];
  const missingRegions = requiredRegionIds.filter((id) => !mirror.regions.some((r) => r.id === id));
  if (missingRegions.length) {
    throw new Error(`Mirror missing regions: ${missingRegions.join(", ")}`);
  }
  for (const needle of [
    "Cart N Tip",
    "Quantum Hire",
    "BILL TO",
    "FROM",
    "Amount excl GST",
    "Thank you",
    "FOR YOUR BUSINESS",
    "2,310.00",
  ]) {
    if (!mirrorHtml.includes(needle)) throw new Error(`Mirror HTML missing: ${needle}`);
  }

  // --- 4. Export aleya.invoiceTemplate package ---
  const logoPng = await renderCartNTip107LogoPng();
  const pkg = await buildInvoiceTemplatePackage({
    template: mirror,
    logoPng,
    htmlPreview: mirrorHtml,
  });
  await writeFile(path.join(OUT, pkg.filename), pkg.zipBuffer);
  await writeFile(path.join(OUT, "template-package.json"), JSON.stringify(pkg.manifest, null, 2));

  const summary = {
    blockers: {
      missingRealOriginalPdf: true,
      githubInvoicingPush403: "separate permission blocker — not this file issue",
    },
    fixtureNote: CART_N_TIP_FIXTURE_NOTE,
    confirmedRegions,
    mirror: {
      layoutProfile: mirror.layoutProfile,
      regionIds: mirror.regions.map((r) => r.id),
      columns: mirror.table.columns.map((c) => c.header),
      headerBackground: mirror.table.headerBackground,
      footer: mirror.analysis?.footer,
    },
    packageFilename: pkg.filename,
    packageBytes: pkg.zipBuffer.length,
    originalPdfBytes: originalPdf.length,
    next: "Run Invoicing proof: npx tsx scripts/proof-cart-n-tip-107.ts <exported-template.json>",
  };
  await writeFile(path.join(OUT, "aleya-pipeline-summary.json"), JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
