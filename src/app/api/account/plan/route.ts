import { ensureProfile } from "@/lib/account/profile";
import { BILLING_PROVIDER_CONNECTED, getPlan } from "@/lib/plans/catalog";
import { getUsageSnapshot } from "@/lib/plans/usage";
import { handleRouteError, jsonError, jsonOk, requireUser } from "@/lib/security/api";
import { z } from "zod";

const schema = z.object({
  action: z.enum(["join_pro_waitlist", "leave_pro_waitlist", "stay_free"]),
});

export async function GET() {
  try {
    const { supabase, user } = await requireUser();
    await ensureProfile(supabase, user.id, user.email);
    const usage = await getUsageSnapshot(supabase, user.id);
    const plan = getPlan(usage.planId);
    const { data: waitlist } = await supabase
      .from("plan_waitlist")
      .select("*")
      .eq("user_id", user.id)
      .eq("plan_id", "pro")
      .eq("status", "active")
      .maybeSingle();

    return jsonOk({
      usage,
      plan,
      waitlist: waitlist
        ? { active: true, joinedAt: waitlist.created_at, id: waitlist.id }
        : { active: false },
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
          "Billing is connected — waitlist join is disabled. Use the real checkout when wired.",
          400,
        );
      }

      const { data: existing } = await supabase
        .from("plan_waitlist")
        .select("*")
        .eq("user_id", user.id)
        .eq("plan_id", "pro")
        .eq("status", "active")
        .maybeSingle();

      if (existing) {
        return jsonOk({
          waitlist: existing,
          message: "You are already on the Pro waitlist. No payment was taken.",
          duplicate: true,
        });
      }

      const { data: waitlist, error: waitlistError } = await supabase
        .from("plan_waitlist")
        .insert({
          user_id: user.id,
          plan_id: "pro",
          email: user.email,
          status: "active",
        })
        .select("*")
        .single();
      if (waitlistError) return jsonError(waitlistError.message, 400);

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
        waitlist,
        message:
          "You joined the Pro waitlist. No payment was taken and your plan remains Free until billing launches.",
        duplicate: false,
      });
    }

    if (body.action === "leave_pro_waitlist") {
      await supabase
        .from("plan_waitlist")
        .update({
          status: "left",
          left_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id)
        .eq("plan_id", "pro")
        .eq("status", "active");

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
      return jsonOk({ profile: data, message: "You left the Pro waitlist. You remain on Free." });
    }

    // stay_free
    await supabase
      .from("plan_waitlist")
      .update({
        status: "left",
        left_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id)
      .eq("plan_id", "pro")
      .eq("status", "active");

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
