"use client";

import { FormEvent, useEffect, useState } from "react";

type ProfileResponse = {
  email?: string;
  avatarUrl?: string | null;
  profile?: {
    display_name: string | null;
    business_name: string | null;
    phone: string | null;
    country: string | null;
    timezone: string | null;
    preferred_language: string | null;
  };
};

export default function AccountProfilePage() {
  const [data, setData] = useState<ProfileResponse | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/account/profile");
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(json.error ?? "Could not load profile");
      setLoading(false);
      return;
    }
    setData(json);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  async function onSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    const form = new FormData(event.currentTarget);
    const res = await fetch("/api/account/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        displayName: String(form.get("displayName") ?? ""),
        businessName: String(form.get("businessName") ?? "") || null,
        phone: String(form.get("phone") ?? "") || null,
        country: String(form.get("country") ?? "") || null,
        timezone: String(form.get("timezone") ?? "UTC"),
        preferredLanguage: String(form.get("preferredLanguage") ?? "en"),
      }),
    });
    const json = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setError(json.error ?? "Could not save profile");
      return;
    }
    setMessage(json.message ?? "Profile saved.");
    await load();
  }

  async function onAvatar(file: File | null) {
    if (!file) return;
    setError(null);
    setMessage(null);
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/account/avatar", { method: "POST", body: form });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(json.error ?? "Avatar upload failed");
      return;
    }
    setMessage("Avatar updated.");
    await load();
  }

  if (loading) return <p className="text-black/60">Loading profile…</p>;

  return (
    <form className="panel space-y-4 rounded-3xl p-6" onSubmit={onSave} data-testid="profile-form">
      <div className="flex flex-wrap items-center gap-4">
        {data?.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={data.avatarUrl} alt="" className="h-16 w-16 rounded-full object-cover" />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--mist)] text-lg font-semibold">
            {(data?.profile?.display_name || data?.email || "?").slice(0, 1).toUpperCase()}
          </div>
        )}
        <label className="btn btn-secondary cursor-pointer">
          Upload avatar
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="sr-only"
            onChange={(e) => void onAvatar(e.target.files?.[0] ?? null)}
          />
        </label>
      </div>

      <label className="field">
        <span>Email</span>
        <input value={data?.email ?? ""} disabled readOnly />
      </label>
      <label className="field">
        <span>Display name</span>
        <input
          name="displayName"
          required
          defaultValue={data?.profile?.display_name ?? ""}
          maxLength={80}
        />
      </label>
      <label className="field">
        <span>Business / organisation name</span>
        <input name="businessName" defaultValue={data?.profile?.business_name ?? ""} maxLength={120} />
      </label>
      <label className="field">
        <span>Phone (optional)</span>
        <input name="phone" defaultValue={data?.profile?.phone ?? ""} maxLength={40} />
      </label>
      <label className="field">
        <span>Country</span>
        <input name="country" defaultValue={data?.profile?.country ?? ""} maxLength={80} />
      </label>
      <label className="field">
        <span>Timezone</span>
        <input name="timezone" defaultValue={data?.profile?.timezone ?? "UTC"} maxLength={80} />
      </label>
      <label className="field">
        <span>Preferred language</span>
        <select name="preferredLanguage" defaultValue={data?.profile?.preferred_language ?? "en"}>
          <option value="en">English</option>
          <option value="en-AU">English (Australia)</option>
        </select>
      </label>

      {error ? (
        <p className="text-sm text-[var(--danger)]" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="text-sm text-[var(--forest-deep)]" role="status">
          {message}
        </p>
      ) : null}
      <button className="btn btn-primary" disabled={saving} type="submit">
        {saving ? "Saving…" : "Save profile"}
      </button>
    </form>
  );
}
