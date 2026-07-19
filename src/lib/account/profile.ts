import type { SupabaseClient } from "@supabase/supabase-js";

export type UserProfile = {
  user_id: string;
  display_name: string | null;
  avatar_path: string | null;
  business_name: string | null;
  phone: string | null;
  country: string | null;
  timezone: string | null;
  preferred_language: string | null;
  plan_id: string;
  plan_status: string;
  billing_provider: string | null;
  created_at: string;
  updated_at: string;
};

export type UserPreferences = {
  user_id: string;
  default_logo_styles: string[];
  preferred_colour_directions: string[];
  default_export_formats: string[];
  email_product_updates: boolean;
  email_marketing: boolean;
  reduce_motion: boolean;
  high_contrast: boolean;
};

export async function ensureProfile(supabase: SupabaseClient, userId: string, email?: string | null) {
  const { data: existing } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (existing) return existing as UserProfile;

  const display = email?.split("@")[0] || "ALEYA user";
  const { data, error } = await supabase
    .from("user_profiles")
    .upsert({
      user_id: userId,
      display_name: display,
      plan_id: "free",
      plan_status: "active",
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  await supabase.from("user_preferences").upsert({ user_id: userId });
  return data as UserProfile;
}

export async function getPreferences(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from("user_preferences")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (data) return data as UserPreferences;
  const { data: created, error: createError } = await supabase
    .from("user_preferences")
    .upsert({ user_id: userId })
    .select("*")
    .single();
  if (createError) throw new Error(createError.message);
  return created as UserPreferences;
}
