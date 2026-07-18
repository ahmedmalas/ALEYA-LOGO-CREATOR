import type { SupabaseClient } from "@supabase/supabase-js";

export async function ensureWorkspace(supabase: SupabaseClient, ownerId: string, name = "My Workspace") {
  const { data: existing } = await supabase
    .from("workspaces")
    .select("*")
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (existing) return existing;

  const { data, error } = await supabase
    .from("workspaces")
    .insert({ owner_id: ownerId, name })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data;
}
