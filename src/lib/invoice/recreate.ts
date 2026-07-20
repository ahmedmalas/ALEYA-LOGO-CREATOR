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

export function isQuantumHireLayout(analysis: InvoiceAnalysis): boolean {
  if (analysis.layoutProfile === "quantum-hire") return true;
  if (/quantum\s*hire/i.test(analysis.companyName)) return true;
  if (/cart\s*n\s*tip/i.test(analysis.customerName)) return true;
  if (/quantum\s*hire|cart\s*n\s*tip/i.test(analysis.rawTextExcerpt)) return true;
  const headers = analysis.tableHeaders.map((h) => h.toLowerCase()).join("|");
  return headers.includes("date") && headers.includes("amount excl");
}

function buildQuantumHireRegions(
  analysis: InvoiceAnalysis,
  mode: InvoiceRecreationMode,
): TemplateRegion[] {
  const m = analysis.margins;
  const titleSize = mode === "advance" ? 22 : mode === "refine" ? 20 : 18;
  return [
    {
      id: "logo",
      type: "logo",
      label: "QH logo",
      bounds: { x: m.left, y: m.top, width: 110, height: 56 },
      style: {
        fontFamily: "Helvetica-Bold",
        fontSize: 28,
        fontWeight: "bold",
        color: analysis.secondaryColor || "#C4A35A",
        align: "left",
        background: analysis.primaryColor || "#0F2D26",
      },
      binding: "{{company.logo}}",
      editable: true,
    },
    {
      id: "title",
      type: "title",
      label: "Invoice title",
      bounds: { x: 340, y: m.top, width: 215, height: 28 },
      style: {
        fontFamily: "Helvetica-Bold",
        fontSize: titleSize,
        fontWeight: "bold",
        color: "#111111",
        align: "right",
      },
      binding: "{{invoice.title}}",
      editable: true,
    },
    {
      id: "invoice-meta",
      type: "invoiceMeta",
      label: "Invoice metadata",
      bounds: { x: 340, y: m.top + 32, width: 215, height: 70 },
      style: {
        fontFamily: "Helvetica",
        fontSize: 10,
        fontWeight: "normal",
        color: "#333333",
        align: "right",
      },
      binding:
        "Invoice #: {{invoice.number}}\nInvoice Date: {{invoice.issueDate}}\nDue Date: {{invoice.dueDate}}\nTerms: {{terms}}",
      editable: true,
    },
    {
      id: "header-divider",
      type: "decorative",
      label: "Header divider",
      bounds: { x: m.left, y: 150, width: 515, height: 2 },
      style: {
        fontFamily: "Helvetica",
        fontSize: 1,
        fontWeight: "normal",
        color: "#111111",
        align: "left",
        borderColor: "#111111",
        borderWidth: 1.25,
      },
      binding: "",
      editable: false,
    },
    {
      id: "customer",
      type: "customer",
      label: "Bill To",
      bounds: { x: m.left, y: 168, width: 250, height: 90 },
      style: {
        fontFamily: "Helvetica",
        fontSize: 11,
        fontWeight: "normal",
        color: "#111111",
        align: "left",
      },
      binding: "BILL TO\n{{customer.name}}\n{{customer.address}}\n{{customer.email}}",
      editable: true,
    },
    {
      id: "company",
      type: "company",
      label: "From",
      bounds: { x: 320, y: 168, width: 235, height: 90 },
      style: {
        fontFamily: "Helvetica",
        fontSize: 11,
        fontWeight: "normal",
        color: "#111111",
        align: "left",
      },
      binding:
        "FROM\n{{company.name}}\n{{company.address}}\nABN: {{company.abn}}\n{{company.phone}}",
      editable: true,
    },
    {
      id: "parties-vdivider",
      type: "decorative",
      label: "Parties vertical divider",
      bounds: { x: 297, y: 168, width: 2, height: 88 },
      style: {
        fontFamily: "Helvetica",
        fontSize: 1,
        fontWeight: "normal",
        color: "#111111",
        align: "left",
        borderColor: "#111111",
        borderWidth: 1,
      },
      binding: "",
      editable: false,
    },
    {
      id: "parties-divider",
      type: "decorative",
      label: "Parties divider",
      bounds: { x: m.left, y: 268, width: 515, height: 2 },
      style: {
        fontFamily: "Helvetica",
        fontSize: 1,
        fontWeight: "normal",
        color: "#111111",
        align: "left",
        borderColor: "#111111",
        borderWidth: 1,
      },
      binding: "",
      editable: false,
    },
    {
      id: "line-items",
      type: "table",
      label: "Line items",
      bounds: { x: m.left, y: 288, width: 515, height: 280 },
      style: {
        fontFamily: "Helvetica",
        fontSize: 10,
        fontWeight: "normal",
        color: "#111111",
        align: "left",
        borderColor: "#111111",
        borderWidth: 1,
        background: "#111111",
      },
      binding: "{{items}}",
      editable: true,
    },
    {
      id: "payment",
      type: "payment",
      label: "Payment details",
      bounds: { x: m.left, y: 600, width: 260, height: 110 },
      style: {
        fontFamily: "Helvetica",
        fontSize: 10,
        fontWeight: "normal",
        color: "#333333",
        align: "left",
      },
      binding: "PAYMENT DETAILS\n{{payment.instructions}}",
      editable: true,
    },
    {
      id: "totals",
      type: "totals",
      label: "Totals",
      bounds: { x: 330, y: 600, width: 225, height: 120 },
      style: {
        fontFamily: "Helvetica-Bold",
        fontSize: 28,
        fontWeight: "bold",
        color: analysis.primaryColor || "#0F2D26",
        align: "right",
      },
      binding: "Subtotal: {{subtotal}}\nGST: {{tax}}\nTOTAL INC GST: {{total}}",
      editable: true,
    },
    {
      id: "footer",
      type: "footer",
      label: "Handwritten thank-you",
      bounds: { x: m.left, y: 760, width: 515, height: 40 },
      style: {
        fontFamily: "Times-Italic",
        fontSize: 28,
        fontWeight: "normal",
        color: analysis.primaryColor || "#0F2D26",
        align: "center",
      },
      binding: "{{footer}}",
      editable: true,
    },
  ];
}

