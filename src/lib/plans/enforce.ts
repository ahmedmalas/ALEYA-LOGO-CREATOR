import type { SupabaseClient } from "@supabase/supabase-js";
import { formatBytesLabel, getPlan, type PlanDefinition, type PlanId } from "@/lib/plans/catalog";
import { getUserPlanId } from "@/lib/plans/usage";

export class PlanLimitError extends Error {
  status = 402;
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = "PlanLimitError";
  }
}

export async function assertAccountActive(supabase: SupabaseClient, userId: string) {
  const { data } = await supabase
    .from("user_profiles")
    .select("plan_status")
    .eq("user_id", userId)
    .maybeSingle();
  if (data?.plan_status === "canceled") {
    throw new PlanLimitError(
      "account_deactivated",
      "This account is deactivated. Sign in is blocked for creative actions. Contact support if you need restoration.",
    );
  }
}

export async function getEnforcedPlan(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ planId: PlanId; planStatus: string; plan: PlanDefinition }> {
  await assertAccountActive(supabase, userId);
  const { planId, planStatus } = await getUserPlanId(supabase, userId);
  return { planId, planStatus, plan: getPlan(planId) };
}

async function countSucceededEvents(
  supabase: SupabaseClient,
  ownerId: string,
  eventType: "generation" | "refinement" | "export",
  sinceIso: string,
) {
  const { count, error } = await supabase
    .from("usage_events")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", ownerId)
    .eq("event_type", eventType)
    .gte("created_at", sinceIso);
  if (error) throw new Error(`Usage check failed: ${error.message}`);
  return count ?? 0;
}

async function countOpenReservations(
  supabase: SupabaseClient,
  ownerId: string,
  eventType: "generation" | "refinement" | "export",
  sinceIso: string,
) {
  const { count, error } = await supabase
    .from("usage_reservations")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", ownerId)
    .eq("event_type", eventType)
    .eq("status", "reserved")
    .gte("created_at", sinceIso);
  if (error) throw new Error(`Reservation check failed: ${error.message}`);
  return count ?? 0;
}

export async function assertGenerationAllowance(
  supabase: SupabaseClient,
  ownerId: string,
  kind: "generate" | "regenerate" | "refine",
) {
  const { plan } = await getEnforcedPlan(supabase, ownerId);
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const eventType = kind === "refine" ? "refinement" : "generation";
  const limit = kind === "refine" ? plan.refinementsPerHour : plan.generationsPerHour;
  const used =
    (await countSucceededEvents(supabase, ownerId, eventType, since)) +
    (await countOpenReservations(supabase, ownerId, eventType, since));
  if (used >= limit) {
    throw new PlanLimitError(
      "generation_limit",
      `${plan.name} plan allows ${limit} ${eventType}s per hour. ${
        plan.id === "free"
          ? "Join the Pro waitlist for higher limits when billing launches."
          : "Please wait before trying again."
      }`,
    );
  }
}

export async function assertExportAllowance(supabase: SupabaseClient, ownerId: string) {
  const { plan } = await getEnforcedPlan(supabase, ownerId);
  if (plan.exportsPerHour == null) return plan;
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const used =
    (await countSucceededEvents(supabase, ownerId, "export", since)) +
    (await countOpenReservations(supabase, ownerId, "export", since));
  if (used >= plan.exportsPerHour) {
    throw new PlanLimitError(
      "export_limit",
      `${plan.name} plan allows ${plan.exportsPerHour} exports per hour. Join the Pro waitlist for higher limits when billing launches.`,
    );
  }
  return plan;
}

export async function assertProjectAllowance(supabase: SupabaseClient, ownerId: string) {
  const { plan } = await getEnforcedPlan(supabase, ownerId);
  if (plan.maxProjects == null) return;
  const { count, error } = await supabase
    .from("logo_projects")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", ownerId);
  if (error) throw new Error(error.message);
  if ((count ?? 0) >= plan.maxProjects) {
    throw new PlanLimitError(
      "project_limit",
      `${plan.name} plan allows up to ${plan.maxProjects} projects. Remove a project or join the Pro waitlist for higher limits when billing launches.`,
    );
  }
}

export async function assertBrandKitAccess(supabase: SupabaseClient, ownerId: string) {
  const { plan } = await getEnforcedPlan(supabase, ownerId);
  if (!plan.brandKitAccess) {
    throw new PlanLimitError(
      "brand_kit_locked",
      `Brand Kits are not included on the ${plan.name} plan.`,
    );
  }
}

export function assertExportFormatsAllowed(plan: PlanDefinition, formats: string[]) {
  const allowed = new Set(plan.exportFormats.map((f) => f.toLowerCase()));
  const blocked = formats.filter((f) => !allowed.has(f.toLowerCase()));
  if (blocked.length) {
    throw new PlanLimitError(
      "export_format",
      `These export formats are not included on ${plan.name}: ${blocked.join(", ")}.`,
    );
  }
}

export async function assertStorageWithinPlan(
  supabase: SupabaseClient,
  ownerId: string,
  incomingBytes = 0,
) {
  const { plan } = await getEnforcedPlan(supabase, ownerId);
  const { data, error } = await supabase
    .from("project_references")
    .select("size_bytes")
    .eq("owner_id", ownerId);
  if (error) throw new Error(error.message);
  const used = (data ?? []).reduce((sum, row) => sum + Number(row.size_bytes ?? 0), 0);
  if (used + incomingBytes > plan.referenceMaxTotalBytes) {
    throw new PlanLimitError(
      "storage_limit",
      `Reference storage limit reached (${formatBytesLabel(plan.referenceMaxTotalBytes)} on ${plan.name}). Remove files or join the Pro waitlist for more storage when billing launches.`,
    );
  }
}

export { formatBytesLabel };
