import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("brand_kits")
    .select("*")
    .eq("id", id)
    .eq("owner_id", user.id)
    .single();

  if (error || !data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ brandKit: data });
}

const patchSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  tagline: z.string().max(160).nullable().optional(),
  primary_colors: z.array(z.string()).optional(),
  secondary_colors: z.array(z.string()).optional(),
  typography: z.record(z.string(), z.string()).optional(),
  editable_metadata: z.record(z.string(), z.unknown()).optional(),
});

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = patchSchema.parse(await request.json());
  const { data, error } = await supabase
    .from("brand_kits")
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("owner_id", user.id)
    .select("*")
    .single();

  if (error || !data) return NextResponse.json({ error: error?.message ?? "Not found" }, { status: 400 });
  return NextResponse.json({ brandKit: data });
}
