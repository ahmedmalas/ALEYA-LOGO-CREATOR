import type { SupabaseClient } from "@supabase/supabase-js";

export type UsageEventType = "generation" | "refinement" | "export" | "reference_upload";

export async function reserveUsage(input: {
  supabase: SupabaseClient;
  ownerId: string;
  eventType: "generation" | "refinement" | "export";
  projectId?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<string> {
  const { data, error } = await input.supabase
    .from("usage_reservations")
    .insert({
      owner_id: input.ownerId,
      event_type: input.eventType,
      status: "reserved",
      project_id: input.projectId ?? null,
      metadata: input.metadata ?? {},
    })
    .select("id")
    .single();
  if (error || !data) throw new Error(error?.message || "Could not reserve usage");
  return data.id as string;
}

export async function commitUsage(input: {
  supabase: SupabaseClient;
  reservationId: string;
  ownerId: string;
  eventType: UsageEventType;
  projectId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const now = new Date().toISOString();
  const { error: resError } = await input.supabase
    .from("usage_reservations")
    .update({ status: "committed", finalized_at: now })
    .eq("id", input.reservationId)
    .eq("owner_id", input.ownerId)
    .eq("status", "reserved");
  if (resError) throw new Error(resError.message);

  const { error } = await input.supabase.from("usage_events").insert({
    owner_id: input.ownerId,
    event_type: input.eventType,
    project_id: input.projectId ?? null,
    metadata: { ...(input.metadata ?? {}), reservationId: input.reservationId },
  });
  if (error) throw new Error(error.message);
}

export async function releaseUsage(input: {
  supabase: SupabaseClient;
  reservationId: string | null | undefined;
  ownerId: string;
}) {
  if (!input.reservationId) return;
  await input.supabase
    .from("usage_reservations")
    .update({ status: "released", finalized_at: new Date().toISOString() })
    .eq("id", input.reservationId)
    .eq("owner_id", input.ownerId)
    .eq("status", "reserved");
}
