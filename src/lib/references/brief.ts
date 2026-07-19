import type { SupabaseClient } from "@supabase/supabase-js";
import {
  formatAnalysisForPrompt,
  VISUAL_ANALYSIS_UNAVAILABLE_MESSAGE,
  type ReferenceAnalysis,
} from "@/lib/references/analysis-types";
import { analysisOrEmpty } from "@/lib/references/analyse";
import { listProjectReferences, toBriefReferences } from "@/lib/references/service";
import type { LogoBrief, LogoReferenceBrief } from "@/types/logo";

export async function loadActiveReferences(
  supabase: SupabaseClient,
  projectId: string,
  ownerId: string,
  selectedIds?: string[] | null,
): Promise<LogoReferenceBrief[]> {
  const rows = await listProjectReferences(supabase, projectId, ownerId);
  const active = rows.filter((row) => {
    if (selectedIds?.length) return selectedIds.includes(row.id);
    return row.is_active;
  });
  return toBriefReferences(active);
}

export function withReferences(brief: LogoBrief, references: LogoReferenceBrief[]): LogoBrief {
  return { ...brief, references };
}

export function summarizeReferencesForPrompt(references: LogoReferenceBrief[] | undefined): string {
  if (!references?.length) return "";
  const lines = references.map((ref, index) => {
    const parts = [
      `${index + 1}. ${ref.filename} (${ref.kind}, ${ref.mimeType})`,
      ref.note ? `Note: ${ref.note}` : null,
      ref.extractedText ? `Extracted text: ${ref.extractedText.slice(0, 500)}` : null,
    ];

    if (ref.visuallyAnalysed) {
      const confirmed = analysisOrEmpty(ref.analysisConfirmed ?? ref.analysis) as ReferenceAnalysis;
      parts.push(formatAnalysisForPrompt(confirmed, Boolean(ref.analysisConfirmed)));
      if (ref.analysisProvider && ref.analysisModel) {
        parts.push(`Visual analysis via ${ref.analysisProvider}/${ref.analysisModel}`);
      }
      if (ref.pdfPagesProcessed?.length) {
        parts.push(`PDF pages processed: ${ref.pdfPagesProcessed.join(", ")}`);
      }
    } else if (ref.analysisStatus === "unavailable" || ref.analysisMode === "metadata_only") {
      parts.push(ref.analysisError || VISUAL_ANALYSIS_UNAVAILABLE_MESSAGE);
      parts.push("Image pixels were NOT visually analysed.");
    } else if (ref.analysisStatus === "failed") {
      parts.push(`Visual analysis failed: ${ref.analysisError || "unknown error"}`);
      parts.push("Falling back to filename and notes only.");
    } else if (ref.analysisStatus === "pending") {
      parts.push("Visual analysis still pending — using filename and notes only for now.");
    } else {
      parts.push("No visual analysis stored — using filename and notes only.");
    }

    if (ref.unsupportedReason) parts.push(`Limitation: ${ref.unsupportedReason}`);
    return parts.filter(Boolean).join(" — ");
  });

  return [
    "Client reference materials (do not copy trademarks literally):",
    ...lines,
  ].join("\n");
}
