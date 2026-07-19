import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import sharp from "sharp";
import type { InvoiceAnalysis, InvoiceSampleData } from "@/lib/invoice/types";
import { invoiceAnalysisSchema } from "@/lib/invoice/types";

/**
 * Cart N Tip #107 — Quantum Hire (QH) acceptance fixture.
 *
 * IMPORTANT: The owner's original `Cart N Tip #107.pdf` was not present in this
 * environment. This fixture reconstructs the approved Quantum Hire layout from
 * issue/acceptance criteria (QH branding, two-column header, black table header,
 * bill-to/from, payment/totals split, oversized total, handwritten thank-you)
 * so the pipeline can be exercised. It is NOT a byte-identical substitute for
 * the uploaded original and must not be claimed as visual proof against that file.
 */

export const CART_N_TIP_FIXTURE_NOTE =
  "Criteria-reconstructed Cart N Tip #107 (original PDF bytes unavailable in agent environment)";

export function cartNTip107Analysis(): InvoiceAnalysis {
  return invoiceAnalysisSchema.parse({
    pageSize: "A4",
    orientation: "portrait",
    margins: { top: 40, right: 40, bottom: 40, left: 40 },
    backgroundColor: "#FFFFFF",
    primaryColor: "#0F2D26",
    secondaryColor: "#C4A35A",
    textColor: "#111111",
    borderColor: "#111111",
    companyName: "Quantum Hire",
    companyAddress: "14 Industrial Circuit, Wetherill Park NSW 2164",
    companyEmail: "accounts@quantumhire.example",
    companyPhone: "+61 2 9600 4411",
    companyAbn: "51 634 228 910",
    hasLogo: true,
    invoiceTitle: "TAX INVOICE",
    invoiceNumber: "107",
    issueDate: "2026-06-30",
    dueDate: "2026-07-14",
    customerName: "Cart N Tip Pty Ltd",
    customerAddress: "22 Tip Road, Greystanes NSW 2145",
    customerEmail: "ap@cartntip.example",
    shippingName: "",
    shippingAddress: "",
    tableHeaders: ["Date", "Description", "Quantity", "Rate", "Amount excl GST"],
    items: [
      {
        description: "Day shift labour hire — tip truck operator",
        quantity: 8,
        unitPrice: 55,
        tax: 44,
        discount: 0,
        total: 440,
        date: "2026-06-23",
      },
      {
        description: "Night shift labour hire — tip truck operator",
        quantity: 8,
        unitPrice: 65,
        tax: 52,
        discount: 0,
        total: 520,
        date: "2026-06-24",
      },
      {
        description: "Day shift labour hire — tip truck operator",
        quantity: 8,
        unitPrice: 55,
        tax: 44,
        discount: 0,
        total: 440,
        date: "2026-06-25",
      },
      {
        description: "Day shift labour hire — tip truck operator",
        quantity: 8,
        unitPrice: 55,
        tax: 44,
        discount: 0,
        total: 440,
        date: "2026-06-26",
      },
      {
        description: "Night shift labour hire — tip truck operator",
        quantity: 4,
        unitPrice: 45,
        tax: 18,
        discount: 0,
        total: 180,
        date: "2026-06-27",
      },
      {
        description: "Weekend call-out — site clean / tip run",
        quantity: 2,
        unitPrice: 40,
        tax: 8,
        discount: 0,
        total: 80,
        date: "2026-06-28",
      },
    ],
    subtotal: 2100,
    tax: 210,
    discount: 0,
    total: 2310,
    layoutProfile: "quantum-hire",
    paymentInstructions:
      "Account name: Quantum Hire Services Pty Ltd\nBSB: 062-000\nAccount: 1098 7765\nReference: 107",
    bankDetails: "BSB 062-000  Account 1098 7765",
    notes: "Labour hire for Cart N Tip operations — June 2026.",
    terms: "Payment due within 14 days.",
    footer: "Thank you",
    typography: "quantum-hire",
    confidence: 0.92,
    summary: "Quantum Hire TAX INVOICE #107 for Cart N Tip Pty Ltd — total 2310.00",
    rawTextExcerpt:
      "Quantum Hire TAX INVOICE 107 Cart N Tip Pty Ltd BILL TO FROM Date Description Quantity Rate Amount excl GST Thank you",
  });
}

