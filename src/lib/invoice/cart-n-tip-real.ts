import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import type { InvoiceAnalysis, InvoiceSampleData } from "@/lib/invoice/types";
import { invoiceAnalysisSchema } from "@/lib/invoice/types";

/** Canonical path to the owner-uploaded original (copied into fixtures/). */
export const REAL_CART_N_TIP_107_PDF =
  path.join(process.cwd(), "fixtures/invoices/Cart N Tip #107.pdf");

export const REAL_UPLOAD_SOURCE =
  "/home/ubuntu/.cursor/projects/workspace/uploads/Cart_N_Tip__107_111b.pdf";

async function loadMupdf() {
  return import("mupdf");
}

/** Analysis matching the exact uploaded Cart N Tip #107.pdf. */
export function realCartNTip107Analysis(): InvoiceAnalysis {
  return invoiceAnalysisSchema.parse({
    pageSize: "A4",
    orientation: "portrait",
    margins: { top: 36, right: 40, bottom: 36, left: 40 },
    backgroundColor: "#FFFFFF",
    primaryColor: "#0B1F3A",
    secondaryColor: "#111111",
    textColor: "#111111",
    borderColor: "#C8C8C8",
    companyName: "Quantum Hire Services Pty Ltd",
    companyAddress: "",
    companyEmail: "info@quantumhireservices.com.au",
    companyPhone: "0410 760 760",
    companyAbn: "26 641 770 130",
    hasLogo: true,
    invoiceTitle: "TAX INVOICE",
    invoiceNumber: "107",
    issueDate: "06/07/2026",
    dueDate: "13/07/2026",
    customerName: "Cart and Tip Pty Ltd",
    customerAddress: "",
    customerEmail: "",
    shippingName: "",
    shippingAddress: "",
    tableHeaders: ["DATE", "DESCRIPTION", "QTY", "RATE", "AMOUNT (EX GST)"],
    items: [
      { description: "Labour Hire - Day Shift", quantity: 1, unitPrice: 350, tax: 35, discount: 0, total: 350, date: "29/06/2026" },
      { description: "Labour Hire - Day Shift", quantity: 1, unitPrice: 350, tax: 35, discount: 0, total: 350, date: "30/06/2026" },
      { description: "Labour Hire - Day Shift", quantity: 1, unitPrice: 350, tax: 35, discount: 0, total: 350, date: "01/07/2026" },
      { description: "Labour Hire - Day Shift", quantity: 1, unitPrice: 350, tax: 35, discount: 0, total: 350, date: "02/07/2026" },
      { description: "Labour Hire - Day Shift", quantity: 1, unitPrice: 350, tax: 35, discount: 0, total: 350, date: "03/07/2026" },
      { description: "Labour Hire - Night Shift", quantity: 1, unitPrice: 350, tax: 35, discount: 0, total: 350, date: "03/07/2026" },
    ],
    subtotal: 2100,
    tax: 210,
    discount: 0,
    total: 2310,
    paymentInstructions:
      "Account Name: Quantum Hire Services Pty Ltd\nBSB: 012347\nAccount Number: 814027296\nReference: INV-107",
    bankDetails: "BSB 012347  Account 814027296",
    notes: "Payment is required within 7 days from the invoice date.",
    terms: "7 Days",
    footer: "Thank you\nFOR YOUR BUSINESS",
    typography: "quantum-hire",
    layoutProfile: "quantum-hire",
    confidence: 0.98,
    summary: "Quantum Hire TAX INVOICE #107 for Cart and Tip Pty Ltd — total 2310.00",
    rawTextExcerpt:
      "TAX INVOICE #107 Cart and Tip Pty Ltd Quantum Hire Services BILL TO FROM DATE DESCRIPTION QTY RATE AMOUNT (EX GST) Thank you FOR YOUR BUSINESS",
  });
}

export function realCartNTip107SampleData(logoDataUrl?: string): InvoiceSampleData {
  const a = realCartNTip107Analysis();
  return {
    company: {
      name: a.companyName,
      logo: logoDataUrl || "assets/logo.png",
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

export function loadRealCartNTip107Pdf(): Buffer {
  if (existsSync(REAL_CART_N_TIP_107_PDF)) {
    return readFileSync(REAL_CART_N_TIP_107_PDF);
  }
  if (existsSync(REAL_UPLOAD_SOURCE)) {
    return readFileSync(REAL_UPLOAD_SOURCE);
  }
  throw new Error("Real Cart N Tip #107.pdf not found");
}

/** Rasterise page 1 of the real original at scale. */
export async function rasterRealCartNTip107(scale = 3): Promise<{
  png: Buffer;
  width: number;
  height: number;
  text: string;
}> {
  const buf = loadRealCartNTip107Pdf();
  const mupdf = await loadMupdf();
  const doc = mupdf.Document.openDocument(buf, "application/pdf");
  const page = doc.loadPage(0);
  const text = page.toStructuredText("preserve-whitespace").asText();
  const matrix = mupdf.Matrix.scale(scale, scale);
  const pixmap = page.toPixmap(matrix, mupdf.ColorSpace.DeviceRGB, false, true);
  const png = Buffer.from(pixmap.asPNG());
  return { png, width: pixmap.getWidth(), height: pixmap.getHeight(), text };
}

/**
 * Extract real QH logo artwork from the original page raster (not generated text).
 * Crops the top-left brand stack and trims white margins.
 */
export async function extractRealQhLogoArtwork(
  pagePng?: Buffer,
): Promise<Buffer> {
  const png = pagePng ?? (await rasterRealCartNTip107(4)).png;
  const meta = await sharp(png).metadata();
  const w = meta.width!;
  const h = meta.height!;
  // Brand stack occupies roughly left 28% × top 18% on this invoice.
  const region = await sharp(png)
    .extract({
      left: Math.round(w * 0.04),
      top: Math.round(h * 0.025),
      width: Math.round(w * 0.28),
      height: Math.round(h * 0.175),
    })
    .png()
    .toBuffer();
  return sharp(region).trim({ threshold: 14 }).png().toBuffer();
}

export function logoPngToDataUrl(png: Buffer): string {
  return `data:image/png;base64,${png.toString("base64")}`;
}
