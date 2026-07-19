import type { SupabaseClient } from "@supabase/supabase-js";
import { getUserPlanId } from "@/lib/plans/usage";
import { getReferenceLimits } from "@/lib/references/limits";
import {
  referenceStoragePath,
  sanitizeFilename,
  validateProjectCapacity,
  validateReferenceFile,
} from "@/lib/references/validate";

export const REFERENCE_BUCKET = "project-references";

export type ProjectReferenceRow = {
  id: string;
  project_id: string;
  owner_id: string;
  storage_path: string;
  original_filename: string;
  safe_filename: string;
  mime_type: string;
  size_bytes: number;
  title: string | null;
  note: string | null;
  is_active: boolean;
  kind: string;
  preview_path: string | null;
  extracted_text: string | null;
  analysis_status?: string;
  analysis_mode?: string | null;
  analysis_json?: Record<string, unknown> | null;
  analysis_confirmed_json?: Record<string, unknown> | null;
  analysis_provider?: string | null;
  analysis_model?: string | null;
  analysis_error?: string | null;
  pdf_pages_processed?: number[];
  analyzed_at?: string | null;
  created_at: string;
  updated_at: string;
};

export async function assertProjectOwner(
  supabase: SupabaseClient,
  projectId: string,
  ownerId: string,
) {
  const { data, error } = await supabase
    .from("logo_projects")
    .select("id, owner_id, business_name")
    .eq("id", projectId)
    .eq("owner_id", ownerId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) {
    const err = new Error("Project not found");
    (err as Error & { status: number }).status = 404;
    throw err;
  }
  return data;
}

export async function listProjectReferences(
  supabase: SupabaseClient,
  projectId: string,
  ownerId: string,
) {
  await assertProjectOwner(supabase, projectId, ownerId);
  const { data, error } = await supabase
    .from("project_references")
    .select("*")
    .eq("project_id", projectId)
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as ProjectReferenceRow[];
}

async function extractPdfText(buffer: Buffer): Promise<string | null> {
  try {
    // pdf-parse is CJS; default export is the parser function.
    const mod = await import("pdf-parse");
    const pdfParse =
      (mod as { default?: (b: Buffer) => Promise<{ text?: string }> }).default ??
      (mod as unknown as (b: Buffer) => Promise<{ text?: string }>);
    const parsed = await pdfParse(buffer);
    const text = (parsed.text ?? "").replace(/\s+/g, " ").trim().slice(0, 4000);
    return text || null;
  } catch {
    return null;
  }
}

function inferKind(mime: string, filename: string): string {
  const lower = filename.toLowerCase();
  if (lower.includes("receipt") || lower.includes("invoice")) return "receipt";
  if (lower.includes("sketch")) return "sketch";
  if (lower.includes("packag")) return "packaging";
  if (lower.includes("card")) return "business_card";
  if (lower.includes("logo")) return "logo";
  if (mime === "application/pdf") return "document";
  if (mime.startsWith("image/")) return "inspiration";
  return "other";
}

export async function uploadProjectReference(input: {
  supabase: SupabaseClient;
  ownerId: string;
  projectId: string;
  file: File | Blob;
  filename: string;
  mimeType: string;
  note?: string | null;
  title?: string | null;
  kind?: string | null;
}) {
  const { planId } = await getUserPlanId(input.supabase, input.ownerId);
  const limits = getReferenceLimits(planId);
  const fileMeta = {
    name: input.filename,
    type: input.mimeType,
    size: input.file.size,
  };
  const fileError = validateReferenceFile(fileMeta, limits);
  if (fileError) {
    const err = new Error(fileError.message);
    (err as Error & { status: number; code: string }).status = 400;
    (err as Error & { code: string }).code = fileError.code;
    throw err;
  }

  const existing = await listProjectReferences(input.supabase, input.projectId, input.ownerId);
  const userTotal = await input.supabase
    .from("project_references")
    .select("size_bytes")
    .eq("owner_id", input.ownerId);
  const currentTotalBytes = (userTotal.data ?? []).reduce(
    (sum, row) => sum + Number(row.size_bytes ?? 0),
    0,
  );
  const capacityError = validateProjectCapacity({
    currentCount: existing.length,
    incomingCount: 1,
    currentTotalBytes,
    incomingBytes: input.file.size,
    limits,
  });
  if (capacityError) {
    const err = new Error(capacityError.message);
    (err as Error & { status: number; code: string }).status = 400;
    (err as Error & { code: string }).code = capacityError.code;
    throw err;
  }

  const referenceId = crypto.randomUUID();
  const safeFilename = sanitizeFilename(input.filename);
  const storagePath = referenceStoragePath(
    input.ownerId,
    input.projectId,
    referenceId,
    safeFilename,
  );

  const buffer = Buffer.from(await input.file.arrayBuffer());
  let extractedText: string | null = null;
  if (input.mimeType === "application/pdf") {
    extractedText = await extractPdfText(buffer);
  }

  // Reject SVG with script tags (basic XSS guard for stored SVG).
  if (input.mimeType === "image/svg+xml") {
    const svgText = buffer.toString("utf8");
    if (/<script/i.test(svgText) || /\bon\w+=/i.test(svgText)) {
      const err = new Error("SVG references cannot include scripts or event handlers.");
      (err as Error & { status: number }).status = 400;
      throw err;
    }
  }

  const { error: uploadError } = await input.supabase.storage
    .from(REFERENCE_BUCKET)
    .upload(storagePath, buffer, {
      contentType: input.mimeType,
      upsert: false,
    });
  if (uploadError) {
    throw new Error(`Upload failed: ${uploadError.message}`);
  }

  const previewPath = input.mimeType.startsWith("image/") ? storagePath : null;
  const { data: row, error: insertError } = await input.supabase
    .from("project_references")
    .insert({
      id: referenceId,
      project_id: input.projectId,
      owner_id: input.ownerId,
      storage_path: storagePath,
      original_filename: input.filename,
      safe_filename: safeFilename,
      mime_type: input.mimeType,
      size_bytes: input.file.size,
      title: input.title?.trim() || input.filename,
      note: input.note?.trim() || null,
      kind: input.kind || inferKind(input.mimeType, input.filename),
      preview_path: previewPath,
      extracted_text: extractedText,
      is_active: true,
    })
    .select("*")
    .single();

  if (insertError || !row) {
    await input.supabase.storage.from(REFERENCE_BUCKET).remove([storagePath]);
    throw new Error(insertError?.message ?? "Could not save reference record");
  }

  await input.supabase.from("usage_events").insert({
    owner_id: input.ownerId,
    event_type: "reference_upload",
    project_id: input.projectId,
    metadata: { referenceId: referenceId, filename: input.filename, mimeType: input.mimeType },
  });

  return row as ProjectReferenceRow;
}

