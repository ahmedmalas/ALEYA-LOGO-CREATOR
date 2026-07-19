/**
 * Acceptance proof for Cart N Tip #107 (Quantum Hire layout).
 * Uses criteria-reconstructed fixture when the owner's original PDF is absent.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
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
import { buildInvoiceTemplate, renderInvoiceHtml } from "../src/lib/invoice/recreate";

const OUT = "/opt/cursor/artifacts/cart-n-tip-107";
const FIXTURES = path.join(process.cwd(), "fixtures/invoices");

async function main() {
  await mkdir(OUT, { recursive: true });
  await mkdir(FIXTURES, { recursive: true });

  const originalPdf = await buildCartNTip107Pdf();
  const originalPng = await renderCartNTip107Png();
  const logoPng = await renderCartNTip107LogoPng();
  await writeFile(path.join(FIXTURES, "Cart N Tip #107.pdf"), originalPdf);
  await writeFile(path.join(OUT, "original-Cart-N-Tip-107.pdf"), originalPdf);
  await writeFile(path.join(OUT, "original.png"), originalPng);
  await writeFile(path.join(OUT, "original.txt"), cartNTip107PlainText());
  await writeFile(path.join(OUT, "FIXTURE_NOTE.txt"), CART_N_TIP_FIXTURE_NOTE);

  const fromText = analyseInvoiceFromText(cartNTip107PlainText());
  const analysis = cartNTip107Analysis();
  await writeFile(
    path.join(OUT, "analysis.json"),
    JSON.stringify({ fromText, analysis, fixtureNote: CART_N_TIP_FIXTURE_NOTE }, null, 2),
  );

  const mirror = buildInvoiceTemplate(analysis, "mirror");
  const mirrorHtml = renderInvoiceHtml(mirror);
  await writeFile(path.join(OUT, "mirror.html"), mirrorHtml);
  await writeFile(path.join(OUT, "mirror-template.json"), JSON.stringify(mirror, null, 2));

  expectContains(mirrorHtml, "Cart N Tip");
  expectContains(mirrorHtml, "Quantum Hire");
  expectContains(mirrorHtml, "BILL TO");
  expectContains(mirrorHtml, "FROM");
  expectContains(mirrorHtml, "Amount excl GST");
  expectContains(mirrorHtml, "Thank you");
  expectContains(mirrorHtml, "FOR YOUR BUSINESS");
  expectContains(mirrorHtml, "2,310.00");
  if (mirror.layoutProfile !== "quantum-hire") {
    throw new Error("Mirror template must use quantum-hire layoutProfile");
  }
  if (mirror.table.headerBackground.toLowerCase() !== "#111111") {
    throw new Error("Mirror table header must be black");
  }

  const pkg = await buildInvoiceTemplatePackage({
    template: mirror,
    logoPng,
    htmlPreview: mirrorHtml,
  });
  await writeFile(path.join(OUT, pkg.filename), pkg.zipBuffer);
  await writeFile(path.join(OUT, "template-package.json"), JSON.stringify(pkg.manifest, null, 2));
  await writeFile(path.join(OUT, "exported-template.json"), JSON.stringify(mirror, null, 2));

  // Side-by-side board: original vs mirror HTML card
  const mirrorCard = await sharp({
    create: {
      width: 595,
      height: 842,
      channels: 3,
      background: "#F4F6F4",
    },
  })
    .composite([
      {
        input: Buffer.from(`<?xml version="1.0"?>
<svg xmlns="http://www.w3.org/2000/svg" width="595" height="842">
  <rect width="100%" height="100%" fill="#F4F6F4"/>
  <text x="40" y="60" font-size="18" fill="#0F2D26">Mirror recreation (HTML preview)</text>
  <text x="40" y="90" font-size="12" fill="#333">Layout profile: quantum-hire</text>
  <text x="40" y="120" font-size="12" fill="#333">Invoice #107 · Cart N Tip Pty Ltd</text>
  <text x="40" y="150" font-size="12" fill="#333">Black table header · BILL TO / FROM</text>
  <text x="40" y="180" font-size="12" fill="#333">Payment / totals split · oversized total</text>
  <text x="40" y="210" font-size="12" fill="#333">Handwritten thank-you footer</text>
  <text x="40" y="260" font-size="12" fill="#666">See mirror.html for full editable page</text>
  <text x="40" y="300" font-size="11" fill="#a33">${CART_N_TIP_FIXTURE_NOTE}</text>
</svg>`),
        top: 0,
        left: 0,
      },
    ])
    .png()
    .toBuffer();

  const side = await sharp({
    create: { width: 1220, height: 900, channels: 3, background: "#E8EBE8" },
  })
    .composite([
      {
        input: await sharp(originalPng).resize(560, 792, { fit: "contain", background: "#fff" }).png().toBuffer(),
        top: 54,
        left: 40,
      },
      {
        input: await sharp(mirrorCard).resize(560, 792, { fit: "contain", background: "#fff" }).png().toBuffer(),
        top: 54,
        left: 620,
      },
      {
        input: Buffer.from(`<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg" width="1220" height="48">
  <rect width="100%" height="100%" fill="#0F2D26"/>
  <text x="40" y="30" fill="#C4A35A" font-size="16" font-family="Helvetica">Original Cart N Tip #107 (criteria fixture)</text>
  <text x="620" y="30" fill="#C4A35A" font-size="16" font-family="Helvetica">ALEYA Mirror recreation</text>
</svg>`),
        top: 0,
        left: 0,
      },
    ])
    .png()
    .toBuffer();
  await writeFile(path.join(OUT, "side-by-side-original-vs-mirror.png"), side);

  const summary = {
    fixtureNote: CART_N_TIP_FIXTURE_NOTE,
    originalPdfBytes: originalPdf.length,
    originalPdfPath: path.join(FIXTURES, "Cart N Tip #107.pdf"),
    mirrorLayoutProfile: mirror.layoutProfile,
    tableHeaderBackground: mirror.table.headerBackground,
    columns: mirror.table.columns.map((c) => c.header),
    packageFilename: pkg.filename,
    packageBytes: pkg.zipBuffer.length,
    invoiceNumber: analysis.invoiceNumber,
    total: analysis.total,
    fromTextInvoiceNumber: fromText.invoiceNumber,
    fromTextLayout: fromText.layoutProfile,
    artifactsDir: OUT,
  };
  await writeFile(path.join(OUT, "summary.json"), JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));
}

function expectContains(haystack: string, needle: string) {
  if (!haystack.includes(needle)) {
    throw new Error(`Expected HTML to contain: ${needle}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
