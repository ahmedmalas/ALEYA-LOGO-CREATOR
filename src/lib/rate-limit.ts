import type { SupabaseClient } from "@supabase/supabase-js";

const DEFAULT_LIMIT = Number(process.env.GENERATION_RATE_LIMIT_PER_HOUR ?? 20);

export async function assertGenerationRateLimit(
  supabase: SupabaseClient,
  ownerId: string,
): Promise<void> {
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count, error } = await supabase
    .from("generation_jobs")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", ownerId)
    .gte("created_at", since);

  if (error) {
    throw new Error(`Rate limit check failed: ${error.message}`);
  }

  if ((count ?? 0) >= DEFAULT_LIMIT) {
    const err = new Error(
      `Generation rate limit exceeded (${DEFAULT_LIMIT}/hour). Please wait before generating more logos.`,
    );
    (err as Error & { status: number }).status = 429;
    throw err;
  }
}
