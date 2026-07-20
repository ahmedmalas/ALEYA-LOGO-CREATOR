import { buildInvoiceTemplate, renderInvoiceHtml } from "@/lib/invoice/recreate";
import {
  invoiceAnalysisSchema,
  invoiceRecreationModes,
  invoiceSampleDataSchema,
} from "@/lib/invoice/types";
import { handleRouteError, jsonError, readJson } from "@/lib/security/api";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";

const schema = z.object({
  analysis: invoiceAnalysisSchema,
  mode: z.enum(invoiceRecreationModes).default("refine"),
  sampleData: invoiceSampleDataSchema.optional(),
});

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return jsonError("Unauthorized", 401);

    const body = await readJson(request, schema);
    const template = buildInvoiceTemplate(body.analysis, body.mode);
    const data = body.sampleData ?? template.sampleData;
    const html = renderInvoiceHtml(template, data);

    return NextResponse.json({
      documentType: "invoice",
      mode: body.mode,
      template,
      html,
      differentiation:
        body.mode === "mirror"
          ? "Recognisably the same invoice — structure, table, branding and totals preserved."
          : body.mode === "refine"
            ? "Same invoice identity — spacing, hierarchy, borders and print quality cleaned."
            : "Polished modern evolution of the uploaded invoice — brand identity retained.",
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
