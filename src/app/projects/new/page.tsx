"use client";

import { AppShell } from "@/components/shell";
import {
  LAYOUTS,
  LOGO_STYLES,
  PERSONALITIES,
  TYPOGRAPHY_DIRECTIONS,
} from "@/types/logo";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";

function NewProjectForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const preferredColors = String(form.get("preferredColors") ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const avoidColors = String(form.get("avoidColors") ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const payload = {
      businessName: String(form.get("businessName") ?? ""),
      tagline: String(form.get("tagline") ?? "") || undefined,
      industry: String(form.get("industry") ?? ""),
      personality: String(form.get("personality") ?? ""),
      style: String(form.get("style") ?? ""),
      preferredColors,
      avoidColors,
      iconIdeas: String(form.get("iconIdeas") ?? "") || undefined,
      typographyDirection: String(form.get("typographyDirection") ?? ""),
      layoutDirection: String(form.get("layoutDirection") ?? ""),
      aleyaBusinessId: params.get("business_id") || undefined,
      aleyaReturnUrl: params.get("return_url") || undefined,
    };

    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(json.error ?? "Could not create project");
      return;
    }
    router.push(`/projects/${json.project.id}`);
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl animate-rise">
        <h1 className="text-3xl">New logo project</h1>
        <p className="mt-1 text-black/60">Tell us about the brand. Then generate multiple concepts.</p>
        <form className="panel mt-6 grid gap-4 rounded-3xl p-6 md:grid-cols-2" onSubmit={onSubmit}>
          <label className="field md:col-span-2">
            <span>Business name</span>
            <input name="businessName" required maxLength={120} placeholder="Northwind Studio" />
          </label>
          <label className="field md:col-span-2">
            <span>Tagline (optional)</span>
            <input name="tagline" maxLength={160} placeholder="Clarity in every detail" />
          </label>
          <label className="field">
            <span>Industry</span>
            <input name="industry" required placeholder="Architecture" />
          </label>
          <label className="field">
            <span>Brand personality</span>
            <select name="personality" defaultValue="refined">
              {PERSONALITIES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Style</span>
            <select name="style" defaultValue="modern">
              {LOGO_STYLES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Typography direction</span>
            <select name="typographyDirection" defaultValue="geometric-sans">
              {TYPOGRAPHY_DIRECTIONS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Layout direction</span>
            <select name="layoutDirection" defaultValue="icon-left">
              {LAYOUTS.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Preferred colours</span>
            <input name="preferredColors" placeholder="#1F4D45, #B08A4F" />
          </label>
          <label className="field md:col-span-2">
            <span>Colours to avoid</span>
            <input name="avoidColors" placeholder="#FF00FF" />
          </label>
          <label className="field md:col-span-2">
            <span>Icon or symbol ideas</span>
            <textarea name="iconIdeas" rows={3} placeholder="Abstract leaf mark, geometric N monogram" />
          </label>
          {error ? <p className="md:col-span-2 text-sm text-[var(--danger)]">{error}</p> : null}
          <div className="md:col-span-2">
            <button className="btn btn-primary" disabled={loading} type="submit">
              {loading ? "Saving…" : "Save project"}
            </button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}

export default function NewProjectPage() {
  return (
    <Suspense>
      <NewProjectForm />
    </Suspense>
  );
}
