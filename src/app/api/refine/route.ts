import { loadActiveReferences, withReferences } from "@/lib/references/brief";
import { runGenerationJob } from "@/lib/logo/generation-service";
import { ProviderError } from "@/lib/providers";
import { handleRouteError, jsonError, readJson } from "@/lib/security/api";
import { createClient } from "@/lib/supabase/server";
import type { LogoBrief } from "@/types/logo";
import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  projectId: z.string().uuid(),
  conceptId: z.string().uuid(),
  instruction: z.string().min(3).max(500),
  idempotencyKey: z.string().min(8).max(120),
  referenceIds: z.array(z.string().uuid()).optional(),
});

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return jsonError("Unauthorized", 401);

    const body = await readJson(request, schema);
    const { data: project } = await supabase
      .from("logo_projects")
      .select("*")
      .eq("id", body.projectId)
      .eq("owner_id", user.id)
      .single();
    if (!project) return jsonError("Project not found", 404);

    const { data: concept } = await supabase
      .from("logo_concepts")
      .select("id, project_id")
      .eq("id", body.conceptId)
      .eq("owner_id", user.id)
      .single();
    if (!concept || concept.project_id !== body.projectId) {
      return jsonError("Concept not found on this project", 404);
    }

    const references = await loadActiveReferences(
      supabase,
      project.id,
      user.id,
      body.referenceIds,
    );

    const brief: LogoBrief = withReferences(
      {
        businessName: project.business_name,
        tagline: project.tagline ?? undefined,
        industry: project.industry,
        personality: project.personality,
        style: project.style,
        preferredColors: project.preferred_colors ?? [],
        avoidColors: project.avoid_colors ?? [],
        iconIdeas: project.icon_ideas ?? undefined,
        typographyDirection: project.typography_direction,
        layoutDirection: project.layout_direction,
      },
      references,
    );

    const result = await runGenerationJob({
      supabase,
      ownerId: user.id,
      projectId: project.id,
      brief,
      kind: "refine",
      idempotencyKey: body.idempotencyKey,
      conceptId: body.conceptId,
      instruction: body.instruction,
    });

    return NextResponse.json({ ...result, referencesUsed: references });
  } catch (error) {
    if (error instanceof ProviderError) {
      const status =
        error.code === "rate_limited" ? 429 : error.code === "missing_credentials" ? 503 : 502;
      return NextResponse.json({ error: error.message, code: error.code }, { status });
    }
    const errStatus = (error as { status?: number }).status;
    if (errStatus === 429 || errStatus === 402 || errStatus === 403) {
      return jsonError(error instanceof Error ? error.message : "Limit exceeded", errStatus);
    }
    return handleRouteError(error, "Refine failed");
  }
}
