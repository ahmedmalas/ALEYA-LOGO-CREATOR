import { generationControlsSchema } from "@/lib/logo/evolution";
import { MirrorSimilarityError } from "@/lib/logo/similarity";
import { loadActiveReferences, withReferences } from "@/lib/references/brief";
import { runGenerationJob } from "@/lib/logo/generation-service";
import { ProviderError } from "@/lib/providers";
import { createClient } from "@/lib/supabase/server";
import type { LogoBrief } from "@/types/logo";
import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  projectId: z.string().uuid(),
  count: z.number().int().min(1).max(8).default(4),
  idempotencyKey: z.string().min(8).max(120),
  kind: z.enum(["generate", "regenerate"]).default("generate"),
  referenceIds: z.array(z.string().uuid()).optional(),
  controls: generationControlsSchema.partial().optional(),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = schema.parse(await request.json());
    const { data: project } = await supabase
      .from("logo_projects")
      .select("*")
      .eq("id", body.projectId)
      .eq("owner_id", user.id)
      .single();
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    const references = await loadActiveReferences(
      supabase,
      project.id,
      user.id,
      body.referenceIds,
    );

    const controls = generationControlsSchema.parse(body.controls ?? {});
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
        generationControls: {
          ...controls,
          exactLogoText: controls.exactLogoText || project.business_name,
        },
      },
      references,
    );

    const result = await runGenerationJob({
      supabase,
      ownerId: user.id,
      projectId: project.id,
      brief,
      kind: body.kind,
      idempotencyKey: body.idempotencyKey,
      count: body.count,
    });

    return NextResponse.json({
      ...result,
      referencesUsed: references,
    });
  } catch (error) {
    if (error && typeof error === "object" && "issues" in error) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    if (error instanceof MirrorSimilarityError) {
      return NextResponse.json(
        {
          error: error.message,
          code: "mirror_similarity_failed",
          similarity: error.report,
        },
        { status: 422 },
      );
    }
    if (error instanceof Error && /reconstruction is required/i.test(error.message)) {
      return NextResponse.json(
        { error: error.message, code: "reconstruction_required" },
        { status: 422 },
      );
    }
    const errStatus = (error as { status?: number }).status;
    const status =
      error instanceof ProviderError
        ? error.code === "rate_limited"
          ? 429
          : error.code === "missing_credentials"
            ? 503
            : 502
        : errStatus === 429 || errStatus === 402 || errStatus === 403
          ? errStatus
          : 500;
    const message =
      error instanceof ProviderError || errStatus === 429 || errStatus === 402
        ? error instanceof Error
          ? error.message
          : "Request failed"
        : "Generation failed. Please try again.";
    if (!(error instanceof ProviderError) && errStatus !== 429 && errStatus !== 402) {
      console.error("[generate]", error);
    }
    return NextResponse.json(
      {
        error: message,
        code:
          error instanceof ProviderError
            ? error.code
            : (error as { code?: string }).code,
      },
      { status },
    );
  }
}
