import { analyseProjectReference, parseConfirmedAnalysis } from "@/lib/references/analyse";
import { getVisionConfig } from "@/lib/references/vision";
import { VISUAL_ANALYSIS_UNAVAILABLE_MESSAGE } from "@/lib/references/analysis-types";
import { PlanLimitError } from "@/lib/plans/enforce";
import { getUserPlanId } from "@/lib/plans/usage";
import {
  createSignedReferenceUrls,
  deleteProjectReference,
  listProjectReferences,
  updateProjectReference,
  uploadProjectReference,
} from "@/lib/references/service";
import { formatBytes, getReferenceLimits, REFERENCE_HELP_TEXT } from "@/lib/references/limits";
import { handleRouteError, jsonError, jsonOk, requireUser } from "@/lib/security/api";

type Params = { params: Promise<{ id: string }> };

function serializeReference(
  row: Awaited<ReturnType<typeof listProjectReferences>>[number],
  urls: Record<string, { url: string | null; previewUrl: string | null }>,
  usedInGeneration: boolean,
) {
  const vision = getVisionConfig();
  return {
    ...row,
    signedUrl: urls[row.id]?.url ?? null,
    previewUrl: urls[row.id]?.previewUrl ?? null,
    usedInGeneration,
    visuallyAnalysed: row.analysis_status === "succeeded" && row.analysis_mode === "visual",
    visionAvailable: vision.available,
    visionProvider: vision.provider,
    visionModel: vision.model,
    visualAnalysisUnavailableMessage: VISUAL_ANALYSIS_UNAVAILABLE_MESSAGE,
  };
}