function buildGenericRegions(
  analysis: InvoiceAnalysis,
  mode: InvoiceRecreationMode,
): TemplateRegion[] {
  const margins = analysis.margins;
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
  return regions;
}

/** Build editable regional template from analysis — not a flattened image. */
export function buildInvoiceTemplate(
  analysis: InvoiceAnalysis,
  mode: InvoiceRecreationMode = "refine",
): InvoiceTemplate {
  const quantum = isQuantumHireLayout(analysis);
  const regions = quantum
    ? buildQuantumHireRegions(analysis, mode)
    : buildGenericRegions(analysis, mode);

  const headers = quantum
    ? analysis.tableHeaders.length >= 5
      ? analysis.tableHeaders
      : ["Date", "Description", "Quantity", "Rate", "Amount excl GST"]
    : analysis.tableHeaders.length >= 3
      ? analysis.tableHeaders
      : ["Description", "Qty", "Unit", "Tax", "Total"];

  const columns = quantum
    ? [
        { id: "date", header: headers[0] || "DATE", binding: "date", width: 80, align: "left" as const },
        {
          id: "description",
          header: headers[1] || "DESCRIPTION",
          binding: "description",
          width: 210,
          align: "left" as const,
        },
        {
          id: "quantity",
          header: headers[2] || "QTY",
          binding: "quantity",
          width: 45,
          align: "center" as const,
        },
        {
          id: "unitPrice",
          header: headers[3] || "RATE",
          binding: "unitPrice",
          width: 75,
          align: "right" as const,
        },
        {
          id: "total",
          header: headers[4] || "AMOUNT (EX GST)",
          binding: "lineSubtotal",
          width: 105,
          align: "right" as const,
        },
      ]
    : [
        {
          id: "description",
          header: headers[0] || "Description",
          binding: "description",
          width: 220,
          align: "left" as const,
        },
        {
          id: "quantity",
          header: headers[1] || "Qty",
          binding: "quantity",
          width: 50,
          align: "right" as const,
        },
        {
          id: "unitPrice",
          header: headers[2] || "Unit",
          binding: "unitPrice",
          width: 70,
          align: "right" as const,
        },
        { id: "tax", header: headers[3] || "Tax", binding: "tax", width: 60, align: "right" as const },
        {
          id: "total",
          header: headers[4] || "Total",
          binding: "total",
          width: 70,
          align: "right" as const,
        },
      ];

  return invoiceTemplateSchema.parse({
    format: INVOICE_TEMPLATE_FORMAT,
    version: INVOICE_TEMPLATE_VERSION,
    page: {
      size: analysis.pageSize,
      orientation: analysis.orientation,
      widthPt: analysis.pageSize === "Letter" ? 612 : 595.28,
      heightPt: analysis.pageSize === "Letter" ? 792 : 841.89,
      margins: analysis.margins,
    },
    theme: modeTheme(analysis, mode),
    regions,
    table: {
      regionId: "line-items",
      columns,
      headerBackground: quantum ? "#111111" : mode === "advance" ? "#EEF2F7" : "#F3F4F6",
      headerTextColor: quantum ? "#FFFFFF" : "#111827",
      rowBorderColor: quantum ? "#111111" : analysis.borderColor || "#E5E7EB",
    },
    variables: [...DEFAULT_VARIABLES, "{{footer}}"],
    sampleData: sampleFromAnalysis(analysis),
    sourceMode: mode,
    layoutProfile: quantum ? "quantum-hire" : "generic",
    analysis: {
      summary: analysis.summary,
      confidence: analysis.confidence,
      layoutProfile: quantum ? "quantum-hire" : "generic",
      footer: analysis.footer || (quantum ? "Thank you\nFOR YOUR BUSINESS" : ""),
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

function cellValue(
  item: InvoiceSampleData["items"][number],
  binding: string,
): string {
  if (binding === "date") return item.date || "";
  if (binding === "description") return item.description;
  if (binding === "quantity") return String(item.quantity);
  if (binding === "unitPrice") return `$${formatMoney(item.unitPrice)}`;
  if (binding === "tax") return `$${formatMoney(item.tax)}`;
  if (binding === "lineSubtotal") return `$${formatMoney(item.quantity * item.unitPrice)}`;
  if (binding === "total") return `$${formatMoney(item.total)}`;
  return "";
}

/** Full-page HTML preview with data-region attributes for editing. */
export function renderInvoiceHtml(
  template: InvoiceTemplate,
  data: InvoiceSampleData = template.sampleData,
): string {
  const t = template.theme;
  const pageW = template.page.widthPt;
  const pageH = template.page.heightPt;
  const quantum = template.layoutProfile === "quantum-hire";
  const footerText =
    (typeof template.analysis?.footer === "string" && template.analysis.footer) ||
    (quantum
      ? "Thank you\nFOR YOUR BUSINESS"
      : `${data.company.name} · Thank you for your business`);

  const rows = data.items
    .map((item) => {
      const cells = template.table.columns
        .map((c) => {
          const cls = c.align === "right" ? "num" : "";
          return `<td class="${cls}">${escapeHtml(cellValue(item, c.binding))}</td>`;
        })
        .join("");
      return `<tr>${cells}</tr>`;
    })
    .join("");

  if (quantum) {
    const fromLines = [
      data.company.phone ? `M: ${data.company.phone}` : "",
      data.company.email ? `E: ${data.company.email}` : "",
      data.company.abn ? `ABN: ${data.company.abn}` : "",
    ]
      .filter(Boolean)
      .join("\n");
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<title>${escapeHtml(data.invoice.title)} ${escapeHtml(data.invoice.number)}</title>
<style>
  @page { size: ${template.page.size} ${template.page.orientation}; margin: 0; }
  * { box-sizing: border-box; }
  body { margin: 0; background: #d9ddd9; font-family: Helvetica, Arial, sans-serif; color: ${t.textColor}; }
  .page {
    width: ${pageW}pt; min-height: ${pageH}pt; margin: 24px auto; background: ${t.backgroundColor};
    padding: ${template.page.margins.top}pt ${template.page.margins.right}pt ${template.page.margins.bottom}pt ${template.page.margins.left}pt;
    position: relative; box-shadow: 0 12px 40px rgba(15,42,37,0.14);
  }
  .top { display: flex; justify-content: space-between; align-items: flex-start; gap: 28px; }
  .brand-stack { display: flex; align-items: stretch; gap: 18px; max-width: 58%; }
  .qh-mark {
    width: 160px; min-height: 120px; background: transparent; color: ${t.primaryColor};
    display: flex; align-items: flex-start; justify-content: flex-start; font-weight: 700; font-size: 28px;
  }
  .qh-mark img { max-width: 160px; max-height: 140px; object-fit: contain; }
  .header-vdiv { width: 1px; background: #C8C8C8; align-self: stretch; min-height: 110px; }
  .title-block { text-align: left; min-width: 210px; padding-top: 4px; }
  .title-block h1 { margin: 0 0 12px; font-size: 22px; letter-spacing: 0.04em; font-weight: 800; }
  .title-block .meta-row { display: grid; grid-template-columns: 120px 1fr; gap: 8px; font-size: 10px; line-height: 1.7; margin-bottom: 2px; }
  .title-block .meta-row .lab { font-weight: 700; }
  .rule { border: 0; border-top: 1px solid #C8C8C8; margin: 18px 0; }
  .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; align-items: start; }
  .section-label { font-size: 11px; font-weight: 700; margin: 0 0 8px; letter-spacing: 0.04em; }
  .party-name { font-size: 12px; font-weight: 700; color: #111; margin: 0 0 6px; }
  .muted { color: #222; font-size: 11px; line-height: 1.5; white-space: pre-line; }
  table.items { width: 100%; border-collapse: collapse; font-size: 10px; margin-top: 4px; }
  table.items th {
    background: ${template.table.headerBackground}; color: ${template.table.headerTextColor};
    text-align: left; padding: 9px 6px; font-weight: 700;
  }
  table.items th.num, table.items td.num { text-align: right; }
  table.items th.center, table.items td.center { text-align: center; }
  table.items td { padding: 9px 6px; border-bottom: 1px solid #E5E5E5; vertical-align: top; }
  .bottom { display: grid; grid-template-columns: 1.15fr 1px 0.85fr; gap: 20px; margin-top: 28px; align-items: start; }
  .bottom-vdiv { background: #C8C8C8; width: 1px; min-height: 140px; }
  .totals .row { display: grid; grid-template-columns: 1fr auto; gap: 16px; font-size: 10px; margin-bottom: 8px; }
  .totals .row .lab { font-weight: 700; }
  .totals .grand-lab { font-size: 11px; font-weight: 700; margin-top: 10px; }
  .totals .grand { font-size: 28px; font-weight: 800; color: #111; margin-top: 6px; line-height: 1; text-align: right; }
  .please { margin-top: 18px; }
  .please .section-label { margin-bottom: 4px; }
  .thanks-plain { margin-top: 10px; font-size: 11px; color: #333; }
  .thankyou {
    margin-top: 28px; text-align: right; font-family: "Times New Roman", Times, serif;
    font-style: italic; color: #9CA3AF; white-space: pre-line; line-height: 1.2;
  }
  .thankyou .line1 { font-size: 24px; display: block; }
  .thankyou .line2 { font-size: 10px; letter-spacing: 0.14em; display: block; margin-top: 4px; font-family: Helvetica, Arial, sans-serif; font-style: normal; color: #6B7280; }
  .mode-tag { position: absolute; top: 10px; left: 10px; font-size: 9px; letter-spacing: 0.08em; text-transform: uppercase; color: #888; }
</style>
</head>
<body>
  <article class="page" data-template-format="${template.format}" data-source-mode="${template.sourceMode}" data-layout="quantum-hire">
    <div class="mode-tag">${escapeHtml(template.sourceMode)} recreation</div>
    <div class="top">
      <div class="brand-stack">
        <div data-region="logo" data-binding="{{company.logo}}" class="qh-mark">
          ${data.company.logo ? `<img alt="Quantum Hire logo" src="${escapeHtml(data.company.logo)}"/>` : "QH"}
        </div>
        <div class="header-vdiv" data-region="header-vdivider" aria-hidden="true"></div>
      </div>
      <div class="title-block" data-region="title">
        <h1>${escapeHtml(data.invoice.title)}</h1>
        <div data-region="invoice-meta">
          <div class="meta-row"><span class="lab">INVOICE NUMBER:</span><span>#${escapeHtml(data.invoice.number)}</span></div>
          <div class="meta-row"><span class="lab">INVOICE DATE:</span><span>${escapeHtml(data.invoice.issueDate)}</span></div>
          <div class="meta-row"><span class="lab">DUE DATE:</span><span>${escapeHtml(data.invoice.dueDate)}</span></div>
          <div class="meta-row"><span class="lab">TERMS:</span><span>${escapeHtml(data.terms || "7 Days")}</span></div>
        </div>
      </div>
    </div>
    <hr class="rule" data-region="header-divider"/>
    <div class="parties">
      <div data-region="customer">
        <p class="section-label">BILL TO:</p>
        <p class="party-name">${escapeHtml(data.customer.name)}</p>
        <div class="muted">${escapeHtml(data.customer.address)}
${escapeHtml(data.customer.email)}</div>
      </div>
      <div data-region="company">
        <p class="section-label">FROM:</p>
        <p class="party-name">${escapeHtml(data.company.name)}</p>
        <div class="muted">${escapeHtml(fromLines)}</div>
      </div>
    </div>
    <hr class="rule" data-region="parties-divider"/>
    <div data-region="table" data-binding="{{items}}">
      <table class="items">
        <thead>
          <tr>
            ${template.table.columns
              .map((c) => {
                const cls =
                  c.align === "right" ? "num" : c.align === "center" ? "center" : "";
                return `<th class="${cls}">${escapeHtml(c.header)}</th>`;
              })
              .join("")}
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <div class="bottom">
      <div data-region="payment">
        <p class="section-label">PAYMENT DETAILS:</p>
        <div class="muted">${escapeHtml(data.payment.instructions || "—")}</div>
        <div class="please">
          <p class="section-label">PLEASE NOTE:</p>
          <div class="muted">${escapeHtml(data.notes || "—")}</div>
          <div class="thanks-plain">Thank you for your business.</div>
        </div>
      </div>
      <div class="bottom-vdiv" data-region="parties-vdivider" aria-hidden="true"></div>
      <div class="totals" data-region="totals">
        <div class="row"><span class="lab">SUBTOTAL (EX GST):</span><span>$${formatMoney(data.subtotal)}</span></div>
        <div class="row"><span class="lab">GST (10%):</span><span>$${formatMoney(data.tax)}</span></div>
        <div class="grand-lab">TOTAL (INC GST):</div>
        <div class="grand">$${formatMoney(data.total)}</div>
        <div class="thankyou" data-region="footer">${
          footerText.includes("\n")
            ? footerText
                .split("\n")
                .map(
                  (line, i) =>
                    `<span class="line${i + 1}">${escapeHtml(line)}</span>`,
                )
                .join("")
            : `<span class="line1">${escapeHtml(footerText)}</span>`
        }</div>
      </div>
    </div>
  </article>
</body>
</html>`;
  }

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
      ${escapeHtml(footerText)}
    </div>
  </article>
</body>
</html>`;
}
