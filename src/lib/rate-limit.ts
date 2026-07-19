import type { SupabaseClient } from "@supabase/supabase-js";
import { getPlan } from "@/lib/plans/catalog";
import { getUserPlanId } from "@/lib/plans/usage";

export async function assertGenerationRateLimit(
  supabase: SupabaseClient,
  ownerId: string,
): Promise<void> {
  const { planId } = await getUserPlanId(supabase, ownerId);
  const plan = getPlan(planId);
  const limit = plan.generationsPerHour;
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count, error } = await supabase
    .from("generation_jobs")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", ownerId)
    .gte("created_at", since);

  if (error) {
    throw new Error(`Rate limit check failed: ${error.message}`);
  }

  if ((count ?? 0) >= limit) {
    const err = new Error(
      `Generation rate limit exceeded (${limit}/hour on ${plan.name}). Please wait before generating more logos.`,
    );
    (err as Error & { status: number }).status = 429;
    throw err;
  }
}
