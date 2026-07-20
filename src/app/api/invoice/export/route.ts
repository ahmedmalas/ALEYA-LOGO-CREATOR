import { buildInvoiceTemplatePackage } from "@/lib/invoice/export-package";
import { buildInvoiceTemplate, renderInvoiceHtml } from "@/lib/invoice/recreate";
import {
  invoiceAnalysisSchema,
  invoiceRecreationModes,
  invoiceTemplateSchema,
} from "@/lib/invoice/types";
import { handleRouteError, jsonError, readJson } from "@/lib/security/api";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";

const schema = z.object({
  analysis: invoiceAnalysisSchema.optional(),
  template: invoiceTemplateSchema.optional(),
  mode: z.enum(invoiceRecreationModes).default("refine"),
  logoPngBase64: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return jsonError("Unauthorized", 401);

    const body = await readJson(request, schema);
    const template =
      body.template ??
      (body.analysis
        ? buildInvoiceTemplate(body.analysis, body.mode)
        : null);
    if (!template) return jsonError("Provide analysis or template", 400);

    const logoPng = body.logoPngBase64
      ? Buffer.from(body.logoPngBase64, "base64")
      : null;
    const html = renderInvoiceHtml(template);
    const pkg = await buildInvoiceTemplatePackage({
      template,
      logoPng,
      htmlPreview: html,
    });

    return new NextResponse(new Uint8Array(pkg.zipBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${pkg.filename}"`,
        "X-Aleya-Template-Format": pkg.manifest.format,
        "X-Aleya-Template-Version": pkg.manifest.version,
      },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
