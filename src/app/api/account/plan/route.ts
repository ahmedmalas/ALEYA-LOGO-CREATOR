import { ensureProfile } from "@/lib/account/profile";
import { BILLING_PROVIDER_CONNECTED, getPlan } from "@/lib/plans/catalog";
import { getUsageSnapshot } from "@/lib/plans/usage";
import { handleRouteError, jsonError, jsonOk, requireUser } from "@/lib/security/api";
import { z } from "zod";

const schema = z.object({
  action: z.enum(["join_pro_waitlist", "stay_free"]),
});

export async function GET() {
  try {
    const { supabase, user } = await requireUser();
    await ensureProfile(supabase, user.id, user.email);
    const usage = await getUsageSnapshot(supabase, user.id);
    const plan = getPlan(usage.planId);
    return jsonOk({
      usage,
      plan,
      billing: {
        connected: BILLING_PROVIDER_CONNECTED,
        status: BILLING_PROVIDER_CONNECTED
          ? "Stripe/env billing keys detected"
          : "No billing provider connected — paid checkout is unavailable",
      },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const { supabase, user } = await requireUser();
    await ensureProfile(supabase, user.id, user.email);
    const body = schema.parse(await request.json());

    if (body.action === "join_pro_waitlist") {
      if (BILLING_PROVIDER_CONNECTED) {
        return jsonError(
          "Billing is connected — use the upgrade checkout when it is wired. Do not use waitlist.",
          400,
        );
      }
      const { data, error } = await supabase
        .from("user_profiles")
        .update({
          plan_status: "waitlist",
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id)
        .select("*")
        .single();
      if (error) return jsonError(error.message, 400);
      return jsonOk({
        profile: data,
        message:
          "You are on the Pro waitlist. No payment was taken because billing is not connected yet.",
      });
    }

    const { data, error } = await supabase
      .from("user_profiles")
      .update({
        plan_id: "free",
        plan_status: "active",
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id)
      .select("*")
      .single();
    if (error) return jsonError(error.message, 400);
    return jsonOk({ profile: data, message: "Staying on Free." });
  } catch (error) {
    return handleRouteError(error);
  }
}
