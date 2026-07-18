"use client";

import { useState } from "react";

type BrandKit = {
  id: string;
  name: string;
  business_name: string;
  tagline: string | null;
  primary_colors: string[];
  secondary_colors: string[];
  typography: Record<string, string>;
  logo_prompt: string | null;
  icon_concept: string | null;
  layout: string | null;
  editable_metadata: Record<string, unknown>;
  svg_markup?: string | null;
};

export function BrandKitEditor({
  kit,
  svgMarkup,
}: {
  kit: BrandKit;
  svgMarkup?: string | null;
}) {
  const [name, setName] = useState(kit.name);
  const [tagline, setTagline] = useState(kit.tagline ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/brand-kits/${kit.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        tagline: tagline || null,
        editable_metadata: {
          ...kit.editable_metadata,
          businessName: kit.business_name,
          tagline,
        },
      }),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(json.error ?? "Save failed");
      return;
    }
    setMessage("Brand Kit updated.");
  }

  async function download() {
    setBusy(true);
    const res = await fetch("/api/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ brandKitId: kit.id }),
    });
    setBusy(false);
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setError(json.error ?? "Export failed");
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `aleya-brand-kit-${kit.id.slice(0, 8)}.zip`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function deliver() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/integrate/deliver", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ brandKitId: kit.id }),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok || json.delivered === false) {
      setError(json.error ?? json.reason ?? "Delivery to Aleya failed or is not configured");
      return;
    }
    setMessage("Delivered to Aleya Invoicing.");
    if (json.returnUrl) window.location.href = json.returnUrl;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <section className="panel animate-rise rounded-3xl p-6">
        <h1 className="text-3xl">{kit.business_name}</h1>
        <p className="mt-1 text-black/60">Editable Brand Kit metadata and usage previews.</p>
        <div className="mt-6 grid gap-4">
          <label className="field">
            <span>Kit name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="field">
            <span>Tagline</span>
            <input value={tagline} onChange={(e) => setTagline(e.target.value)} />
          </label>
          <div>
            <p className="mb-2 text-sm font-medium">Primary colours</p>
            <div className="flex gap-2">
              {kit.primary_colors.map((c) => (
                <span key={c} className="h-8 w-8 rounded-full border" style={{ background: c }} title={c} />
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-sm font-medium">Secondary colours</p>
            <div className="flex gap-2">
              {kit.secondary_colors.map((c) => (
                <span key={c} className="h-8 w-8 rounded-full border" style={{ background: c }} title={c} />
              ))}
            </div>
          </div>
          <p className="text-sm text-black/60">
            Typography: {kit.typography?.display ?? "—"} / {kit.typography?.body ?? "—"}
          </p>
          <p className="text-sm text-black/60">Layout: {kit.layout}</p>
          <p className="text-sm text-black/60">Icon: {kit.icon_concept}</p>
          <p className="text-sm text-black/60">Prompt: {kit.logo_prompt}</p>
        </div>
        <div className="mt-6 flex flex-wrap gap-2">
          <button className="btn btn-primary" disabled={busy} onClick={save}>
            Save changes
          </button>
          <button className="btn btn-secondary" disabled={busy} onClick={download}>
            Download assets
          </button>
          <button className="btn btn-secondary" disabled={busy} onClick={deliver}>
            Send to Aleya
          </button>
        </div>
        {message ? <p className="mt-4 text-sm text-[var(--forest)]">{message}</p> : null}
        {error ? <p className="mt-4 text-sm text-[var(--danger)]">{error}</p> : null}
      </section>
      <section className="space-y-4">
        <div className="panel animate-rise rounded-3xl p-4" style={{ animationDelay: "80ms" }}>
          <p className="mb-2 text-sm uppercase tracking-wide text-black/45">Light usage</p>
          <div
            className="flex min-h-56 items-center justify-center rounded-2xl bg-[#F7F4EF] p-4"
            dangerouslySetInnerHTML={{ __html: svgMarkup ?? "" }}
          />
        </div>
        <div className="panel animate-rise rounded-3xl p-4" style={{ animationDelay: "140ms" }}>
          <p className="mb-2 text-sm uppercase tracking-wide text-black/45">Dark usage</p>
          <div
            className="flex min-h-56 items-center justify-center rounded-2xl bg-[#121212] p-4"
            dangerouslySetInnerHTML={{ __html: svgMarkup ?? "" }}
          />
        </div>
      </section>
    </div>
  );
}
