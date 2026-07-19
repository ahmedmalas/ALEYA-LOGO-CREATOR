import { ensureWorkspace } from "@/lib/auth/workspace";
import {
  INTEGRATION_COOKIE,
  decodeIntegrationClaims,
} from "@/lib/integration/claims";
import { assertProjectAllowance, PlanLimitError } from "@/lib/plans/enforce";
import { handleRouteError, jsonError, readJson } from "@/lib/security/api";
import { sanitizeColorList } from "@/lib/security/colors";
import { createClient } from "@/lib/supabase/server";
import { LOGO_STYLES, LAYOUTS, PERSONALITIES, TYPOGRAPHY_DIRECTIONS } from "@/types/logo";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

const createSchema = z.object({
  businessName: z.string().min(1).max(120),
  tagline: z.string().max(160).optional(),
  industry: z.string().min(1).max(80),
  personality: z.enum(PERSONALITIES),
  style: z.enum(LOGO_STYLES),
  preferredColors: z.array(z.string()).max(12).default([]),
  avoidColors: z.array(z.string()).max(12).default([]),
  iconIdeas: z.string().max(500).optional(),
  typographyDirection: z.enum(TYPOGRAPHY_DIRECTIONS),
  layoutDirection: z.enum(LAYOUTS),
  aleyaBusinessId: z.string().max(120).optional(),
  aleyaReturnUrl: z.string().url().optional(),
});

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return jsonError("Unauthorized", 401);

  const { data, error } = await supabase
    .from("logo_projects")
    .select("*")
    .eq("owner_id", user.id)
    .order("updated_at", { ascending: false });

  if (error) return jsonError("Could not load projects", 500);
  return NextResponse.json({ projects: data });
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return jsonError("Unauthorized", 401);

    const body = await readJson(request, createSchema);
    try {
      await assertProjectAllowance(supabase, user.id);
    } catch (error) {
      if (error instanceof PlanLimitError) return jsonError(error.message, error.status);
      throw error;
    }
    const workspace = await ensureWorkspace(supabase, user.id);

    const cookieStore = await cookies();
    const claims = decodeIntegrationClaims(cookieStore.get(INTEGRATION_COOKIE)?.value);
    let aleyaBusinessId: string | null = null;
    let aleyaReturnUrl: string | null = null;

    if (claims) {
      // Only verified integration claims may bind an Aleya business.
      if (
        body.aleyaBusinessId &&
        body.aleyaBusinessId !== claims.businessId
      ) {
        return jsonError("Aleya business id does not match verified handoff", 400);
      }
      if (body.aleyaReturnUrl && body.aleyaReturnUrl !== claims.returnUrl) {
        return jsonError("Aleya return URL does not match verified handoff", 400);
      }
      aleyaBusinessId = claims.businessId;
      aleyaReturnUrl = claims.returnUrl;
    } else if (body.aleyaBusinessId || body.aleyaReturnUrl) {
      return jsonError(
        "Aleya handoff must be validated before linking a business. Open Logo Creator from Aleya Invoicing.",
        400,
      );
    }

    const preferredColors = sanitizeColorList(body.preferredColors);
    const avoidColors = sanitizeColorList(body.avoidColors);

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
        preferred_colors: preferredColors,
        avoid_colors: avoidColors,
        icon_ideas: body.iconIdeas ?? null,
        typography_direction: body.typographyDirection,
        layout_direction: body.layoutDirection,
        aleya_business_id: aleyaBusinessId,
        aleya_return_url: aleyaReturnUrl,
        status: "draft",
      })
      .select("*")
      .single();

    if (error) return jsonError("Could not create project", 500);
    return NextResponse.json({ project: data }, { status: 201 });
  } catch (error) {
    return handleRouteError(error, "Could not create project");
  }
}
