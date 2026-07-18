import { ensureWorkspace } from "@/lib/auth/workspace";
import { createClient } from "@/lib/supabase/server";
import { LOGO_STYLES, LAYOUTS, PERSONALITIES, TYPOGRAPHY_DIRECTIONS } from "@/types/logo";
import { NextResponse } from "next/server";
import { z } from "zod";

const createSchema = z.object({
  businessName: z.string().min(1).max(120),
  tagline: z.string().max(160).optional(),
  industry: z.string().min(1).max(80),
  personality: z.enum(PERSONALITIES),
  style: z.enum(LOGO_STYLES),
  preferredColors: z.array(z.string()).default([]),
  avoidColors: z.array(z.string()).default([]),
  iconIdeas: z.string().max(500).optional(),
  typographyDirection: z.enum(TYPOGRAPHY_DIRECTIONS),
  layoutDirection: z.enum(LAYOUTS),
  aleyaBusinessId: z.string().optional(),
  aleyaReturnUrl: z.string().url().optional(),
});

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("logo_projects")
    .select("*")
    .eq("owner_id", user.id)
    .order("updated_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ projects: data });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = createSchema.parse(await request.json());
  const workspace = await ensureWorkspace(supabase, user.id);

  const { data, error } = await supabase
    .from("logo_projects")
    .insert({
      workspace_id: workspace.id,
      owner_id: user.id,
      business_name: body.businessName,
      tagline: body.tagline ?? null,
      industry: body.industry,
      personality: body.personality,
      style: body.style,
      preferred_colors: body.preferredColors,
      avoid_colors: body.avoidColors,
      icon_ideas: body.iconIdeas ?? null,
      typography_direction: body.typographyDirection,
      layout_direction: body.layoutDirection,
      aleya_business_id: body.aleyaBusinessId ?? null,
      aleya_return_url: body.aleyaReturnUrl ?? null,
      status: "draft",
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ project: data }, { status: 201 });
}
