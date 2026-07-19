import { describe, expect, it } from "vitest";
import { analyseInvoiceFromText } from "@/lib/invoice/analyse-invoice";
import { buildInvoiceTemplatePackage } from "@/lib/invoice/export-package";
import {
  northwindInvoiceAnalysis,
  northwindInvoicePlainText,
  renderNorthwindInvoicePng,
} from "@/lib/invoice/fixture";
import { buildInvoiceTemplate, renderInvoiceHtml } from "@/lib/invoice/recreate";
import { INVOICE_TEMPLATE_FORMAT } from "@/lib/invoice/types";

describe("invoice analysis + recreation", () => {
  it("extracts structured fields from invoice text", () => {
    const analysis = analyseInvoiceFromText(northwindInvoicePlainText());
    expect(analysis.invoiceNumber).toMatch(/INV-2026-0142/i);
    expect(analysis.companyName).toMatch(/Northwind/i);
    expect(analysis.customerName).toMatch(/Contoso/i);
    expect(analysis.items.length).toBeGreaterThan(0);
    expect(analysis.total).toBeGreaterThan(0);
  });

  it("builds Mirror/Refine/Advance templates with editable regions and variables", () => {
    const analysis = northwindInvoiceAnalysis();
    for (const mode of ["mirror", "refine", "advance"] as const) {
      const template = buildInvoiceTemplate(analysis, mode);
      expect(template.format).toBe(INVOICE_TEMPLATE_FORMAT);
      expect(template.sourceMode).toBe(mode);
      expect(template.regions.some((r) => r.type === "table")).toBe(true);
      expect(template.regions.some((r) => r.type === "totals")).toBe(true);
      expect(template.variables).toContain("{{invoice.number}}");
      expect(template.variables).toContain("{{items}}");
      expect(template.sampleData.items.length).toBe(3);
      const html = renderInvoiceHtml(template);
      expect(html).toContain("data-region=\"table\"");
      expect(html).toContain(analysis.invoiceNumber);
      expect(html).toContain("Premium oak shelving");
      expect(html).not.toContain("data-mark=\"shield\"");
    }
  });

  it("exports an importable ZIP package with template.json", async () => {
    const template = buildInvoiceTemplate(northwindInvoiceAnalysis(), "refine");
    const logo = await renderNorthwindInvoicePng();
    const pkg = await buildInvoiceTemplatePackage({
      template,
      logoPng: logo.subarray(0, 200), // tiny stub ok for zip structure
      htmlPreview: renderInvoiceHtml(template),
    });
    expect(pkg.filename).toContain("template");
    expect(pkg.zipBuffer.length).toBeGreaterThan(100);
    expect(pkg.manifest.format).toBe(INVOICE_TEMPLATE_FORMAT);
    expect(pkg.manifest.files).toContain("template.json");
  });

  it("renders a full-page original invoice PNG for side-by-side proofs", async () => {
    const png = await renderNorthwindInvoicePng();
    expect(png.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
    expect(png.length).toBeGreaterThan(5000);
  });
});
