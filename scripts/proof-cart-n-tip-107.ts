/**
 * Lightweight Cart N Tip #107 proof: exact upload → Mirror HTML/package artifacts.
 * Prefer `proof-real-cart-n-tip-107.ts` / `proof-cart-n-tip-107-e2e.ts` for full runs.
 */
import { copyFile, mkdir, writeFile } from "node:fs/promises";
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
import { REAL_UPLOAD_SOURCE } from "../src/lib/invoice/cart-n-tip-real";
import { buildInvoiceTemplatePackage } from "../src/lib/invoice/export-package";
import { buildInvoiceTemplate, renderInvoiceHtml } from "../src/lib/invoice/recreate";

const OUT = "/opt/cursor/artifacts/cart-n-tip-107";

async function main() {
  await mkdir(OUT, { recursive: true });
  await mkdir(path.join(OUT, "extracted"), { recursive: true });
  await copyFile(
    REAL_UPLOAD_SOURCE,
    path.join(process.cwd(), "fixtures/invoices/Cart N Tip #107.pdf"),
  );

  const originalPdf = await buildCartNTip107Pdf();
  const originalPng = await renderCartNTip107Png();
  const logoPng = await renderCartNTip107LogoPng();
  await writeFile(path.join(OUT, "original-Cart-N-Tip-107.pdf"), originalPdf);
  await writeFile(path.join(OUT, "original.png"), originalPng);
  await writeFile(path.join(OUT, "extracted/qh-logo-artwork.png"), logoPng);
  await writeFile(path.join(OUT, "original.txt"), cartNTip107PlainText());
  await writeFile(path.join(OUT, "FIXTURE_NOTE.txt"), CART_N_TIP_FIXTURE_NOTE);

  const fromText = analyseInvoiceFromText(cartNTip107PlainText());
  const analysis = cartNTip107Analysis();
  await writeFile(
    path.join(OUT, "analysis.json"),
    JSON.stringify({ fromText, analysis, fixtureNote: CART_N_TIP_FIXTURE_NOTE }, null, 2),
  );

  const logoDataUrl = `data:image/png;base64,${logoPng.toString("base64")}`;
  const mirror = buildInvoiceTemplate(analysis, "mirror");
  mirror.sampleData = {
    ...mirror.sampleData,
    company: { ...mirror.sampleData.company, logo: logoDataUrl },
  };
  mirror.assets = { logo: "assets/logo.png", logoDataUrl };
  const html = renderInvoiceHtml(mirror, mirror.sampleData);
  await writeFile(path.join(OUT, "mirror.html"), html);

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
  await writeFile(path.join(OUT, pkg.filename), pkg.zipBuffer);

  console.log(
    JSON.stringify(
      {
        pdfBytes: originalPdf.length,
        logoBytes: logoPng.length,
        fixtureNote: CART_N_TIP_FIXTURE_NOTE,
        ok: true,
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
