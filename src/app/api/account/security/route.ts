import { deactivateAccount, hardDeleteAccount } from "@/lib/account/delete-account";
import { serviceRoleConfigured } from "@/lib/supabase/admin";
import { handleRouteError, jsonError, jsonOk, requireUser } from "@/lib/security/api";
import { z } from "zod";

const passwordSchema = z.object({
  action: z.literal("change_password"),
  password: z.string().min(8).max(128),
});

const resetSchema = z.object({
  action: z.literal("request_reset_email"),
});

const deactivateSchema = z.object({
  action: z.literal("deactivate_account"),
  confirm: z.literal("DEACTIVATE"),
});

const hardDeleteSchema = z.object({
  action: z.literal("hard_delete_account"),
  confirm: z.literal("DELETE FOREVER"),
  recentAuthConfirmed: z.literal(true),
});

export async function GET() {
  try {
    await requireUser();
    return jsonOk({
      hardDeleteAvailable: serviceRoleConfigured(),
      deactivateAvailable: true,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

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

    if (action === "deactivate_account") {
      deactivateSchema.parse(raw);
      const result = await deactivateAccount(supabase, user.id);
      return jsonOk(result);
    }

    if (action === "hard_delete_account") {
      hardDeleteSchema.parse(raw);
      if (!serviceRoleConfigured()) {
        return jsonError(
          "Hard delete is unavailable because SUPABASE_SERVICE_ROLE_KEY is not configured on the server. Use Deactivate account instead.",
          503,
        );
      }
      const result = await hardDeleteAccount({
        userClient: supabase,
        userId: user.id,
        email: user.email,
      });
      return jsonOk(result);
    }

    // Legacy alias — never advertise as permanent delete.
    if (action === "delete_account") {
      return jsonError(
        "Use deactivate_account (or hard_delete_account when available). Permanent deletion is not implied by this endpoint.",
        400,
      );
    }

    return jsonError("Unknown security action", 400);
  } catch (error) {
    return handleRouteError(error);
  }
}
