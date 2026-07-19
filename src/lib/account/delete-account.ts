import type { SupabaseClient } from "@supabase/supabase-js";
import { REFERENCE_BUCKET } from "@/lib/references/service";
import { createServiceRoleClient, serviceRoleConfigured } from "@/lib/supabase/admin";

export type DeleteAccountResult =
  | {
      mode: "deactivate";
      message: string;
      remainsStored: string[];
    }
  | {
      mode: "hard_delete";
      message: string;
      deleted: string[];
    };

export async function deactivateAccount(supabase: SupabaseClient, userId: string) {
  await supabase
    .from("user_profiles")
    .update({
      plan_status: "canceled",
      display_name: "Deactivated account",
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  // Leave waitlist entries as left for audit clarity.
  await supabase
    .from("plan_waitlist")
    .update({ status: "left", left_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("status", "active");

  await supabase.auth.signOut({ scope: "global" });

  return {
    mode: "deactivate" as const,
    message:
      "Account deactivated. You are signed out. Creative actions are blocked. Data remains stored until a secure hard-delete is run.",
    remainsStored: [
      "Auth user record (until hard-delete)",
      "Projects, concepts, Brand Kits, and references",
      "Storage objects in logo-assets / project-references / avatars",
      "Usage and waitlist history",
    ],
  };
}

export async function hardDeleteAccount(input: {
  userClient: SupabaseClient;
  userId: string;
  email?: string | null;
}): Promise<DeleteAccountResult> {
  if (!serviceRoleConfigured()) {
    return deactivateAccount(input.userClient, input.userId);
  }

  const admin = createServiceRoleClient();
  if (!admin) {
    return deactivateAccount(input.userClient, input.userId);
  }

  const deleted: string[] = [];

  // Collect storage paths before deleting rows.
  const [{ data: refs }, { data: concepts }, { data: profile }] = await Promise.all([
    admin.from("project_references").select("storage_path, preview_path").eq("owner_id", input.userId),
    admin
      .from("logo_concepts")
      .select(
        "png_path, transparent_png_path, monochrome_path, icon_path, horizontal_path, stacked_path, light_preview_path, dark_preview_path",
      )
      .eq("owner_id", input.userId),
    admin.from("user_profiles").select("avatar_path").eq("user_id", input.userId).maybeSingle(),
  ]);

  const refPaths = (refs ?? []).flatMap((row) => [row.storage_path, row.preview_path]).filter(Boolean) as string[];
  if (refPaths.length) {
    await admin.storage.from(REFERENCE_BUCKET).remove(Array.from(new Set(refPaths)));
    deleted.push(`reference storage (${refPaths.length})`);
  }

  const assetPaths = (concepts ?? []).flatMap((row) =>
    [
      row.png_path,
      row.transparent_png_path,
      row.monochrome_path,
      row.icon_path,
      row.horizontal_path,
      row.stacked_path,
      row.light_preview_path,
      row.dark_preview_path,
    ].filter(Boolean),
  ) as string[];
  if (assetPaths.length) {
    await admin.storage.from("logo-assets").remove(Array.from(new Set(assetPaths)));
    deleted.push(`logo asset storage (${assetPaths.length})`);
  }

  if (profile?.avatar_path) {
    await admin.storage.from("avatars").remove([profile.avatar_path]);
    deleted.push("avatar");
  }

  // DB cleanup order (FKs cascade for most child tables from projects/users).
  await admin.from("usage_reservations").delete().eq("owner_id", input.userId);
  await admin.from("usage_events").delete().eq("owner_id", input.userId);
  await admin.from("plan_waitlist").delete().eq("user_id", input.userId);
  await admin.from("generation_references").delete().eq("owner_id", input.userId);
  await admin.from("project_references").delete().eq("owner_id", input.userId);
  await admin.from("brand_kits").delete().eq("owner_id", input.userId);
  await admin.from("logo_concepts").delete().eq("owner_id", input.userId);
  await admin.from("generation_jobs").delete().eq("owner_id", input.userId);
  await admin.from("logo_projects").delete().eq("owner_id", input.userId);
  await admin.from("user_preferences").delete().eq("user_id", input.userId);
  await admin.from("user_profiles").delete().eq("user_id", input.userId);
  deleted.push("database rows");

  const { error } = await admin.auth.admin.deleteUser(input.userId);
  if (error) {
    // Partial failure: mark deactivated so APIs stay blocked; surface honesty.
    await deactivateAccount(input.userClient, input.userId);
    throw new Error(
      `Storage/DB cleanup ran, but Auth user delete failed: ${error.message}. Account was deactivated instead.`,
    );
  }
  deleted.push("auth user");

  return {
    mode: "hard_delete",
    message: "Account permanently deleted. Auth user and owned data were removed.",
    deleted,
  };
}
