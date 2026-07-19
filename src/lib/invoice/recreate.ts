import {
  DEFAULT_VARIABLES,
  INVOICE_TEMPLATE_FORMAT,
  INVOICE_TEMPLATE_VERSION,
  invoiceTemplateSchema,
  type InvoiceAnalysis,
  type InvoiceRecreationMode,
  type InvoiceSampleData,
  type InvoiceTemplate,
  type TemplateRegion,
} from "@/lib/invoice/types";

function sampleFromAnalysis(analysis: InvoiceAnalysis): InvoiceSampleData {
  return {
    company: {
      name: analysis.companyName || "Company Name",
      logo: analysis.hasLogo ? "assets/logo.png" : undefined,
      address: analysis.companyAddress,
      email: analysis.companyEmail,
      phone: analysis.companyPhone,
      abn: analysis.companyAbn,
    },
    customer: {
      name: analysis.customerName || "Customer Name",
      address: analysis.customerAddress,
      email: analysis.customerEmail,
    },
    shipping:
      analysis.shippingName || analysis.shippingAddress
        ? {
            name: analysis.shippingName,
            address: analysis.shippingAddress,
          }
        : undefined,
    invoice: {
      number: analysis.invoiceNumber || "INV-001",
      issueDate: analysis.issueDate,
      dueDate: analysis.dueDate,
      title: analysis.invoiceTitle || "TAX INVOICE",
    },
    items: analysis.items,
    subtotal: analysis.subtotal,
    tax: analysis.tax,
    discount: analysis.discount,
    total: analysis.total,
    payment: {
      instructions: analysis.paymentInstructions || analysis.bankDetails,
    },
    notes: analysis.notes,
    terms: analysis.terms,
  };
}

function modeTheme(
  analysis: InvoiceAnalysis,
  mode: InvoiceRecreationMode,
): InvoiceTemplate["theme"] {
  const primary = analysis.primaryColor || "#1F4D45";
  const secondary = analysis.secondaryColor || "#B08A4F";
  if (mode === "advance") {
    return {
      primaryColor: primary,
      secondaryColor: secondary,
      textColor: "#0F172A",
      mutedColor: "#64748B",
      borderColor: "#CBD5E1",
      backgroundColor: analysis.backgroundColor || "#FFFFFF",
      fontFamily: "Helvetica",
      headingFontFamily: "Helvetica-Bold",
    };
  }
  if (mode === "refine") {
    return {
      primaryColor: primary,
      secondaryColor: secondary,
      textColor: analysis.textColor || "#111827",
      mutedColor: "#6B7280",
      borderColor: analysis.borderColor || "#D1D5DB",
      backgroundColor: analysis.backgroundColor || "#FFFFFF",
      fontFamily: "Helvetica",
      headingFontFamily: "Helvetica-Bold",
    };
  }
  return {
    primaryColor: primary,
    secondaryColor: secondary,
    textColor: analysis.textColor || "#111827",
    mutedColor: "#6B7280",
    borderColor: analysis.borderColor || "#D1D5DB",
    backgroundColor: analysis.backgroundColor || "#FFFFFF",
    fontFamily: "Helvetica",
    headingFontFamily: "Helvetica-Bold",
  };
}