export function cartNTip107SampleData(): InvoiceSampleData {
  const a = cartNTip107Analysis();
  return {
    company: {
      name: a.companyName,
      logo: "assets/logo.png",
      address: a.companyAddress,
      email: a.companyEmail,
      phone: a.companyPhone,
      abn: a.companyAbn,
    },
    customer: {
      name: a.customerName,
      address: a.customerAddress,
      email: a.customerEmail,
    },
    invoice: {
      number: a.invoiceNumber,
      issueDate: a.issueDate,
      dueDate: a.dueDate,
      title: a.invoiceTitle,
    },
    items: a.items,
    subtotal: a.subtotal,
    tax: a.tax,
    discount: a.discount,
    total: a.total,
    payment: { instructions: a.paymentInstructions },
    notes: a.notes,
    terms: a.terms,
  };
}

export function cartNTip107PlainText(): string {
  const a = cartNTip107Analysis();
  return [
    "Quantum Hire",
    a.companyAddress,
    `ABN: ${a.companyAbn}`,
    a.companyEmail,
    a.companyPhone,
    "TAX INVOICE",
    `Invoice Number: ${a.invoiceNumber}`,
    `Invoice Date: ${a.issueDate}`,
    `Due Date: ${a.dueDate}`,
    `Payment Terms: ${a.terms}`,
    "BILL TO",
    a.customerName,
    a.customerAddress,
    a.customerEmail,
    "FROM",
    a.companyName,
    a.companyAddress,
    `ABN: ${a.companyAbn}`,
    "Date Description Quantity Rate Amount excl GST",
    ...a.items.map(
      (item) =>
        `${item.date ?? ""} ${item.description} ${item.quantity} $${item.unitPrice.toFixed(2)} $${(item.quantity * item.unitPrice).toFixed(2)}`,
    ),
    `Subtotal: $${a.subtotal.toFixed(2)}`,
    `GST: $${a.tax.toFixed(2)}`,
    `Total: $${a.total.toFixed(2)}`,
    "Payment details",
    a.paymentInstructions,
    "Notes",
    a.notes,
    "Thank you",
  ].join("\n");
}

function qhLogoSvg(size = 120): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${Math.round(size * 0.55)}" viewBox="0 0 120 66">
  <rect x="2" y="2" width="116" height="62" rx="6" fill="#0F2D26"/>
  <text x="60" y="44" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="34" font-weight="700" fill="#C4A35A">QH</text>
