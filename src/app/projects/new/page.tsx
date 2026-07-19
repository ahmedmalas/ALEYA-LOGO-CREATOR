"use client";

import { ReferenceUploader } from "@/components/project/reference-uploader";
import { AppShell } from "@/components/shell";
import {
  LAYOUTS,
  LOGO_STYLES,
  PERSONALITIES,
  TYPOGRAPHY_DIRECTIONS,
} from "@/types/logo";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";

function NewProjectForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setStatus(null);
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

    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          res.status === 401
            ? "Your session expired. Sign in again to continue."
            : (json.error ?? "Could not create project"),
        );
        return;
      }
      const projectId = json.project.id as string;
      setStatus("Project saved. Uploading queued references…");
      window.dispatchEvent(
        new CustomEvent("aleya:flush-references", { detail: { projectId } }),
      );
      // Give uploads a short window, then open the studio (uploads continue there if needed).
      await new Promise((resolve) => window.setTimeout(resolve, 1200));
      router.push(`/projects/${projectId}`);
    } catch {
      setError("Could not create the project. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl animate-rise">
        <p className="text-xs uppercase tracking-[0.18em] text-[var(--forest)]">Workflow</p>
        <h1 className="mt-2 text-3xl">Create New Logo</h1>
        <p className="mt-1 text-black/60">
          Enter business details, upload references, then generate concepts in the project studio.
        </p>
        <ol className="mt-4 flex flex-wrap gap-2 text-xs uppercase tracking-wide text-black/55">
          <li className="rounded-full bg-[rgba(31,77,69,0.12)] px-3 py-1 text-[var(--forest-deep)]">
            1. Details
          </li>
          <li className="rounded-full bg-[rgba(31,77,69,0.12)] px-3 py-1 text-[var(--forest-deep)]">
            2. References
          </li>
          <li className="rounded-full bg-black/5 px-3 py-1">3. Generate</li>
        </ol>
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
            <span>Preferred colours (hex)</span>
            <input name="preferredColors" placeholder="#1F4D45, #B08A4F" />
          </label>
          <label className="field md:col-span-2">
            <span>Colours to avoid (hex)</span>
            <input name="avoidColors" placeholder="#FF00FF" />
          </label>
          <label className="field md:col-span-2">
            <span>Icon or symbol ideas</span>
            <textarea name="iconIdeas" rows={3} placeholder="Abstract leaf mark, geometric N monogram" />
          </label>

          <ReferenceUploader projectId={null} />

          {error ? (
            <p className="md:col-span-2 text-sm text-[var(--danger)]" role="alert">
              {error}
            </p>
          ) : null}
          {status ? (
            <p className="md:col-span-2 text-sm text-[var(--forest-deep)]" role="status">
              {status}
            </p>
          ) : null}
          <div className="md:col-span-2 flex flex-wrap gap-3">
            <button className="btn btn-primary" disabled={loading} type="submit">
              {loading ? "Saving…" : "Save and continue"}
            </button>
            <Link href="/dashboard" className="btn btn-secondary">
              Cancel to dashboard
            </Link>
          </div>
        </form>
      </div>
    </AppShell>
  );
}

export default function NewProjectPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-black/60">Loading project form…</div>}>
      <NewProjectForm />
    </Suspense>
  );
}