export async function GET(_request: Request, { params }: Params) {
  try {
    const { id: projectId } = await params;
    const { supabase, user } = await requireUser();
    const rows = await listProjectReferences(supabase, projectId, user.id);
    const urls = await createSignedReferenceUrls(supabase, rows);
    const { planId } = await getUserPlanId(supabase, user.id);
    const limits = getReferenceLimits(planId);
    const referenceIds = rows.map((row) => row.id);
    let usedIds = new Set<string>();
    if (referenceIds.length) {
      const { data: usedRows } = await supabase
        .from("generation_references")
        .select("reference_id")
        .eq("owner_id", user.id)
        .in("reference_id", referenceIds);
      usedIds = new Set((usedRows ?? []).map((row) => row.reference_id));
    }
    const vision = getVisionConfig();
    return jsonOk({
      references: rows.map((row) =>
        serializeReference(row, urls, usedIds.has(row.id)),
      ),
      limits: {
        ...limits,
        maxFileBytesLabel: formatBytes(limits.maxFileBytes),
        maxTotalBytesPerUserLabel: formatBytes(limits.maxTotalBytesPerUser),
        helpText: REFERENCE_HELP_TEXT,
      },
      vision: {
        available: vision.available,
        provider: vision.provider,
        model: vision.model,
        unavailableMessage: VISUAL_ANALYSIS_UNAVAILABLE_MESSAGE,
      },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const { id: projectId } = await params;
    const { supabase, user } = await requireUser();
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return jsonError("file is required", 400);
    }
    const note = form.get("note");
    const title = form.get("title");
    const kind = form.get("kind");
    if (!(file.size > 0)) {
      return jsonError("A real file is required — notes alone cannot create a reference.", 400);
    }
    let row = await uploadProjectReference({
      supabase,
      ownerId: user.id,
      projectId,
      file,
      filename: file.name,
      mimeType: file.type || "application/octet-stream",
      note: typeof note === "string" ? note : null,
      title: typeof title === "string" ? title : null,
      kind: typeof kind === "string" ? kind : null,
    });

    // Analyse immediately so users see detected details before generating.
    row = await analyseProjectReference({
      supabase,
      ownerId: user.id,
      reference: row,
    });

    const urls = await createSignedReferenceUrls(supabase, [row]);
    return jsonOk(
      {
        reference: serializeReference(row, urls, false),
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof PlanLimitError) {
      return jsonError(error.message, error.status);
    }
    const status = (error as Error & { status?: number }).status;
    if (status) return jsonError(error instanceof Error ? error.message : "Upload failed", status);
    return handleRouteError(error);
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id: projectId } = await params;
    const { supabase, user } = await requireUser();
    const body = (await request.json()) as {
      referenceId?: string;
      note?: string | null;
      title?: string | null;
      isActive?: boolean;
      kind?: string;
      action?: "reanalyse" | "confirm_analysis";
      analysisConfirmed?: unknown;
    };
    if (!body.referenceId) return jsonError("referenceId is required", 400);

    if (body.action === "reanalyse") {
      const rows = await listProjectReferences(supabase, projectId, user.id);
      const existing = rows.find((row) => row.id === body.referenceId);
      if (!existing) return jsonError("Reference not found", 404);
      const analysed = await analyseProjectReference({
        supabase,
        ownerId: user.id,
        reference: existing,
      });
      const urls = await createSignedReferenceUrls(supabase, [analysed]);
      return jsonOk({ reference: serializeReference(analysed, urls, false) });
    }

    if (body.action === "confirm_analysis") {
      const parsed = parseConfirmedAnalysis(body.analysisConfirmed);
      if (!parsed) return jsonError("Invalid analysis payload", 400);
      // Preserve reconstruction payload (SVG paths / reference raster) when users edit text fields.
      const rows = await listProjectReferences(supabase, projectId, user.id);
      const existing = rows.find((row) => row.id === body.referenceId);
      if (!existing) return jsonError("Reference not found", 404);
      const prior = (existing.analysis_confirmed_json ||
        existing.analysis_json ||
        {}) as Record<string, unknown>;
      const merged = {
        ...parsed,
        reconstructedSvg:
          parsed.reconstructedSvg ||
          (typeof prior.reconstructedSvg === "string" ? prior.reconstructedSvg : ""),
        referencePngBase64:
          parsed.referencePngBase64 ||
          (typeof prior.referencePngBase64 === "string" ? prior.referencePngBase64 : ""),
        reconstructionSource:
          parsed.reconstructionSource ||
          (typeof prior.reconstructionSource === "string" ? prior.reconstructionSource : ""),
        reconstructionPathCount:
          parsed.reconstructionPathCount ||
          (typeof prior.reconstructionPathCount === "number" ? prior.reconstructionPathCount : 0),
        colourRegions: parsed.colourRegions?.length
          ? parsed.colourRegions
          : Array.isArray(prior.colourRegions)
            ? prior.colourRegions
            : [],
        segments: parsed.segments?.length
          ? parsed.segments
          : Array.isArray(prior.segments)
            ? prior.segments
            : [],
      };
      const { data, error } = await supabase
        .from("project_references")
        .update({
          analysis_confirmed_json: merged,
          updated_at: new Date().toISOString(),
        })
        .eq("id", body.referenceId)
        .eq("project_id", projectId)
        .eq("owner_id", user.id)
        .select("*")
        .maybeSingle();
      if (error) return jsonError(error.message, 400);
      if (!data) return jsonError("Reference not found", 404);
      const urls = await createSignedReferenceUrls(supabase, [data]);
      return jsonOk({ reference: serializeReference(data, urls, false) });
    }

    const row = await updateProjectReference({
      supabase,
      ownerId: user.id,
      projectId,
      referenceId: body.referenceId,
      note: body.note,
      title: body.title,
      isActive: body.isActive,
      kind: body.kind,
    });
    return jsonOk({ reference: row });
  } catch (error) {
    const status = (error as Error & { status?: number }).status;
    if (status) return jsonError(error instanceof Error ? error.message : "Update failed", status);
    return handleRouteError(error);
  }
}

export async function DELETE(request: Request, { params }: Params) {
  try {
    const { id: projectId } = await params;
    const { supabase, user } = await requireUser();
    const url = new URL(request.url);
    const referenceId = url.searchParams.get("referenceId");
    if (!referenceId) return jsonError("referenceId is required", 400);
    await deleteProjectReference({
      supabase,
      ownerId: user.id,
      projectId,
      referenceId,
    });
    return jsonOk({ ok: true });
  } catch (error) {
    const status = (error as Error & { status?: number }).status;
    if (status) return jsonError(error instanceof Error ? error.message : "Delete failed", status);
    return handleRouteError(error);
  }
}
