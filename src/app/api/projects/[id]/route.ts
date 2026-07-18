import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: project, error } = await supabase
    .from("logo_projects")
    .select("*")
    .eq("id", id)
    .eq("owner_id", user.id)
    .single();

  if (error || !project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: concepts } = await supabase
    .from("logo_concepts")
    .select("*")
    .eq("project_id", id)
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  const { data: brandKits } = await supabase
    .from("brand_kits")
    .select("*")
    .eq("project_id", id)
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  return NextResponse.json({ project, concepts: concepts ?? [], brandKits: brandKits ?? [] });
}