</svg>`;
}

/** Raster original page matching the QH / Cart N Tip acceptance layout. */
export async function renderCartNTip107Png(): Promise<Buffer> {
  const a = cartNTip107Analysis();
  const rows = a.items
    .map((item, i) => {
      const y = 430 + i * 28;
      const excl = item.quantity * item.unitPrice;
      return `
      <text x="48" y="${y}" font-size="11" fill="#111">${item.date ?? ""}</text>
      <text x="120" y="${y}" font-size="11" fill="#111">${escapeXml(item.description)}</text>
      <text x="420" y="${y}" font-size="11" text-anchor="end" fill="#111">${item.quantity}</text>
      <text x="490" y="${y}" font-size="11" text-anchor="end" fill="#111">${item.unitPrice.toFixed(2)}</text>
      <text x="560" y="${y}" font-size="11" text-anchor="end" fill="#111">${excl.toFixed(2)}</text>`;
    })
    .join("");

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="595" height="842" viewBox="0 0 595 842">
  <rect width="595" height="842" fill="#FFFFFF"/>
  <g transform="translate(40,36)">${qhLogoSvg(110)}</g>
  <text x="555" y="58" text-anchor="end" font-family="Helvetica, Arial, sans-serif" font-size="22" font-weight="700" fill="#111">TAX INVOICE</text>
  <text x="555" y="82" text-anchor="end" font-size="11" fill="#333">Invoice #: ${a.invoiceNumber}</text>
  <text x="555" y="98" text-anchor="end" font-size="11" fill="#333">Invoice Date: ${a.issueDate}</text>
  <text x="555" y="114" text-anchor="end" font-size="11" fill="#333">Due Date: ${a.dueDate}</text>
  <text x="555" y="130" text-anchor="end" font-size="11" fill="#333">Terms: 14 days</text>
  <line x1="40" y1="150" x2="555" y2="150" stroke="#111" stroke-width="1.25"/>
  <text x="40" y="178" font-size="11" font-weight="700" fill="#111">BILL TO</text>
  <text x="40" y="198" font-size="12" font-weight="700" fill="#0F2D26">${escapeXml(a.customerName)}</text>
  <text x="40" y="216" font-size="11" fill="#333">${escapeXml(a.customerAddress)}</text>
  <text x="40" y="232" font-size="11" fill="#333">${escapeXml(a.customerEmail)}</text>
  <text x="320" y="178" font-size="11" font-weight="700" fill="#111">FROM</text>
  <text x="320" y="198" font-size="12" font-weight="700" fill="#0F2D26">${escapeXml(a.companyName)}</text>
  <text x="320" y="216" font-size="11" fill="#333">${escapeXml(a.companyAddress)}</text>
  <text x="320" y="232" font-size="11" fill="#333">ABN ${escapeXml(a.companyAbn)}</text>
  <text x="320" y="248" font-size="11" fill="#333">${escapeXml(a.companyPhone)}</text>
  <line x1="40" y1="270" x2="555" y2="270" stroke="#111" stroke-width="1"/>
  <rect x="40" y="290" width="515" height="26" fill="#111"/>
  <text x="48" y="308" font-size="10" font-weight="700" fill="#FFF">Date</text>
  <text x="120" y="308" font-size="10" font-weight="700" fill="#FFF">Description</text>
  <text x="420" y="308" font-size="10" font-weight="700" text-anchor="end" fill="#FFF">Quantity</text>
  <text x="490" y="308" font-size="10" font-weight="700" text-anchor="end" fill="#FFF">Rate</text>
  <text x="555" y="308" font-size="10" font-weight="700" text-anchor="end" fill="#FFF">Amount excl GST</text>
  ${rows}
  <line x1="40" y1="620" x2="555" y2="620" stroke="#111" stroke-width="1"/>
  <text x="40" y="650" font-size="11" font-weight="700" fill="#111">PAYMENT DETAILS</text>
  <text x="40" y="670" font-size="11" fill="#333">Account name: Quantum Hire Services Pty Ltd</text>
  <text x="40" y="686" font-size="11" fill="#333">BSB: 062-000</text>
  <text x="40" y="702" font-size="11" fill="#333">Account: 1098 7765</text>
  <text x="40" y="718" font-size="11" fill="#333">Reference: 107</text>
  <text x="555" y="650" text-anchor="end" font-size="11" fill="#333">Subtotal</text>
  <text x="555" y="668" text-anchor="end" font-size="11" fill="#333">$${a.subtotal.toFixed(2)}</text>
  <text x="555" y="690" text-anchor="end" font-size="11" fill="#333">GST (10%)</text>
  <text x="555" y="708" text-anchor="end" font-size="11" fill="#333">$${a.tax.toFixed(2)}</text>
  <text x="555" y="748" text-anchor="end" font-family="Helvetica, Arial, sans-serif" font-size="28" font-weight="700" fill="#0F2D26">$${a.total.toFixed(2)}</text>
  <text x="555" y="768" text-anchor="end" font-size="10" fill="#666">TOTAL INC GST</text>
  <text x="297" y="810" text-anchor="middle" font-family="Times, 'Times New Roman', serif" font-size="28" font-style="italic" fill="#0F2D26">Thank you</text>
</svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

export async function renderCartNTip107LogoPng(): Promise<Buffer> {
  return sharp(Buffer.from(qhLogoSvg(240))).png().toBuffer();
}

/** True PDF original for /invoices upload + MuPDF analysis. */
export async function buildCartNTip107Pdf(): Promise<Buffer> {
  const a = cartNTip107Analysis();
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]);
  const helvetica = await pdf.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const timesItalic = await pdf.embedFont(StandardFonts.TimesRomanItalic);
  const dark = rgb(0.06, 0.18, 0.15);
  const black = rgb(0.07, 0.07, 0.07);
  const muted = rgb(0.25, 0.25, 0.25);
  const white = rgb(1, 1, 1);
  const gold = rgb(0.77, 0.64, 0.35);

  // QH mark
  page.drawRectangle({ x: 40, y: 760, width: 70, height: 40, color: dark });
  page.drawText("QH", {
    x: 52,
    y: 772,
    size: 22,
    font: helveticaBold,
    color: gold,
  });

  page.drawText("TAX INVOICE", {
    x: 400,
    y: 790,
    size: 20,
    font: helveticaBold,
    color: black,
  });
  const meta = [
    `Invoice #: ${a.invoiceNumber}`,
    `Invoice Date: ${a.issueDate}`,
    `Due Date: ${a.dueDate}`,
    "Terms: 14 days",
  ];
  meta.forEach((line, i) => {
    page.drawText(line, {
      x: 360,
      y: 770 - i * 14,
      size: 10,
      font: helvetica,
      color: muted,
    });
  });

  page.drawLine({
    start: { x: 40, y: 745 },
    end: { x: 555, y: 745 },
    thickness: 1.25,
    color: black,
  });

  page.drawText("BILL TO", { x: 40, y: 720, size: 10, font: helveticaBold, color: black });
  page.drawText(a.customerName, { x: 40, y: 704, size: 11, font: helveticaBold, color: dark });
  page.drawText(a.customerAddress, { x: 40, y: 688, size: 10, font: helvetica, color: muted });
  page.drawText(a.customerEmail, { x: 40, y: 674, size: 10, font: helvetica, color: muted });

  page.drawText("FROM", { x: 320, y: 720, size: 10, font: helveticaBold, color: black });
  page.drawText(a.companyName, { x: 320, y: 704, size: 11, font: helveticaBold, color: dark });
  page.drawText(a.companyAddress, { x: 320, y: 688, size: 10, font: helvetica, color: muted });
  page.drawText(`ABN ${a.companyAbn}`, { x: 320, y: 674, size: 10, font: helvetica, color: muted });
  page.drawText(a.companyPhone, { x: 320, y: 660, size: 10, font: helvetica, color: muted });

  page.drawLine({
    start: { x: 40, y: 645 },
    end: { x: 555, y: 645 },
    thickness: 1,
    color: black,
  });

  page.drawRectangle({ x: 40, y: 612, width: 515, height: 22, color: black });
  const headers: Array<{ t: string; x: number }> = [
    { t: "Date", x: 48 },
    { t: "Description", x: 110 },
    { t: "Quantity", x: 360 },
    { t: "Rate", x: 430 },
    { t: "Amount excl GST", x: 480 },
  ];
  for (const h of headers) {
    page.drawText(h.t, { x: h.x, y: 618, size: 9, font: helveticaBold, color: white });
  }

  let y = 590;
  for (const item of a.items) {
    const excl = item.quantity * item.unitPrice;
    page.drawText(item.date ?? "", { x: 48, y, size: 9, font: helvetica, color: black });
    page.drawText(item.description.slice(0, 42), {
      x: 110,
      y,
      size: 9,
      font: helvetica,
      color: black,
    });
    page.drawText(String(item.quantity), { x: 380, y, size: 9, font: helvetica, color: black });
    page.drawText(item.unitPrice.toFixed(2), { x: 430, y, size: 9, font: helvetica, color: black });
    page.drawText(excl.toFixed(2), { x: 500, y, size: 9, font: helvetica, color: black });
    y -= 20;
  }

  page.drawLine({
    start: { x: 40, y: 250 },
    end: { x: 555, y: 250 },
    thickness: 1,
    color: black,
  });

  page.drawText("PAYMENT DETAILS", {
    x: 40,
    y: 220,
    size: 10,
    font: helveticaBold,
    color: black,
  });
  const pay = [
    "Account name: Quantum Hire Services Pty Ltd",
    "BSB: 062-000",
    "Account: 1098 7765",
    "Reference: 107",
  ];
  pay.forEach((line, i) => {
    page.drawText(line, {
      x: 40,
      y: 200 - i * 14,
      size: 10,
      font: helvetica,
      color: muted,
    });
  });

  page.drawText("Subtotal", { x: 430, y: 220, size: 10, font: helvetica, color: muted });
  page.drawText(`$${a.subtotal.toFixed(2)}`, {
    x: 500,
    y: 220,
    size: 10,
    font: helvetica,
    color: black,
  });
  page.drawText("GST (10%)", { x: 430, y: 200, size: 10, font: helvetica, color: muted });
  page.drawText(`$${a.tax.toFixed(2)}`, {
    x: 500,
    y: 200,
    size: 10,
    font: helvetica,
    color: black,
  });
  page.drawText(`$${a.total.toFixed(2)}`, {
    x: 430,
    y: 155,
    size: 26,
    font: helveticaBold,
    color: dark,
  });
  page.drawText("TOTAL INC GST", {
    x: 450,
    y: 138,
    size: 9,
    font: helvetica,
    color: muted,
  });

  page.drawText("Thank you", {
    x: 230,
    y: 70,
    size: 26,
    font: timesItalic,
    color: dark,
  });

  return Buffer.from(await pdf.save());
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
