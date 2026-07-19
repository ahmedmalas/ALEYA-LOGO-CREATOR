import { ensureProfile, getPreferences } from "@/lib/account/profile";
import { handleRouteError, jsonError, jsonOk, requireUser } from "@/lib/security/api";
import { z } from "zod";

const profileSchema = z.object({
  displayName: z.string().trim().min(1).max(80).optional(),
  businessName: z.string().trim().max(120).nullable().optional(),
  phone: z.string().trim().max(40).nullable().optional(),
  country: z.string().trim().max(80).nullable().optional(),
  timezone: z.string().trim().max(80).optional(),
  preferredLanguage: z.string().trim().max(16).optional(),
});

export async function GET() {
  try {
    const { supabase, user } = await requireUser();
    const profile = await ensureProfile(supabase, user.id, user.email);
    const preferences = await getPreferences(supabase, user.id);
    let avatarUrl: string | null = null;
    if (profile.avatar_path) {
      const { data } = await supabase.storage
        .from("avatars")
        .createSignedUrl(profile.avatar_path, 60 * 30);
      avatarUrl = data?.signedUrl ?? null;
    }
    return jsonOk({
      email: user.email,
      profile,
      preferences,
      avatarUrl,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const { supabase, user } = await requireUser();
    await ensureProfile(supabase, user.id, user.email);
    const body = profileSchema.parse(await request.json());
    const { data, error } = await supabase
      .from("user_profiles")
      .update({
        display_name: body.displayName,
        business_name: body.businessName,
        phone: body.phone,
        country: body.country,
        timezone: body.timezone,
        preferred_language: body.preferredLanguage,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id)
      .select("*")
      .single();
    if (error) return jsonError(error.message, 400);
    return jsonOk({ profile: data, message: "Profile saved." });
  } catch (error) {
    return handleRouteError(error);
  }
}
