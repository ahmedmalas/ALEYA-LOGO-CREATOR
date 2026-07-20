import sharp from "sharp";
import type { InvoiceAnalysis } from "@/lib/invoice/types";
import { invoiceAnalysisSchema } from "@/lib/invoice/types";

/** Canonical Northwind Tax Invoice used for end-to-end proofs. */
export function northwindInvoiceAnalysis(): InvoiceAnalysis {
  return invoiceAnalysisSchema.parse({
    pageSize: "A4",
    orientation: "portrait",
    margins: { top: 48, right: 48, bottom: 48, left: 48 },
    backgroundColor: "#FFFFFF",
    primaryColor: "#1F4D45",
    secondaryColor: "#B08A4F",
    textColor: "#111827",
    borderColor: "#D1D5DB",
    companyName: "Northwind Trading Co",
    companyAddress: "12 Harbour Street, Sydney NSW 2000",
    companyEmail: "accounts@northwind.example",
    companyPhone: "+61 2 9000 1200",
    companyAbn: "12 345 678 901",
    hasLogo: true,
    invoiceTitle: "TAX INVOICE",
    invoiceNumber: "INV-2026-0142",
    issueDate: "2026-07-01",
    dueDate: "2026-07-31",
    customerName: "Contoso Retail Pty Ltd",
    customerAddress: "88 Market Road, Melbourne VIC 3000",
    customerEmail: "ap@contoso.example",
    shippingName: "Contoso Warehouse",
    shippingAddress: "3 Dock Lane, Melbourne VIC 3000",
    tableHeaders: ["Description", "Qty", "Unit", "GST", "Total"],
    items: [
      {
        description: "Premium oak shelving unit",
        quantity: 4,
        unitPrice: 220,
        tax: 88,
        discount: 0,
        total: 968,
      },
      {
        description: "Installation labour (half day)",
        quantity: 1,
        unitPrice: 480,
        tax: 48,
        discount: 0,
        total: 528,
      },
      {
        description: "Protective packing materials",
        quantity: 2,
        unitPrice: 35,
        tax: 7,
        discount: 0,
        total: 77,
      },
    ],
    subtotal: 1430,
    tax: 143,
    discount: 0,
    total: 1573,
    paymentInstructions:
      "Pay to Northwind Trading Co\nBSB 062-000  Account 1234 5678\nReference: INV-2026-0142",
    bankDetails: "BSB 062-000  Account 1234 5678",
    notes: "Goods remain property of Northwind until paid in full.",
    terms: "Payment due within 30 days. Late fees may apply.",
    footer: "Northwind Trading Co · Thank you for your business",
    typography: "serif-heading-sans-body",
    confidence: 0.95,
    summary: "Northwind TAX INVOICE INV-2026-0142 for Contoso — total 1573.00",
    rawTextExcerpt: "TAX INVOICE INV-2026-0142 Northwind Trading Co Contoso Retail",
  });
}

