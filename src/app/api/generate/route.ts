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

    const brief: LogoBrief = {
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
    };

    const result = await runGenerationJob({
      supabase,
      ownerId: user.id,
      projectId: project.id,
      brief,
      kind: body.kind,
      idempotencyKey: body.idempotencyKey,
      count: body.count,
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error && typeof error === "object" && "issues" in error) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    const status =
      error instanceof ProviderError
        ? error.code === "rate_limited"
          ? 429
          : error.code === "missing_credentials"
            ? 503
            : 502
        : (error as { status?: number }).status === 429
          ? 429
          : 500;
    const message =
      error instanceof ProviderError
        ? error.message
        : (error as { status?: number }).status === 429
          ? error instanceof Error
            ? error.message
            : "Rate limit exceeded"
          : "Generation failed. Please try again.";
    if (!(error instanceof ProviderError) && (error as { status?: number }).status !== 429) {
      console.error("[generate]", error);
    }
    return NextResponse.json(
      {
        error: message,
        code: error instanceof ProviderError ? error.code : undefined,
      },
      { status },
    );
  }
}
