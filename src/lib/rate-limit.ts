import type { SupabaseClient } from "@supabase/supabase-js";
import { assertGenerationAllowance, PlanLimitError } from "@/lib/plans/enforce";

/** @deprecated Prefer assertGenerationAllowance — kept for import compatibility. */
export async function assertGenerationRateLimit(
  supabase: SupabaseClient,
  ownerId: string,
  kind: "generate" | "regenerate" | "refine" = "generate",
): Promise<void> {
  try {
    await assertGenerationAllowance(supabase, ownerId, kind);
  } catch (error) {
    if (error instanceof PlanLimitError) {
      const err = new Error(error.message) as Error & { status: number; code: string };
      err.status = error.status;
      err.code = error.code;
      throw err;
    }
    throw error;
  }
}
