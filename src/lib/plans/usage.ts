import type { SupabaseClient } from "@supabase/supabase-js";
import { formatBytesLabel, getPlan, type PlanId } from "@/lib/plans/catalog";

export type UsageSnapshot = {
  planId: PlanId;
  planStatus: string;
  generationsPerHour: number;
  generationsUsedHour: number;
  generationsRemainingHour: number;
  refinementsUsedHour: number;
  refinementsPerHour: number;
  refinementsRemainingHour: number;
  exportsUsedHour: number;
  exportsPerHour: number | null;
  exportsRemainingHour: number | null;
  exportAllowanceLabel: string;
  referenceBytesUsed: number;
  referenceBytesLimit: number;
  referenceBytesLabel: string;
  referenceCount: number;
  projectCount: number;
  brandKitCount: number;
  billingAvailable: boolean;
};

export async function getUserPlanId(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ planId: PlanId; planStatus: string }> {
  const { data } = await supabase
    .from("user_profiles")
    .select("plan_id, plan_status")
    .eq("user_id", userId)
    .maybeSingle();
  return {
    planId: (data?.plan_id as PlanId) || "free",
    planStatus: data?.plan_status || "active",
  };
}

export async function getUsageSnapshot(
  supabase: SupabaseClient,
  userId: string,
): Promise<UsageSnapshot> {
  const { planId, planStatus } = await getUserPlanId(supabase, userId);
  const plan = getPlan(planId);
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const [
    { count: genCount },
    { count: refineCount },
    { count: exportCount },
    { data: refs },
    { count: projectCount },
    { count: brandKitCount },
  ] = await Promise.all([
    supabase
      .from("usage_events")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", userId)
      .eq("event_type", "generation")
      .gte("created_at", since),
    supabase
      .from("usage_events")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", userId)
      .eq("event_type", "refinement")
      .gte("created_at", since),
    supabase
      .from("usage_events")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", userId)
      .eq("event_type", "export")
      .gte("created_at", since),
    supabase.from("project_references").select("size_bytes").eq("owner_id", userId),
    supabase
      .from("logo_projects")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", userId),
    supabase
      .from("brand_kits")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", userId),
  ]);

  const generationsUsedHour = genCount ?? 0;
  const refinementsUsedHour = refineCount ?? 0;
  const exportsUsedHour = exportCount ?? 0;
  const referenceBytesUsed = (refs ?? []).reduce(
    (sum, row) => sum + Number(row.size_bytes ?? 0),
    0,
  );

  return {
    planId,
    planStatus,
    generationsPerHour: plan.generationsPerHour,
    generationsUsedHour,
    generationsRemainingHour: Math.max(0, plan.generationsPerHour - generationsUsedHour),
    refinementsUsedHour,
    refinementsPerHour: plan.refinementsPerHour,
    refinementsRemainingHour: Math.max(0, plan.refinementsPerHour - refinementsUsedHour),
    exportsUsedHour,
    exportsPerHour: plan.exportsPerHour,
    exportsRemainingHour:
      plan.exportsPerHour == null ? null : Math.max(0, plan.exportsPerHour - exportsUsedHour),
    exportAllowanceLabel:
      plan.exportsPerHour == null
        ? "Unlimited ZIP exports on current plan"
        : `${exportsUsedHour} / ${plan.exportsPerHour} this hour`,
    referenceBytesUsed,
    referenceBytesLimit: plan.referenceMaxTotalBytes,
    referenceBytesLabel: `${formatBytesLabel(referenceBytesUsed)} / ${formatBytesLabel(plan.referenceMaxTotalBytes)}`,
    referenceCount: refs?.length ?? 0,
    projectCount: projectCount ?? 0,
    brandKitCount: brandKitCount ?? 0,
    billingAvailable: plan.paidCheckoutAvailable,
  };
}
