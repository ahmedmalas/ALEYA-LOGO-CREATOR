import { handleRouteError, jsonError, readJson } from "@/lib/security/api";
import { sanitizeColorList } from "@/lib/security/colors";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) return jsonError("Invalid id", 400);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return jsonError("Unauthorized", 401);

  const { data, error } = await supabase
    .from("brand_kits")
    .select("*")
    .eq("id", id)
    .eq("owner_id", user.id)
    .single();

  if (error || !data) return jsonError("Not found", 404);
  return NextResponse.json({ brandKit: data });
}

const patchSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  tagline: z.string().max(160).nullable().optional(),
  primary_colors: z.array(z.string()).max(12).optional(),
  secondary_colors: z.array(z.string()).max(12).optional(),
  typography: z.record(z.string(), z.string()).optional(),
  editable_metadata: z.record(z.string(), z.unknown()).optional(),
});

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    if (!z.string().uuid().safeParse(id).success) return jsonError("Invalid id", 400);

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return jsonError("Unauthorized", 401);

    const body = await readJson(request, patchSchema);
    const update: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (body.name !== undefined) update.name = body.name;
    if (body.tagline !== undefined) update.tagline = body.tagline;
    if (body.typography !== undefined) update.typography = body.typography;
    if (body.editable_metadata !== undefined) update.editable_metadata = body.editable_metadata;
    if (body.primary_colors !== undefined) {
      update.primary_colors = sanitizeColorList(body.primary_colors);
    }
    if (body.secondary_colors !== undefined) {
      update.secondary_colors = sanitizeColorList(body.secondary_colors);
    }

    const { data, error } = await supabase
      .from("brand_kits")
      .update(update)
      .eq("id", id)
      .eq("owner_id", user.id)
      .select("*")
      .single();

    if (error || !data) return jsonError("Could not update Brand Kit", 400);
    return NextResponse.json({ brandKit: data });
  } catch (error) {
    return handleRouteError(error, "Could not update Brand Kit");
  }
}
