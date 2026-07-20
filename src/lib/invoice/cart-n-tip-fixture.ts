/**
 * Cart N Tip #107 — Quantum Hire (QH) acceptance fixture.
 *
 * Backed by the exact owner-uploaded PDF copied to:
 *   fixtures/invoices/Cart N Tip #107.pdf
 * Source upload: Cart_N_Tip__107_111b.pdf
 */
import type { InvoiceAnalysis, InvoiceSampleData } from "@/lib/invoice/types";
import {
  extractRealQhLogoArtwork,
  loadRealCartNTip107Pdf,
  rasterRealCartNTip107,
  realCartNTip107Analysis,
  realCartNTip107SampleData,
} from "@/lib/invoice/cart-n-tip-real";

export const CART_N_TIP_FIXTURE_NOTE =
  "Exact owner-uploaded Cart N Tip #107.pdf (Cart_N_Tip__107_111b.pdf)";

export function cartNTip107Analysis(): InvoiceAnalysis {
  return realCartNTip107Analysis();
}

export function cartNTip107SampleData(logoDataUrl?: string): InvoiceSampleData {
  return realCartNTip107SampleData(logoDataUrl);
}

export function cartNTip107PlainText(): string {
  const a = cartNTip107Analysis();
  return [
    "TAX INVOICE",
    "INVOICE NUMBER:",
    `#${a.invoiceNumber}`,
    "INVOICE DATE:",
    a.issueDate,
    "DUE DATE:",
    a.dueDate,
    "TERMS:",
    a.terms,
    "BILL TO:",
    a.customerName,
    "FROM:",
    a.companyName,
    `M: ${a.companyPhone}`,
    `E: ${a.companyEmail}`,
    `ABN: ${a.companyAbn}`,
    "DATE",
    "DESCRIPTION",
    "QTY",
    "RATE",
    "AMOUNT (EX GST)",
    ...a.items.map(
      (item) =>
        `${item.date ?? ""}\n${item.description}\n${item.quantity}\n$${item.unitPrice.toFixed(2)}\n$${item.total.toFixed(2)}`,
    ),
    "PAYMENT DETAILS:",
    a.paymentInstructions,
    "PLEASE NOTE:",
    a.notes,
    "Thank you for your business.",
    "SUBTOTAL (EX GST):",
    `$${a.subtotal.toLocaleString("en-AU", { minimumFractionDigits: 2 })}`,
    "GST (10%):",
    `$${a.tax.toLocaleString("en-AU", { minimumFractionDigits: 2 })}`,
    "TOTAL (INC GST):",
    `$${a.total.toLocaleString("en-AU", { minimumFractionDigits: 2 })}`,
    "Thank you",
    "FOR YOUR BUSINESS",
  ].join("\n");
}

/** Raster of the real uploaded PDF page 1. */
export async function renderCartNTip107Png(): Promise<Buffer> {
  const { png } = await rasterRealCartNTip107(3);
  return png;
}

/** Real QH logo artwork cropped from the original page (not generated text). */
export async function renderCartNTip107LogoPng(): Promise<Buffer> {
  return extractRealQhLogoArtwork();
}

/** Exact uploaded PDF bytes. */
export async function buildCartNTip107Pdf(): Promise<Buffer> {
  return loadRealCartNTip107Pdf();
}
