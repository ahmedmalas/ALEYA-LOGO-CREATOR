import { z } from "zod";
import {
  invoiceAnalysisSchema,
  invoiceLineItemSchema,
  type InvoiceAnalysis,
} from "@/lib/invoice/types";
import { getVisionConfig } from "@/lib/references/vision";

const visionInvoiceSchema = invoiceAnalysisSchema.partial().extend({
  items: z.array(invoiceLineItemSchema).optional(),
});

function money(value: string | undefined): number {
  if (!value) return 0;
  const n = Number(value.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

/** Heuristic extraction from PDF/plain text — works without vision credits. */
export function analyseInvoiceFromText(text: string): InvoiceAnalysis {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const joined = lines.join("\n");
  const find = (re: RegExp) => joined.match(re)?.[1]?.trim() ?? "";

  const invoiceNumber =
    find(/invoice\s*(?:number|#|no\.?)\s*[:#]?\s*([A-Z0-9/-]+)/i) ||
    find(/\binvoice\s*#\s*[:#]?\s*([A-Z0-9/-]+)/i) ||
    find(/\b(INV[-/]?\d{3,})\b/i) ||
    find(/\b#\s*(\d{2,6})\b/);
  const issueDate =
    find(/(?:issue|invoice)\s*date\s*[:#]?\s*([0-9]{1,2}[/-][0-9]{1,2}[/-][0-9]{2,4}|[0-9]{4}-[0-9]{2}-[0-9]{2})/i) ||
    find(/\b(\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4})\b/);
  const dueDate = find(
    /due\s*date\s*[:#]?\s*([0-9]{1,2}[/-][0-9]{1,2}[/-][0-9]{2,4}|[0-9]{4}-[0-9]{2}-[0-9]{2}|\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4})/i,
  );

  const total = money(
    find(/total\s*(?:due|amount)?\s*[:$]?\s*\$?\s*([0-9,]+\.\d{2})/i),
  );
  const subtotal = money(find(/sub\s*-?total\s*[:$]?\s*\$?\s*([0-9,]+\.\d{2})/i));
  const tax = money(
    find(/(?:gst|tax|vat)\s*[:$]?\s*\$?\s*([0-9,]+\.\d{2})/i),
  );
  const discount = money(find(/discount\s*[:$]?\s*\$?\s*([0-9,]+\.\d{2})/i));

  // Line items: optional date + "Description  qty  price  total" heuristic rows
  const items: InvoiceAnalysis["items"] = [];
  const itemRe =
    /^(?:(\d{4}-\d{2}-\d{2}|\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\s+)?(.{6,80}?)\s+(\d+(?:\.\d+)?)\s+\$?([0-9,]+\.\d{2})\s+\$?([0-9,]+\.\d{2})$/;
  for (const line of lines) {
    const m = line.match(itemRe);
    if (!m) continue;
    const date = m[1]?.trim();
    const description = m[2]!.trim();
    if (/^(description|item|qty|quantity|unit|total|subtotal|date|rate|amount)/i.test(description))
      continue;
    const quantity = Number(m[3]);
    const unitPrice = money(m[4]);
    const lineTotal = money(m[5]);
    items.push({
      description,
      quantity,
      unitPrice,
      tax: 0,
      discount: 0,
      total: lineTotal || quantity * unitPrice,
      ...(date ? { date } : {}),
    });
  }

  // Prefer the first non-meta line as company (invoice issuer), not Bill-To party.
  const companyName =
    lines.find(
      (l) =>
        !/^(tax\s*)?invoice|bill\s*to|ship\s*to|description|payment|notes|terms|abn|issue|due/i.test(
          l,
        ) && l.length > 2,
    ) ||
    lines[0] ||
    "";
  const email = find(/([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})/i);
  const phone = find(/((?:\+?\d[\d\s()-]{7,}\d))/);
  const abn = find(/\bABN[:\s]*([0-9\s]{8,14})/i);

  const billIdx = lines.findIndex((l) => /bill\s*to|customer|client/i.test(l));
  const fromIdx = lines.findIndex((l) => /^from\b/i.test(l));
  const isPartyLabel = (l: string) =>
    /^(bill\s*to|from|ship\s*to|customer|client|payment|please\s*note|date|description|qty|rate|amount|terms|invoice)/i.test(
      l.replace(/:$/, ""),
    );
  const nextPartyName = (start: number) => {
    for (let i = start + 1; i < Math.min(start + 8, lines.length); i++) {
      const l = lines[i]!;
      if (!l || isPartyLabel(l)) continue;
      if (/^(m|e|abn|p):/i.test(l)) continue;
      return l;
    }
    return "";
  };
  const customerName = billIdx >= 0 ? nextPartyName(billIdx) : "";
  const customerAddress =
    billIdx >= 0
      ? lines
          .slice(billIdx + 1, billIdx + 8)
          .filter((l) => l && l !== customerName && !isPartyLabel(l) && !/^(m|e|abn):/i.test(l))
          .slice(0, 3)
          .join(", ")
      : "";
  const fromName = fromIdx >= 0 ? nextPartyName(fromIdx) : "";

  const paymentIdx = lines.findIndex((l) => /payment|bank|bsb|account/i.test(l));
  const paymentInstructions =
    paymentIdx >= 0 ? lines.slice(paymentIdx, paymentIdx + 5).join("\n") : "";

  const notesIdx = lines.findIndex((l) => /^notes?\b/i.test(l));
  const notes = notesIdx >= 0 ? lines.slice(notesIdx + 1, notesIdx + 3).join(" ") : "";

  const termsIdx = lines.findIndex((l) => /terms|conditions/i.test(l));
  const terms = termsIdx >= 0 ? lines.slice(termsIdx, termsIdx + 3).join(" ") : "";

  const computedSubtotal =
    subtotal || items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const computedTax = tax || Math.round(computedSubtotal * 0.1 * 100) / 100;
  const computedTotal = total || computedSubtotal + computedTax - discount;

  const quantum =
    /quantum\s*hire/i.test(joined) ||
    /cart\s*(n|and)\s*tip/i.test(joined) ||
    (/amount\s*\(?\s*ex\.?\s*gst\s*\)?/i.test(joined) &&
      /\bbill\s*to\b/i.test(joined) &&
      /\bfrom\b/i.test(joined));

  const resolvedCompany = quantum
    ? fromName || companyName || "Quantum Hire"
    : companyName;

  return invoiceAnalysisSchema.parse({
    pageSize: "A4",
    orientation: "portrait",
    margins: quantum
      ? { top: 40, right: 40, bottom: 40, left: 40 }
      : { top: 48, right: 48, bottom: 48, left: 48 },
    backgroundColor: "#FFFFFF",
    primaryColor: quantum ? "#0F2D26" : "#1F4D45",
    secondaryColor: quantum ? "#C4A35A" : "#B08A4F",
    textColor: "#111827",
    borderColor: quantum ? "#111111" : "#D1D5DB",
    companyName: resolvedCompany,
    companyAddress: lines.slice(1, 3).join(", "),
    companyEmail: email,
    companyPhone: phone,
    companyAbn: abn,
    hasLogo: /logo|\bqh\b/i.test(joined) || quantum,
    invoiceTitle: /tax\s*invoice/i.test(joined) ? "TAX INVOICE" : "INVOICE",
    invoiceNumber: invoiceNumber || "INV-001",
    issueDate: issueDate || new Date().toISOString().slice(0, 10),
    dueDate: dueDate || "",
    customerName,
    customerAddress,
    customerEmail: "",
    tableHeaders: quantum
      ? ["Date", "Description", "Quantity", "Rate", "Amount excl GST"]
      : ["Description", "Qty", "Unit", "Tax", "Total"],
    items:
      items.length > 0
        ? items
        : [
            {
              description: "Professional services",
              quantity: 1,
              unitPrice: computedSubtotal || 100,
              tax: computedTax || 10,
              discount: 0,
              total: computedTotal || 110,
            },
          ],
    subtotal: computedSubtotal,
    tax: computedTax,
    discount,
    total: computedTotal,
    paymentInstructions,
    bankDetails: paymentInstructions,
    notes,
    terms,
    footer: quantum
      ? "Thank you\nFOR YOUR BUSINESS"
      : companyName
        ? `Generated for ${companyName}`
        : "",
    typography: quantum ? "quantum-hire" : "sans-serif",
    layoutProfile: quantum ? "quantum-hire" : "generic",
    confidence: invoiceNumber || items.length ? 0.72 : 0.45,
    summary: `Invoice ${invoiceNumber || "draft"} for ${customerName || "customer"} — total ${computedTotal.toFixed(2)}`,
    rawTextExcerpt: lines.slice(0, 40).join("\n"),
  });
}

const INVOICE_VISION_PROMPT = `You analyse business invoices for reconstruction into editable templates.
Return ONLY valid JSON matching this shape (all fields strings/numbers/arrays as appropriate):
{
  "pageSize": "A4"|"Letter",
  "orientation": "portrait"|"landscape",
  "margins": {"top":number,"right":number,"bottom":number,"left":number},
  "backgroundColor": "#FFFFFF",
  "primaryColor": "#hex",
  "secondaryColor": "#hex",
  "textColor": "#hex",
  "borderColor": "#hex",
  "companyName": string,
  "companyAddress": string,
  "companyEmail": string,
  "companyPhone": string,
  "companyAbn": string,
  "hasLogo": boolean,
  "invoiceTitle": string,
  "invoiceNumber": string,
  "issueDate": string,
  "dueDate": string,
  "customerName": string,
  "customerAddress": string,
  "customerEmail": string,
  "shippingName": string,
  "shippingAddress": string,
  "tableHeaders": string[],
  "items": [{"description":string,"quantity":number,"unitPrice":number,"tax":number,"discount":number,"total":number}],
  "subtotal": number,
  "tax": number,
  "discount": number,
  "total": number,
  "paymentInstructions": string,
  "bankDetails": string,
  "notes": string,
  "terms": string,
  "footer": string,
  "typography": string,
  "confidence": number,
  "summary": string
}
Extract the COMPLETE invoice structure — not a logo. Preserve exact numbers and wording where visible.`;

export async function analyseInvoiceWithVision(input: {
  mimeType: string;
  base64: string;
  textHint?: string;
}): Promise<InvoiceAnalysis | null> {
  const vision = getVisionConfig();
  const apiKey = process.env.OPENAI_API_KEY || process.env.AI_GATEWAY_API_KEY || "";
  const baseUrl =
    process.env.OPENAI_BASE_URL ||
    (process.env.AI_GATEWAY_API_KEY && !process.env.OPENAI_API_KEY
      ? "https://ai-gateway.vercel.sh/v1"
      : "https://api.openai.com/v1");
  if (!vision.available || !apiKey || !vision.model) return null;

  try {
    const userText = [
      "Analyse this full-page invoice for template reconstruction.",
      input.textHint ? `Extracted text hint:\n${input.textHint.slice(0, 4000)}` : null,
    ]
      .filter(Boolean)
      .join("\n\n");

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: vision.model,
        temperature: 0.1,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: INVOICE_VISION_PROMPT },
          {
            role: "user",
            content: [
              { type: "text", text: userText },
              {
                type: "image_url",
                image_url: {
                  url: `data:${input.mimeType};base64,${input.base64}`,
                },
              },
            ],
          },
        ],
      }),
    });
    if (!response.ok) return null;
    const json = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = json.choices?.[0]?.message?.content;
    if (!content) return null;
    const parsed = visionInvoiceSchema.safeParse(JSON.parse(content));
    if (!parsed.success) return null;
    const fromText = analyseInvoiceFromText(input.textHint || "");
    return invoiceAnalysisSchema.parse({
      ...fromText,
      ...parsed.data,
      items: parsed.data.items?.length ? parsed.data.items : fromText.items,
      confidence: Math.max(fromText.confidence, Number(parsed.data.confidence ?? 0.8)),
      rawTextExcerpt: fromText.rawTextExcerpt,
    });
  } catch {
    return null;
  }
}

export async function analyseInvoiceDocument(input: {
  text?: string;
  mimeType?: string;
  base64?: string;
}): Promise<InvoiceAnalysis> {
  const textBase = analyseInvoiceFromText(input.text || "");
  if (input.base64 && input.mimeType) {
    const vision = await analyseInvoiceWithVision({
      mimeType: input.mimeType,
      base64: input.base64,
      textHint: input.text,
    });
    if (vision) return vision;
  }
  return textBase;
}
