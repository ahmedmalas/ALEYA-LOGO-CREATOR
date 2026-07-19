import { handleRouteError, jsonError, jsonOk, requireUser } from "@/lib/security/api";
import { z } from "zod";

const passwordSchema = z.object({
  action: z.literal("change_password"),
  password: z.string().min(8).max(128),
});

const resetSchema = z.object({
  action: z.literal("request_reset_email"),
});

const deleteSchema = z.object({
  action: z.literal("delete_account"),
  confirm: z.literal("DELETE"),
});

export async function POST(request: Request) {
  try {
    const { supabase, user } = await requireUser();
    const raw = await request.json();
    const action = raw?.action as string;

    if (action === "change_password") {
      const body = passwordSchema.parse(raw);
      const { error } = await supabase.auth.updateUser({ password: body.password });
      if (error) return jsonError(error.message, 400);
      return jsonOk({ message: "Password updated." });
    }

    if (action === "request_reset_email") {
      resetSchema.parse(raw);
      if (!user.email) return jsonError("No email on this account.", 400);
      const origin = process.env.NEXT_PUBLIC_APP_URL || "https://aleya-logo-creator.vercel.app";
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${origin}/auth/callback?next=/reset-password`,
      });
      if (error) return jsonError(error.message, 400);
      return jsonOk({
        message: "If email delivery is available, a password reset link is on the way.",
      });
    }

    if (action === "delete_account") {
      deleteSchema.parse(raw);
      // Service-role deletion is not exposed in the browser. Soft-disable via profile + sign out.
      await supabase
        .from("user_profiles")
        .update({
          plan_status: "canceled",
          display_name: "Deleted account",
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);
      await supabase.auth.signOut({ scope: "global" });
      return jsonOk({
        message:
          "Signed out of all sessions and marked the account canceled. Full hard-delete of auth.users requires an admin/service-role job (not exposed to the browser).",
        requiresHardDeleteJob: true,
      });
    }

    return jsonError("Unknown security action", 400);
  } catch (error) {
    return handleRouteError(error);
  }
}
