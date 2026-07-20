import { analyseInvoiceDocument } from "@/lib/invoice/analyse-invoice";
import {
  cartNTip107Analysis,
  cartNTip107PlainText,
} from "@/lib/invoice/cart-n-tip-fixture";
import { northwindInvoiceAnalysis, northwindInvoicePlainText } from "@/lib/invoice/fixture";
import { preparePdfForAnalysis } from "@/lib/references/pdf";
import { handleRouteError, jsonError } from "@/lib/security/api";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Analyse an uploaded invoice (multipart) or run a known fixture when
 * `?fixture=northwind|cart-n-tip-107` is provided (proof / demo path).
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return jsonError("Unauthorized", 401);

    const url = new URL(request.url);
    const fixture = url.searchParams.get("fixture");
    if (fixture === "northwind") {
      const analysis = northwindInvoiceAnalysis();
      return NextResponse.json({
        documentType: "invoice",
        analysis,
        text: northwindInvoicePlainText(),
        source: "fixture",
      });
    }
    if (fixture === "cart-n-tip-107") {
      const analysis = cartNTip107Analysis();
      return NextResponse.json({
        documentType: "invoice",
        analysis,
        text: cartNTip107PlainText(),
        source: "fixture",
        fixtureNote:
          "Exact owner-uploaded Cart N Tip #107.pdf (Cart_N_Tip__107_111b.pdf)",
      });
    }

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return jsonError("Expected multipart file field named file", 400);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const mimeType = file.type || "application/octet-stream";
    let text = "";
    let pageMime = mimeType;
    let pageBase64: string | undefined;

    if (mimeType === "application/pdf") {
      const prepared = await preparePdfForAnalysis(buffer);
      text = prepared.text || "";
      if (prepared.pagePng) {
        pageMime = "image/png";
        pageBase64 = prepared.pagePng.toString("base64");
      }
    } else if (mimeType.startsWith("image/")) {
      pageBase64 = buffer.toString("base64");
    } else {
      text = buffer.toString("utf8");
    }

    const analysis = await analyseInvoiceDocument({
      text,
      mimeType: pageBase64 ? pageMime : undefined,
      base64: pageBase64,
    });

    return NextResponse.json({
      documentType: "invoice",
      analysis,
      text,
      source: "upload",
      filename: file.name,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
