import { ensureProfile, getPreferences } from "@/lib/account/profile";
import { handleRouteError, jsonError, jsonOk, requireUser } from "@/lib/security/api";
import { z } from "zod";

const schema = z.object({
  defaultLogoStyles: z.array(z.string()).max(12).optional(),
  preferredColourDirections: z.array(z.string()).max(12).optional(),
  defaultExportFormats: z.array(z.string()).max(12).optional(),
  emailProductUpdates: z.boolean().optional(),
  emailMarketing: z.boolean().optional(),
  reduceMotion: z.boolean().optional(),
  highContrast: z.boolean().optional(),
});

export async function GET() {
  try {
    const { supabase, user } = await requireUser();
    await ensureProfile(supabase, user.id, user.email);
    const preferences = await getPreferences(supabase, user.id);
    return jsonOk({ preferences });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const { supabase, user } = await requireUser();
    await ensureProfile(supabase, user.id, user.email);
    const body = schema.parse(await request.json());
    const { data, error } = await supabase
      .from("user_preferences")
      .update({
        default_logo_styles: body.defaultLogoStyles,
        preferred_colour_directions: body.preferredColourDirections,
        default_export_formats: body.defaultExportFormats,
        email_product_updates: body.emailProductUpdates,
        email_marketing: body.emailMarketing,
        reduce_motion: body.reduceMotion,
        high_contrast: body.highContrast,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id)
      .select("*")
      .single();
    if (error) return jsonError(error.message, 400);
    return jsonOk({ preferences: data, message: "Preferences saved." });
  } catch (error) {
    return handleRouteError(error);
  }
}
