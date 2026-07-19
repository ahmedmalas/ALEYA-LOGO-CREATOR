import type { SupabaseClient } from "@supabase/supabase-js";
import {
  emptyAnalysis,
  referenceAnalysisSchema,
  VISUAL_ANALYSIS_UNAVAILABLE_MESSAGE,
  type ReferenceAnalysis,
} from "@/lib/references/analysis-types";
import { REFERENCE_BUCKET, type ProjectReferenceRow } from "@/lib/references/service";
import {
  analyseImageWithVision,
  getVisionConfig,
  inferPdfPagesFromText,
} from "@/lib/references/vision";

async function downloadReferenceBuffer(
  supabase: SupabaseClient,
  storagePath: string,
): Promise<Buffer> {
  const { data, error } = await supabase.storage.from(REFERENCE_BUCKET).download(storagePath);
  if (error || !data) {
    throw new Error(error?.message || "Could not download reference file for analysis.");
  }
  return Buffer.from(await data.arrayBuffer());
}

async function rasterizeSvgToPngBase64(svgBuffer: Buffer): Promise<{ mimeType: string; base64: string }> {
  const sharp = (await import("sharp")).default;
  const png = await sharp(svgBuffer).png().resize(1024, 1024, { fit: "inside" }).toBuffer();
  return { mimeType: "image/png", base64: png.toString("base64") };
}

export async function analyseProjectReference(input: {
  supabase: SupabaseClient;
  ownerId: string;
  reference: ProjectReferenceRow;
}): Promise<ProjectReferenceRow> {
  const { supabase, ownerId, reference } = input;
  if (reference.owner_id !== ownerId) {
    throw new Error("Reference not found");
  }

  await supabase
    .from("project_references")
    .update({
      analysis_status: "pending",
      analysis_error: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", reference.id)
    .eq("owner_id", ownerId);

  const vision = getVisionConfig();
  const mime = reference.mime_type;
  const isImage = mime.startsWith("image/") && mime !== "image/svg+xml";
  const isSvg = mime === "image/svg+xml";
  const isPdf = mime === "application/pdf";

  if (!vision.available) {
    const { data } = await supabase
      .from("project_references")
      .update({
        analysis_status: "unavailable",
        analysis_mode: "metadata_only",
        analysis_json: null,
        analysis_provider: null,
        analysis_model: null,
        analysis_error: VISUAL_ANALYSIS_UNAVAILABLE_MESSAGE,
        pdf_pages_processed: isPdf ? inferPdfPagesFromText(reference.extracted_text) : [],
        analyzed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", reference.id)
      .eq("owner_id", ownerId)
      .select("*")
      .single();
    return data as ProjectReferenceRow;
  }

  try {
    const buffer = await downloadReferenceBuffer(supabase, reference.storage_path);
    let mimeType = mime;
    let base64: string;
    let pdfPages: number[] = [];

    if (isPdf) {
      // PDFs: use extracted text + a rendered notice page list. Full page rasterization
      // requires a PDF renderer not bundled here; we still mark processed pages honestly.
      pdfPages = inferPdfPagesFromText(reference.extracted_text);
      if (!reference.extracted_text?.trim()) {
        throw new Error(
          "PDF text/image extraction produced no content to analyse. Add a note or upload an image page.",
        );
      }
      // Build a simple text placard image so the vision model still receives an image payload
      // representing extracted PDF content (pages listed).
      const sharp = (await import("sharp")).default;
      const text = reference.extracted_text.slice(0, 1800).replace(/[<>&]/g, " ");
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1280">
        <rect width="100%" height="100%" fill="#f7f3ea"/>
        <text x="48" y="64" font-size="28" fill="#1f4d45">PDF pages ${pdfPages.join(", ")}</text>
        <foreignObject x="48" y="96" width="928" height="1120">
          <div xmlns="http://www.w3.org/1999/xhtml" style="font:20px sans-serif;color:#222;white-space:pre-wrap">${text}</div>
        </foreignObject>
      </svg>`;
      const png = await sharp(Buffer.from(svg)).png().toBuffer();
      mimeType = "image/png";
      base64 = png.toString("base64");
    } else if (isSvg) {
      const raster = await rasterizeSvgToPngBase64(buffer);
      mimeType = raster.mimeType;
      base64 = raster.base64;
    } else if (isImage) {
      base64 = buffer.toString("base64");
    } else {
      throw new Error("Unsupported file type for visual analysis.");
    }

    const result = await analyseImageWithVision({
      mimeType,
      base64,
      filename: reference.original_filename,
      kind: reference.kind,
      note: reference.note,
      extractedText: reference.extracted_text,
      pdfPagesProcessed: pdfPages,
    });

    const analysis: ReferenceAnalysis = {
      ...result.analysis,
      pdfPagesProcessed: pdfPages.length ? pdfPages : result.analysis.pdfPagesProcessed,
    };

    const { data, error } = await supabase
      .from("project_references")
      .update({
        analysis_status: "succeeded",
        analysis_mode: "visual",
        analysis_json: analysis,
        analysis_confirmed_json: reference.analysis_confirmed_json ?? analysis,
        analysis_provider: result.provider,
        analysis_model: result.model,
        analysis_error: null,
        pdf_pages_processed: analysis.pdfPagesProcessed,
        analyzed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", reference.id)
      .eq("owner_id", ownerId)
      .select("*")
      .single();
    if (error || !data) throw new Error(error?.message || "Could not save analysis");
    return data as ProjectReferenceRow;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Analysis failed";
    const unavailable = message.includes("unavailable");
    const { data } = await supabase
      .from("project_references")
      .update({
        analysis_status: unavailable ? "unavailable" : "failed",
        analysis_mode: "metadata_only",
        analysis_error: message,
        analyzed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", reference.id)
      .eq("owner_id", ownerId)
      .select("*")
      .single();
    return (data ?? reference) as ProjectReferenceRow;
  }
}

export function parseConfirmedAnalysis(raw: unknown): ReferenceAnalysis | null {
  if (!raw || typeof raw !== "object") return null;
  const parsed = referenceAnalysisSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

export function analysisOrEmpty(raw: unknown): ReferenceAnalysis {
  return parseConfirmedAnalysis(raw) ?? emptyAnalysis();
}