/** Build editable regional template from analysis — not a flattened image. */
export function buildInvoiceTemplate(
  analysis: InvoiceAnalysis,
  mode: InvoiceRecreationMode = "refine",
): InvoiceTemplate {
  const margins = analysis.margins;
  // Layout adjustments by mode (same identity; Advance opens spacing + hierarchy).
  const gap = mode === "advance" ? 18 : mode === "refine" ? 14 : 10;
  const titleSize = mode === "advance" ? 20 : mode === "refine" ? 18 : 16;
  const metaY = 48;
  const companyY = 48;
  const customerY = 168 + gap;
  const tableY = 280 + gap * 2;
  const totalsY = 560 + (mode === "advance" ? 20 : 0);
  const notesY = 650;
  const paymentY = 720;
  const footerY = 800;

  const regions: TemplateRegion[] = [
    {
      id: "logo",
      type: "logo",
      label: "Logo",
      bounds: { x: 420, y: companyY, width: 120, height: 56 },
      style: {
        fontFamily: "Helvetica",
        fontSize: 10,
        fontWeight: "normal",
        color: "#111827",
        align: "right",
      },
      binding: "{{company.logo}}",
      editable: true,
    },
    {
      id: "company",
      type: "company",
      label: "Company details",
      bounds: { x: margins.left, y: companyY, width: 320, height: 90 },
      style: {
        fontFamily: "Helvetica-Bold",
        fontSize: mode === "advance" ? 22 : 18,
        fontWeight: "bold",
        color: analysis.primaryColor,
        align: "left",
      },
      binding:
        "{{company.name}}\n{{company.address}}\n{{company.email}}\n{{company.phone}}\nABN: {{company.abn}}",
      editable: true,
    },
    {
      id: "title",
      type: "title",
      label: "Invoice title",
      bounds: { x: 360, y: metaY + 60, width: 180, height: 28 },
      style: {
        fontFamily: "Helvetica-Bold",
        fontSize: titleSize,
        fontWeight: "bold",
        color: "#111827",
        align: "right",
      },
      binding: "{{invoice.title}}",
      editable: true,
    },
    {
      id: "invoice-meta",
      type: "invoiceMeta",
      label: "Invoice metadata",
      bounds: { x: 360, y: metaY + 92, width: 180, height: 60 },
      style: {
        fontFamily: "Helvetica",
        fontSize: 10,
        fontWeight: "normal",
        color: "#111827",
        align: "right",
      },
      binding:
        "Invoice: {{invoice.number}}\nIssue: {{invoice.issueDate}}\nDue: {{invoice.dueDate}}",
      editable: true,
    },
    {
      id: "customer",
      type: "customer",
      label: "Bill To",
      bounds: { x: margins.left, y: customerY, width: 260, height: 80 },
      style: {
        fontFamily: "Helvetica",
        fontSize: 11,
        fontWeight: "normal",
        color: "#111827",
        align: "left",
      },
      binding: "Bill To\n{{customer.name}}\n{{customer.address}}\n{{customer.email}}",
      editable: true,
    },
    {
      id: "line-items",
      type: "table",
      label: "Line items",
      bounds: { x: margins.left, y: tableY, width: 500, height: 240 },
      style: {
        fontFamily: "Helvetica",
        fontSize: 10,
        fontWeight: "normal",
        color: "#111827",
        align: "left",
        borderColor: analysis.borderColor,
        borderWidth: mode === "mirror" ? 1 : mode === "refine" ? 1 : 0.75,
      },
      binding: "{{items}}",
      editable: true,
    },
    {
      id: "totals",
      type: "totals",
      label: "Totals",
      bounds: { x: 330, y: totalsY, width: 210, height: 70 },
      style: {
        fontFamily: "Helvetica",
        fontSize: 11,
        fontWeight: "normal",
        color: "#111827",
        align: "right",
      },
      binding: "Subtotal: {{subtotal}}\nTax: {{tax}}\nDiscount: {{discount}}\nTotal: {{total}}",
      editable: true,
    },
    {
      id: "notes",
      type: "notes",
      label: "Notes",
      bounds: { x: margins.left, y: notesY, width: 300, height: 50 },
      style: {
        fontFamily: "Helvetica",
        fontSize: 10,
        fontWeight: "normal",
        color: "#4B5563",
        align: "left",
      },
      binding: "Notes\n{{notes}}",
      editable: true,
    },
    {
      id: "payment",
      type: "payment",
      label: "Payment instructions",
      bounds: { x: margins.left, y: paymentY, width: 500, height: 55 },
      style: {
        fontFamily: "Helvetica",
        fontSize: 10,
        fontWeight: "normal",
        color: "#4B5563",
        align: "left",
      },
      binding: "Payment\n{{payment.instructions}}\n{{terms}}",
      editable: true,
    },
    {
      id: "footer",
      type: "footer",
      label: "Footer",
      bounds: { x: margins.left, y: footerY, width: 500, height: 24 },
      style: {
        fontFamily: "Helvetica",
        fontSize: 9,
        fontWeight: "normal",
        color: "#6B7280",
        align: "center",
      },
      binding: "{{company.name}} · Thank you for your business",
      editable: true,
    },
  ];

  if (analysis.shippingName || analysis.shippingAddress) {
    regions.push({
      id: "shipping",
      type: "shipping",
      label: "Ship To",
      bounds: { x: 320, y: customerY, width: 220, height: 80 },
      style: {
        fontFamily: "Helvetica",
        fontSize: 11,
        fontWeight: "normal",
        color: "#111827",
        align: "left",
      },
      binding: "Ship To\n{{shipping.name}}\n{{shipping.address}}",
      editable: true,
    });
  }

  const headers =
    analysis.tableHeaders.length >= 3
      ? analysis.tableHeaders
      : ["Description", "Qty", "Unit", "Tax", "Total"];

  return invoiceTemplateSchema.parse({
    format: INVOICE_TEMPLATE_FORMAT,
    version: INVOICE_TEMPLATE_VERSION,
    page: {
      size: analysis.pageSize,
      orientation: analysis.orientation,
      widthPt: analysis.pageSize === "Letter" ? 612 : 595.28,
      heightPt: analysis.pageSize === "Letter" ? 792 : 841.89,
      margins,
    },
    theme: modeTheme(analysis, mode),
    regions,
    table: {
      regionId: "line-items",
      columns: [
        { id: "description", header: headers[0] || "Description", binding: "description", width: 220, align: "left" },
        { id: "quantity", header: headers[1] || "Qty", binding: "quantity", width: 50, align: "right" },
        { id: "unitPrice", header: headers[2] || "Unit", binding: "unitPrice", width: 70, align: "right" },
        { id: "tax", header: headers[3] || "Tax", binding: "tax", width: 60, align: "right" },
        { id: "total", header: headers[4] || "Total", binding: "total", width: 70, align: "right" },
      ],
      headerBackground: mode === "advance" ? "#EEF2F7" : "#F3F4F6",
      rowBorderColor: analysis.borderColor || "#E5E7EB",
    },
    variables: [...DEFAULT_VARIABLES],
    sampleData: sampleFromAnalysis(analysis),
    sourceMode: mode,
    analysis: {
      summary: analysis.summary,
      confidence: analysis.confidence,
      detectedFields: [
        "company",
        "customer",
        "invoiceMeta",
        "items",
        "totals",
        "payment",
        "notes",
      ],
    },
    assets: {
      logo: analysis.hasLogo ? "assets/logo.png" : undefined,
    },
  });
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function formatMoney(n: number): string {
  return n.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Full-page HTML preview with data-region attributes for editing. */
export function renderInvoiceHtml(
  template: InvoiceTemplate,
  data: InvoiceSampleData = template.sampleData,
): string {
  const t = template.theme;
  const pageW = template.page.widthPt;
  const pageH = template.page.heightPt;

  const rows = data.items
    .map(
      (item) => `
      <tr>
        <td>${escapeHtml(item.description)}</td>
        <td class="num">${item.quantity}</td>
        <td class="num">${formatMoney(item.unitPrice)}</td>
        <td class="num">${formatMoney(item.tax)}</td>
        <td class="num">${formatMoney(item.total)}</td>
      </tr>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<title>${escapeHtml(data.invoice.title)} ${escapeHtml(data.invoice.number)}</title>
<style>
  @page { size: ${template.page.size} ${template.page.orientation}; margin: 0; }
  * { box-sizing: border-box; }
  body { margin: 0; background: #e8ebe9; font-family: ${t.fontFamily}, system-ui, sans-serif; color: ${t.textColor}; }
  .page {
    width: ${pageW}pt; min-height: ${pageH}pt; margin: 24px auto; background: ${t.backgroundColor};
    padding: ${template.page.margins.top}pt ${template.page.margins.right}pt ${template.page.margins.bottom}pt ${template.page.margins.left}pt;
    position: relative; box-shadow: 0 12px 40px rgba(15,42,37,0.12);
  }
  [data-region] { position: absolute; }
  .company-name { font-size: 22px; font-weight: 700; color: ${t.primaryColor}; margin: 0 0 6px; }
  .muted { color: ${t.mutedColor}; font-size: 11px; line-height: 1.45; white-space: pre-line; }
  .title { font-size: 18px; font-weight: 700; text-align: right; margin: 0; }
  .meta { text-align: right; font-size: 10px; line-height: 1.5; white-space: pre-line; }
  .section-label { font-size: 11px; font-weight: 700; margin: 0 0 4px; }
  table.items { width: 100%; border-collapse: collapse; font-size: 10px; }
  table.items th { background: ${template.table.headerBackground}; text-align: left; padding: 8px 6px; border-bottom: 1px solid ${t.borderColor}; }
  table.items th.num, table.items td.num { text-align: right; }
  table.items td { padding: 8px 6px; border-bottom: 1px solid ${template.table.rowBorderColor}; vertical-align: top; }
  .totals { text-align: right; font-size: 11px; line-height: 1.6; white-space: pre-line; }
  .totals strong { color: ${t.primaryColor}; font-size: 13px; }
  .footer { text-align: center; font-size: 9px; color: ${t.mutedColor}; width: 100%; }
  .logo-box {
    width: 120px; height: 56px; border: 1px dashed ${t.borderColor}; display: flex; align-items: center; justify-content: center;
    color: ${t.mutedColor}; font-size: 10px; overflow: hidden;
  }
  .logo-box img { max-width: 100%; max-height: 100%; object-fit: contain; }
  .mode-tag { position: absolute; top: 12px; left: 12px; font-size: 9px; letter-spacing: 0.08em; text-transform: uppercase; color: ${t.mutedColor}; }
</style>
</head>
<body>
  <article class="page" data-template-format="${template.format}" data-source-mode="${template.sourceMode}">
    <div class="mode-tag">${escapeHtml(template.sourceMode)} recreation</div>
    ${
      template.regions.find((r) => r.id === "logo")
        ? `<div data-region="logo" data-binding="{{company.logo}}" style="left:${420 - template.page.margins.left}pt;top:${48 - template.page.margins.top}pt;">
      <div class="logo-box">${data.company.logo ? `<img alt="Logo" src="${escapeHtml(data.company.logo)}"/>` : "LOGO"}</div>
    </div>`
        : ""
    }
    <div data-region="company" data-binding="{{company.name}}" style="left:0;top:0;width:320pt;">
      <p class="company-name">${escapeHtml(data.company.name)}</p>
      <div class="muted">${escapeHtml(data.company.address)}
${escapeHtml(data.company.email)}
${escapeHtml(data.company.phone)}
${data.company.abn ? `ABN: ${escapeHtml(data.company.abn)}` : ""}</div>
    </div>
    <div data-region="title" style="right:0;top:60pt;width:200pt;">
      <p class="title">${escapeHtml(data.invoice.title)}</p>
      <div class="meta">Invoice: ${escapeHtml(data.invoice.number)}
Issue: ${escapeHtml(data.invoice.issueDate)}
Due: ${escapeHtml(data.invoice.dueDate)}</div>
    </div>
    <div data-region="customer" style="left:0;top:140pt;width:260pt;">
      <p class="section-label">Bill To</p>
      <div class="muted">${escapeHtml(data.customer.name)}
${escapeHtml(data.customer.address)}
${escapeHtml(data.customer.email)}</div>
    </div>
    <div data-region="table" data-binding="{{items}}" style="left:0;top:240pt;width:500pt;">
      <table class="items">
        <thead>
          <tr>
            ${template.table.columns
              .map(
                (c) =>
                  `<th class="${c.align === "right" ? "num" : ""}">${escapeHtml(c.header)}</th>`,
              )
              .join("")}
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <div data-region="totals" style="right:0;top:520pt;width:210pt;">
      <div class="totals">Subtotal: ${formatMoney(data.subtotal)}
Tax: ${formatMoney(data.tax)}
${data.discount ? `Discount: ${formatMoney(data.discount)}\n` : ""}<strong>Total: ${formatMoney(data.total)}</strong></div>
    </div>
    <div data-region="notes" style="left:0;top:600pt;width:300pt;">
      <p class="section-label">Notes</p>
      <div class="muted">${escapeHtml(data.notes || "—")}</div>
    </div>
    <div data-region="payment" style="left:0;top:670pt;width:500pt;">
      <p class="section-label">Payment</p>
      <div class="muted">${escapeHtml(data.payment.instructions || "—")}
${escapeHtml(data.terms)}</div>
    </div>
    <div data-region="footer" class="footer" style="left:0;top:760pt;width:500pt;">
      ${escapeHtml(data.company.name)} · Thank you for your business
    </div>
  </article>
</body>
</html>`;
}