/** Raster “original invoice” page for side-by-side visual proofs. */
export async function renderNorthwindInvoicePng(): Promise<Buffer> {
  const a = northwindInvoiceAnalysis();
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="794" height="1123" viewBox="0 0 794 1123">
  <rect width="794" height="1123" fill="#FFFFFF"/>
  <circle cx="700" cy="90" r="36" fill="#1F4D45"/>
  <circle cx="700" cy="90" r="14" fill="#B08A4F"/>
  <text x="64" y="80" font-size="28" font-family="Georgia, serif" font-weight="700" fill="#1F4D45">${a.companyName}</text>
  <text x="64" y="108" font-size="12" font-family="Helvetica, sans-serif" fill="#4B5563">${a.companyAddress}</text>
  <text x="64" y="126" font-size="12" font-family="Helvetica, sans-serif" fill="#4B5563">${a.companyEmail} · ${a.companyPhone}</text>
  <text x="64" y="144" font-size="12" font-family="Helvetica, sans-serif" fill="#4B5563">ABN ${a.companyAbn}</text>
  <text x="520" y="160" text-anchor="end" font-size="22" font-family="Helvetica, sans-serif" font-weight="700" fill="#111827">${a.invoiceTitle}</text>
  <text x="520" y="184" text-anchor="end" font-size="12" font-family="Helvetica, sans-serif" fill="#111827">Invoice: ${a.invoiceNumber}</text>
  <text x="520" y="202" text-anchor="end" font-size="12" font-family="Helvetica, sans-serif" fill="#111827">Issue: ${a.issueDate}</text>
  <text x="520" y="220" text-anchor="end" font-size="12" font-family="Helvetica, sans-serif" fill="#111827">Due: ${a.dueDate}</text>
  <text x="64" y="260" font-size="13" font-family="Helvetica, sans-serif" font-weight="700" fill="#111827">Bill To</text>
  <text x="64" y="282" font-size="12" font-family="Helvetica, sans-serif" fill="#111827">${a.customerName}</text>
  <text x="64" y="300" font-size="12" font-family="Helvetica, sans-serif" fill="#4B5563">${a.customerAddress}</text>
  <text x="420" y="260" font-size="13" font-family="Helvetica, sans-serif" font-weight="700" fill="#111827">Ship To</text>
  <text x="420" y="282" font-size="12" font-family="Helvetica, sans-serif" fill="#111827">${a.shippingName}</text>
  <text x="420" y="300" font-size="12" font-family="Helvetica, sans-serif" fill="#4B5563">${a.shippingAddress}</text>
  <rect x="64" y="340" width="666" height="28" fill="#F3F4F6"/>
  <text x="76" y="359" font-size="11" font-family="Helvetica, sans-serif" fill="#6B7280">Description</text>
  <text x="420" y="359" font-size="11" font-family="Helvetica, sans-serif" fill="#6B7280">Qty</text>
  <text x="490" y="359" font-size="11" font-family="Helvetica, sans-serif" fill="#6B7280">Unit</text>
  <text x="570" y="359" font-size="11" font-family="Helvetica, sans-serif" fill="#6B7280">GST</text>
  <text x="650" y="359" font-size="11" font-family="Helvetica, sans-serif" fill="#6B7280">Total</text>
  ${a.items
    .map(
      (item, i) => {
        const y = 390 + i * 36;
        return `<text x="76" y="${y}" font-size="12" font-family="Helvetica, sans-serif" fill="#111827">${item.description}</text>
  <text x="420" y="${y}" font-size="12" font-family="Helvetica, sans-serif" fill="#111827">${item.quantity}</text>
  <text x="490" y="${y}" font-size="12" font-family="Helvetica, sans-serif" fill="#111827">${item.unitPrice.toFixed(2)}</text>
  <text x="570" y="${y}" font-size="12" font-family="Helvetica, sans-serif" fill="#111827">${item.tax.toFixed(2)}</text>
  <text x="650" y="${y}" font-size="12" font-family="Helvetica, sans-serif" fill="#111827">${item.total.toFixed(2)}</text>`;
      },
    )
    .join("\n")}
  <text x="650" y="560" text-anchor="end" font-size="12" font-family="Helvetica, sans-serif" fill="#111827">Subtotal: ${a.subtotal.toFixed(2)}</text>
  <text x="650" y="582" text-anchor="end" font-size="12" font-family="Helvetica, sans-serif" fill="#111827">GST: ${a.tax.toFixed(2)}</text>
  <text x="650" y="608" text-anchor="end" font-size="16" font-family="Helvetica, sans-serif" font-weight="700" fill="#1F4D45">Total: ${a.total.toFixed(2)}</text>
  <text x="64" y="680" font-size="13" font-family="Helvetica, sans-serif" font-weight="700" fill="#111827">Payment</text>
  <text x="64" y="702" font-size="12" font-family="Helvetica, sans-serif" fill="#4B5563">${a.paymentInstructions.replace(/\n/g, " · ")}</text>
  <text x="64" y="740" font-size="12" font-family="Helvetica, sans-serif" fill="#4B5563">${a.notes}</text>
  <text x="64" y="780" font-size="11" font-family="Helvetica, sans-serif" fill="#6B7280">${a.terms}</text>
  <text x="397" y="1040" text-anchor="middle" font-size="10" font-family="Helvetica, sans-serif" fill="#6B7280">${a.footer}</text>
</svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

export function northwindInvoicePlainText(): string {
  const a = northwindInvoiceAnalysis();
  return [
    a.companyName,
    a.companyAddress,
    a.companyEmail,
    `ABN ${a.companyAbn}`,
    a.invoiceTitle,
    `Invoice Number: ${a.invoiceNumber}`,
    `Issue Date: ${a.issueDate}`,
    `Due Date: ${a.dueDate}`,
    "Bill To",
    a.customerName,
    a.customerAddress,
    "Description Qty Unit Total",
    ...a.items.map(
      (i) => `${i.description} ${i.quantity} $${i.unitPrice.toFixed(2)} $${i.total.toFixed(2)}`,
    ),
    `Subtotal: $${a.subtotal.toFixed(2)}`,
    `GST: $${a.tax.toFixed(2)}`,
    `Total: $${a.total.toFixed(2)}`,
    "Payment",
    a.paymentInstructions,
    "Notes",
    a.notes,
    a.terms,
  ].join("\n");
}