export async function deleteProjectReference(input: {
  supabase: SupabaseClient;
  ownerId: string;
  projectId: string;
  referenceId: string;
}) {
  const { data: row, error } = await input.supabase
    .from("project_references")
    .select("*")
    .eq("id", input.referenceId)
    .eq("project_id", input.projectId)
    .eq("owner_id", input.ownerId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!row) {
    const err = new Error("Reference not found");
    (err as Error & { status: number }).status = 404;
    throw err;
  }

  const { error: deleteRowError } = await input.supabase
    .from("project_references")
    .delete()
    .eq("id", input.referenceId)
    .eq("owner_id", input.ownerId);
  if (deleteRowError) throw new Error(deleteRowError.message);

  const paths = [row.storage_path, row.preview_path].filter(Boolean) as string[];
  const unique = Array.from(new Set(paths));
  if (unique.length) {
    const { error: storageError } = await input.supabase.storage
      .from(REFERENCE_BUCKET)
      .remove(unique);
    if (storageError) {
      // Best-effort: row is gone; surface warning via message for logs.
      console.error("Storage cleanup failed after reference delete", storageError.message);
    }
  }
  return { ok: true as const };
}

export async function updateProjectReference(input: {
  supabase: SupabaseClient;
  ownerId: string;
  projectId: string;
  referenceId: string;
  note?: string | null;
  title?: string | null;
  isActive?: boolean;
  kind?: string;
}) {
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.note !== undefined) patch.note = input.note?.trim() || null;
  if (input.title !== undefined) patch.title = input.title?.trim() || null;
  if (input.isActive !== undefined) patch.is_active = input.isActive;
  if (input.kind !== undefined) patch.kind = input.kind;

  const { data, error } = await input.supabase
    .from("project_references")
    .update(patch)
    .eq("id", input.referenceId)
    .eq("project_id", input.projectId)
    .eq("owner_id", input.ownerId)
    .select("*")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) {
    const err = new Error("Reference not found");
    (err as Error & { status: number }).status = 404;
    throw err;
  }
  return data as ProjectReferenceRow;
}

export async function createSignedReferenceUrls(
  supabase: SupabaseClient,
  rows: ProjectReferenceRow[],
  expiresIn = 60 * 30,
) {
  const out: Record<string, { url: string | null; previewUrl: string | null }> = {};
  await Promise.all(
    rows.map(async (row) => {
      const { data } = await supabase.storage
        .from(REFERENCE_BUCKET)
        .createSignedUrl(row.storage_path, expiresIn);
      let previewUrl: string | null = null;
      if (row.preview_path) {
        const preview = await supabase.storage
          .from(REFERENCE_BUCKET)
          .createSignedUrl(row.preview_path, expiresIn);
        previewUrl = preview.data?.signedUrl ?? null;
      }
      out[row.id] = { url: data?.signedUrl ?? null, previewUrl };
    }),
  );
  return out;
}

export type BriefReference = {
  id: string;
  filename: string;
  mimeType: string;
  note: string | null;
  kind: string;
  extractedText: string | null;
  supportedInProvider: boolean;
  unsupportedReason?: string;
  analysisStatus?: string;
  analysisMode?: string | null;
  analysis?: Record<string, unknown> | null;
  analysisConfirmed?: Record<string, unknown> | null;
  analysisProvider?: string | null;
  analysisModel?: string | null;
  analysisError?: string | null;
  pdfPagesProcessed?: number[];
  visuallyAnalysed?: boolean;
};

export function toBriefReferences(rows: ProjectReferenceRow[]): BriefReference[] {
  return rows
    .filter((row) => row.is_active)
    .map((row) => {
      const isImage = row.mime_type.startsWith("image/");
      const isPdf = row.mime_type === "application/pdf";
      const supportedInProvider = isImage || isPdf;
      const visuallyAnalysed =
        row.analysis_status === "succeeded" && row.analysis_mode === "visual";
      const unsupportedReason = supportedInProvider
        ? undefined
        : "This file type is stored but not used for generation yet.";
      return {
        id: row.id,
        filename: row.original_filename,
        mimeType: row.mime_type,
        note: row.note,
        kind: row.kind,
        extractedText: row.extracted_text,
        supportedInProvider,
        unsupportedReason,
        analysisStatus: row.analysis_status,
        analysisMode: row.analysis_mode,
        analysis: row.analysis_json,
        analysisConfirmed: row.analysis_confirmed_json,
        analysisProvider: row.analysis_provider,
        analysisModel: row.analysis_model,
        analysisError: row.analysis_error,
        pdfPagesProcessed: row.pdf_pages_processed,
        visuallyAnalysed,
      };
    });
}
