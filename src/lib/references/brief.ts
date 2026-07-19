import type { SupabaseClient } from "@supabase/supabase-js";
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
      ref.unsupportedReason ? `Limitation: ${ref.unsupportedReason}` : null,
    ].filter(Boolean);
    return parts.join(" — ");
  });
  return [
    "Visual reference materials supplied by the client (use as inspiration, do not copy trademarks literally):",
    ...lines,
  ].join("\n");
}
