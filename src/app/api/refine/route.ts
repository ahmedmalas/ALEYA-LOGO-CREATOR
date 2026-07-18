import { runGenerationJob } from "@/lib/logo/generation-service";
import { ProviderError } from "@/lib/providers";
import { createClient } from "@/lib/supabase/server";
import type { LogoBrief } from "@/types/logo";
import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  projectId: z.string().uuid(),
  conceptId: z.string().uuid(),
  instruction: z.string().min(3).max(500),
  idempotencyKey: z.string().min(8).max(120),
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
      kind: "refine",
      idempotencyKey: body.idempotencyKey,
      conceptId: body.conceptId,
      instruction: body.instruction,
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Refine failed",
        code: error instanceof ProviderError ? error.code : undefined,
      },
      { status: error instanceof ProviderError ? 502 : 400 },
    );
  }
}
