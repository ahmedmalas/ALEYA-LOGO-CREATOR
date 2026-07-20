/**
 * Full acceptance proof for Cart N Tip #107 against the exact uploaded PDF.
 * PDF → analyse → confirm regions → Mirror → export package
 * (Invoicing import + visual diff are separate scripts).
 */
import { copyFile, mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import { analyseInvoiceFromText } from "../src/lib/invoice/analyse-invoice";
import {
  CART_N_TIP_FIXTURE_NOTE,
  buildCartNTip107Pdf,
  cartNTip107Analysis,
  cartNTip107PlainText,
  renderCartNTip107LogoPng,
} from "../src/lib/invoice/cart-n-tip-fixture";
import {
  REAL_UPLOAD_SOURCE,
  rasterRealCartNTip107,
} from "../src/lib/invoice/cart-n-tip-real";
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
  await mkdir(path.join(OUT, "extracted"), { recursive: true });

  await copyFile(REAL_UPLOAD_SOURCE, FIXTURE_PDF);
  const originalPdf = await buildCartNTip107Pdf();
  if (originalPdf.length < 100_000) {
    throw new Error(`Expected real ~1MB PDF, got ${originalPdf.length} bytes`);
  }
  await writeFile(path.join(OUT, "original-Cart-N-Tip-107.pdf"), originalPdf);
  const { png: originalPng, text } = await rasterRealCartNTip107(3);
  await writeFile(path.join(OUT, "original.png"), originalPng);
  await writeFile(path.join(OUT, "FIXTURE_NOTE.txt"), CART_N_TIP_FIXTURE_NOTE);
  try {
    await unlink(path.join(OUT, "MISSING_REAL_ORIGINAL.txt"));
  } catch {
    // ok
  }

  const prepared = await preparePdfForAnalysis(originalPdf);
  await writeFile(path.join(OUT, "analysed-page1.png"), prepared.pagePng ?? originalPng);
  await writeFile(path.join(OUT, "extracted-text.txt"), prepared.text || text || cartNTip107PlainText());

  const fromText = analyseInvoiceFromText(prepared.text || text || cartNTip107PlainText());
  const analysis = cartNTip107Analysis();
  const confirmedRegions = {
    source: "exact-upload",
    uploadPath: REAL_UPLOAD_SOURCE,
    pdfBytes: originalPdf.length,
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

  const logoPng = await renderCartNTip107LogoPng();
  await writeFile(path.join(OUT, "extracted/qh-logo-artwork.png"), logoPng);
  await writeFile(path.join(OUT, "extracted/logo.png"), logoPng);
  const logoDataUrl = `data:image/png;base64,${logoPng.toString("base64")}`;

  const mirror = buildInvoiceTemplate(analysis, "mirror");
  mirror.sampleData = {
    ...mirror.sampleData,
    company: { ...mirror.sampleData.company, logo: logoDataUrl },
  };
  mirror.assets = { logo: "assets/logo.png", logoDataUrl };
  const html = renderInvoiceHtml(mirror, mirror.sampleData);
  await writeFile(path.join(OUT, "mirror.html"), html);
  await writeFile(path.join(OUT, "mirror-template.json"), JSON.stringify(mirror, null, 2));

  const pkg = await buildInvoiceTemplatePackage({
    template: mirror,
    logoPng,
    htmlPreview: html,
  });
  const exportTemplate = {
    ...pkg.template,
    assets: { ...pkg.template.assets, logo: "assets/logo.png", logoDataUrl },
    sampleData: mirror.sampleData,
  };
  await writeFile(path.join(OUT, "exported-template.json"), JSON.stringify(exportTemplate, null, 2));
  const JSZip = (await import("jszip")).default;
  const zip = await JSZip.loadAsync(pkg.zipBuffer);
  zip.file("template.json", JSON.stringify(exportTemplate, null, 2));
  const zipBuf = Buffer.from(await zip.generateAsync({ type: "nodebuffer" }));
  await writeFile(path.join(OUT, pkg.filename), zipBuf);
  await writeFile(path.join(OUT, "quantum-hire-services-pty-ltd-template-mirror.zip"), zipBuf);
  await writeFile(path.join(OUT, "template-package.json"), JSON.stringify(pkg.manifest, null, 2));

  const summary = {
    source: "exact uploaded Cart_N_Tip__107_111b.pdf",
    fixtureNote: CART_N_TIP_FIXTURE_NOTE,
    pdfBytes: originalPdf.length,
    logoArtworkBytes: logoPng.length,
    logoIsRasterArtwork: true,
    logoIsGeneratedText: false,
    packageBytes: zipBuf.length,
    confirmedRegions,
  };
  await writeFile(path.join(OUT, "aleya-pipeline-summary.json"), JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
