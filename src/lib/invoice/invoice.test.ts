import { describe, expect, it } from "vitest";
import { analyseInvoiceFromText } from "@/lib/invoice/analyse-invoice";
import {
  buildCartNTip107Pdf,
  cartNTip107Analysis,
  cartNTip107PlainText,
  renderCartNTip107Png,
} from "@/lib/invoice/cart-n-tip-fixture";
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

describe("Cart N Tip #107 Quantum Hire acceptance layout", () => {
  it("detects quantum-hire layout from Cart N Tip text", () => {
    const analysis = analyseInvoiceFromText(cartNTip107PlainText());
    expect(analysis.layoutProfile).toBe("quantum-hire");
    expect(analysis.customerName).toMatch(/Cart N Tip/i);
    expect(analysis.invoiceNumber).toMatch(/107/);
  });

  it("builds Mirror template with QH structure", () => {
    const template = buildInvoiceTemplate(cartNTip107Analysis(), "mirror");
    expect(template.layoutProfile).toBe("quantum-hire");
    expect(template.table.headerBackground.toLowerCase()).toBe("#111111");
    expect(template.table.columns.map((c) => c.header)).toEqual([
      "Date",
      "Description",
      "Quantity",
      "Rate",
      "Amount excl GST",
    ]);
    expect(template.regions.some((r) => r.label === "From" || r.id === "company")).toBe(true);
    const html = renderInvoiceHtml(template);
    expect(html).toContain("BILL TO");
    expect(html).toContain("FROM");
    expect(html).toContain("Thank you");
    expect(html).toContain("2,310.00");
    expect(html).toContain("PAYMENT DETAILS");
  });

  it("builds a real PDF fixture for /invoices upload", async () => {
    const pdf = await buildCartNTip107Pdf();
    expect(pdf.subarray(0, 4).toString("utf8")).toBe("%PDF");
    const png = await renderCartNTip107Png();
    expect(png.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
  });
});

