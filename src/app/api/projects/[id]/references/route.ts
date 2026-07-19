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
    return jsonOk({
      references: rows.map((row) => ({
        ...row,
        signedUrl: urls[row.id]?.url ?? null,
        previewUrl: urls[row.id]?.previewUrl ?? null,
        usedInGeneration: usedIds.has(row.id),
      })),
      limits: {
        ...limits,
        maxFileBytesLabel: formatBytes(limits.maxFileBytes),
        maxTotalBytesPerUserLabel: formatBytes(limits.maxTotalBytesPerUser),
        helpText: REFERENCE_HELP_TEXT,
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
    const row = await uploadProjectReference({
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
    const urls = await createSignedReferenceUrls(supabase, [row]);
    return jsonOk(
      {
        reference: {
          ...row,
          signedUrl: urls[row.id]?.url ?? null,
          previewUrl: urls[row.id]?.previewUrl ?? null,
        },
      },
      { status: 201 },
    );
  } catch (error) {
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
    };
    if (!body.referenceId) return jsonError("referenceId is required", 400);
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
