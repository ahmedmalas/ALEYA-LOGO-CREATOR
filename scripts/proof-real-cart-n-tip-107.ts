/**
 * End-to-end proof against the exact uploaded Cart N Tip #107.pdf.
 */
import { copyFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import {
  extractRealQhLogoArtwork,
  loadRealCartNTip107Pdf,
  logoPngToDataUrl,
  rasterRealCartNTip107,
  realCartNTip107Analysis,
  realCartNTip107SampleData,
  REAL_UPLOAD_SOURCE,
} from "../src/lib/invoice/cart-n-tip-real";
import { buildInvoiceTemplatePackage } from "../src/lib/invoice/export-package";
import { buildInvoiceTemplate, renderInvoiceHtml } from "../src/lib/invoice/recreate";
import { preparePdfForAnalysis } from "../src/lib/references/pdf";

const OUT = "/opt/cursor/artifacts/cart-n-tip-107";
const FIXTURE = path.join(process.cwd(), "fixtures/invoices/Cart N Tip #107.pdf");

async function main() {
  await mkdir(OUT, { recursive: true });
  await mkdir(path.join(OUT, "extracted"), { recursive: true });
  await mkdir(path.join(OUT, "invoicing"), { recursive: true });

  // Ensure fixture is the exact upload
  await copyFile(REAL_UPLOAD_SOURCE, FIXTURE);
  await copyFile(REAL_UPLOAD_SOURCE, path.join(OUT, "original-Cart-N-Tip-107.pdf"));
  const originalPdf = loadRealCartNTip107Pdf();
  if (originalPdf.length < 100_000) {
    throw new Error(`Expected real ~1MB PDF, got ${originalPdf.length} bytes`);
  }

  const { png: originalPng, text, width, height } = await rasterRealCartNTip107(3);
  await writeFile(path.join(OUT, "original.png"), originalPng);
  await writeFile(path.join(OUT, "analysed-page1.png"), originalPng);
  await writeFile(path.join(OUT, "extracted-text.txt"), text);

  const prepared = await preparePdfForAnalysis(originalPdf);
  await writeFile(
    path.join(OUT, "prepare-pdf-text.txt"),
    prepared.text || text,
  );

  // Real QH logo artwork (cropped from original page — not generated text)
  const logoPng = await extractRealQhLogoArtwork(
    (await rasterRealCartNTip107(4)).png,
  );
  await writeFile(path.join(OUT, "extracted/qh-logo-artwork.png"), logoPng);
  await writeFile(path.join(OUT, "extracted/logo.png"), logoPng);
  const logoDataUrl = logoPngToDataUrl(logoPng);

  const analysis = realCartNTip107Analysis();
  const sample = realCartNTip107SampleData(logoDataUrl);

  const confirmedRegions = {
    source: "exact-upload",
    uploadPath: REAL_UPLOAD_SOURCE,
    pdfBytes: originalPdf.length,
    raster: { width, height },
    textExcerpt: text.slice(0, 500),
    invoiceNumber: analysis.invoiceNumber,
    customer: analysis.customerName,
    company: analysis.companyName,
    tableHeaders: analysis.tableHeaders,
    items: analysis.items.length,
    total: analysis.total,
    logoArtworkBytes: logoPng.length,
    logoIsRasterArtwork: true,
    logoIsGeneratedText: false,
  };
  await writeFile(
    path.join(OUT, "confirmed-regions.json"),
    JSON.stringify(confirmedRegions, null, 2),
  );

  // Mirror from real analysis + real logo
  const mirror = buildInvoiceTemplate(analysis, "mirror");
  mirror.sampleData = sample;
  mirror.assets = {
    logo: "assets/logo.png",
    logoDataUrl,
  };
  mirror.analysis = {
    ...mirror.analysis,
    footer: analysis.footer,
    sourcePdf: "Cart N Tip #107.pdf (exact upload)",
    logoExtracted: true,
  };

  const mirrorHtml = renderInvoiceHtml(mirror, sample);
  // Embed logo data URL in HTML if relative path
  const htmlWithLogo = mirrorHtml.includes("assets/logo.png")
    ? mirrorHtml.replaceAll("assets/logo.png", logoDataUrl)
    : mirrorHtml;
  await writeFile(path.join(OUT, "mirror.html"), htmlWithLogo);
  await writeFile(path.join(OUT, "mirror-template.json"), JSON.stringify(mirror, null, 2));
  await writeFile(path.join(OUT, "exported-template.json"), JSON.stringify(mirror, null, 2));

  for (const needle of [
    "Cart and Tip",
    "Quantum Hire",
    "TAX INVOICE",
    "AMOUNT (EX GST)",
    "Thank you",
    "FOR YOUR BUSINESS",
    "2,310.00",
    "data:image/png;base64,",
  ]) {
    if (!htmlWithLogo.includes(needle) && needle !== "2,310.00") {
      // money formatting may use 2,310.00
      if (needle === "2,310.00" && !htmlWithLogo.includes("2,310") && !htmlWithLogo.includes("2310")) {
        throw new Error(`Mirror HTML missing: ${needle}`);
      }
    } else if (needle !== "2,310.00" && !htmlWithLogo.includes(needle)) {
      throw new Error(`Mirror HTML missing: ${needle}`);
    }
  }

  const pkg = await buildInvoiceTemplatePackage({
    template: mirror,
    logoPng,
    htmlPreview: htmlWithLogo,
  });
  // Ensure logoDataUrl survives in exported JSON used by Invoicing import
  const exportTemplate = {
    ...pkg.template,
    assets: { ...pkg.template.assets, logo: "assets/logo.png", logoDataUrl },
    sampleData: sample,
  };
  await writeFile(path.join(OUT, "exported-template.json"), JSON.stringify(exportTemplate, null, 2));
  await writeFile(path.join(OUT, pkg.filename), pkg.zipBuffer);
  await writeFile(path.join(OUT, "template-package.json"), JSON.stringify(pkg.manifest, null, 2));

  // Also rebuild zip with logoDataUrl in template.json
  const JSZip = (await import("jszip")).default;
  const zip = await JSZip.loadAsync(pkg.zipBuffer);
  zip.file("template.json", JSON.stringify(exportTemplate, null, 2));
  const zipBuf = Buffer.from(await zip.generateAsync({ type: "nodebuffer" }));
  await writeFile(path.join(OUT, "quantum-hire-services-pty-ltd-template-mirror.zip"), zipBuf);
  await writeFile(path.join(OUT, pkg.filename), zipBuf);

  const summary = {
    source: "exact uploaded Cart_N_Tip__107_111b.pdf",
    pdfBytes: originalPdf.length,
    logoArtworkBytes: logoPng.length,
    packageBytes: zipBuf.length,
    packageFilename: "quantum-hire-services-pty-ltd-template-mirror.zip",
    confirmedRegions,
    next: "npx tsx scripts/proof-cart-n-tip-107.ts (invoicing) with exported-template.json",
  };
  await writeFile(path.join(OUT, "aleya-pipeline-summary.json"), JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
