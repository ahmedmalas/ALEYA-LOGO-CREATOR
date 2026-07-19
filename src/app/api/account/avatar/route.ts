import { ensureProfile } from "@/lib/account/profile";
import { handleRouteError, jsonError, jsonOk, requireUser } from "@/lib/security/api";

export async function POST(request: Request) {
  try {
    const { supabase, user } = await requireUser();
    await ensureProfile(supabase, user.id, user.email);
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File) || file.size <= 0) {
      return jsonError("Avatar image file is required.", 400);
    }
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      return jsonError("Avatar must be PNG, JPG, or WEBP.", 400);
    }
    if (file.size > 2 * 1024 * 1024) {
      return jsonError("Avatar must be 2 MB or smaller.", 400);
    }
    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const path = `${user.id}/avatar.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const { error: uploadError } = await supabase.storage.from("avatars").upload(path, buffer, {
      contentType: file.type,
      upsert: true,
    });
    if (uploadError) return jsonError(uploadError.message, 400);
    const { data, error } = await supabase
      .from("user_profiles")
      .update({ avatar_path: path, updated_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .select("*")
      .single();
    if (error) return jsonError(error.message, 400);
    const signed = await supabase.storage.from("avatars").createSignedUrl(path, 60 * 30);
    return jsonOk({ profile: data, avatarUrl: signed.data?.signedUrl ?? null });
  } catch (error) {
    return handleRouteError(error);
  }
}
