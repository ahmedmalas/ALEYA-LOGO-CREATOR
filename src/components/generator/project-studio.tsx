"use client";

import { ConceptSkeletonGrid } from "@/components/ui/loading-block";
import { useMemo, useState } from "react";

type Concept = {
  id: string;
  title: string;
  prompt: string;
  svg_markup: string | null;
  layout: string;
  palette: { primary?: string; secondary?: string; accent?: string };
  icon_concept: string | null;
  is_selected: boolean;
  light_preview_path?: string | null;
  dark_preview_path?: string | null;
};

type Project = {
  id: string;
  business_name: string;
  tagline: string | null;
  style: string;
  industry: string;
  status: string;
  aleya_business_id?: string | null;
};

export function ProjectStudio({
  project,
  initialConcepts,
}: {
  project: Project;
  initialConcepts: Concept[];
}) {
  const [concepts, setConcepts] = useState(initialConcepts);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [previewMode, setPreviewMode] = useState<"light" | "dark">("light");
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refineText, setRefineText] = useState("");
  const [focusId, setFocusId] = useState<string | null>(initialConcepts[0]?.id ?? null);

  const focus = useMemo(
    () => concepts.find((c) => c.id === focusId) ?? concepts[0] ?? null,
    [concepts, focusId],
  );
  const hasConcepts = concepts.length > 0;
  const showHeaderGenerateActions = hasConcepts;

  async function reload() {
    const res = await fetch(`/api/projects/${project.id}`);
    const json = await res.json();
    if (res.ok) {
      setConcepts(json.concepts ?? []);
    }
  }

  async function generate(kind: "generate" | "regenerate" = "generate") {
    setBusy(kind);
    setError(null);
    setMessage(null);
    try {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        setError("You appear to be offline. Reconnect and try again.");
        return;
      }
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: project.id,
          count: 4,
          kind,
          idempotencyKey: `${kind}:${project.id}:${crypto.randomUUID()}`,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          res.status === 401
            ? "Your session expired. Sign in again to continue."
            : (json.error ?? "Generation failed. Please try again."),
        );
        return;
      }
      setMessage(
        json.reused
          ? "Reused an in-flight or completed job (no duplicate charge)."
          : "Concepts generated.",
      );
      await reload();
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setBusy(null);
    }
  }

  async function refine() {
    if (!focus || !refineText.trim()) return;
    setBusy("refine");
    setError(null);
    try {
      const res = await fetch("/api/refine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: project.id,
          conceptId: focus.id,
          instruction: refineText.trim(),
          idempotencyKey: `refine:${focus.id}:${crypto.randomUUID()}`,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          res.status === 401
            ? "Your session expired. Sign in again to continue."
            : (json.error ?? "Refine failed. Please try again."),
        );
        return;
      }
      setMessage("Refined concept created.");
      setRefineText("");
      await reload();
    } catch {
      setError("Could not refine this concept. Check your connection and try again.");
    } finally {
      setBusy(null);
    }
  }

  async function selectFinal(conceptId: string) {
    setBusy("select");
    setError(null);
    try {
      const res = await fetch("/api/select", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: project.id,
          conceptId,
          deliverToAleya: Boolean(project.aleya_business_id),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error ?? "Could not save selection");
        return;
      }
      setMessage(
        json.delivery?.delivered
          ? "Brand Kit saved and delivered to Aleya Invoicing."
          : "Brand Kit saved. Open Brand Kits to edit or export.",
      );
      await reload();
      if (json.brandKit?.id) {
        window.location.href = `/brand-kits/${json.brandKit.id}`;
      }
    } catch {
      setError("Could not save the Brand Kit. Check your connection and try again.");
    } finally {
      setBusy(null);
    }
  }

  async function download(conceptId: string) {
    setBusy(`export:${conceptId}`);
    setError(null);
    try {
      const res = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conceptId }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError(json.error ?? "Export failed. Some assets may be missing — try again.");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `aleya-logo-${conceptId.slice(0, 8)}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("Could not download the export pack. Check your connection and try again.");
    } finally {
      setBusy(null);
    }
  }

  function toggleCompare(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length >= 3 ? prev : [...prev, id],
    );
  }

  return (
    <div className="space-y-6">
      <div className="animate-rise flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl">{project.business_name}</h1>
          <p className="text-black/60">
            {project.style} · {project.industry}
            {project.tagline ? ` · ${project.tagline}` : ""}
          </p>
        </div>
        {showHeaderGenerateActions ? (
          <div className="flex flex-wrap gap-2" data-testid="header-generate-actions">
            <button
              type="button"
              className="btn btn-primary"
              disabled={Boolean(busy)}
              onClick={() => generate("generate")}
            >
              {busy === "generate" ? "Generating…" : "Generate concepts"}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={Boolean(busy)}
              onClick={() => generate("regenerate")}
            >
              {busy === "regenerate" ? "Regenerating…" : "Regenerate"}
            </button>
          </div>
        ) : null}
      </div>

      {message ? (
        <p className="rounded-xl bg-[var(--mist)] px-4 py-3 text-sm" role="status">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-[var(--danger)]" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2" role="group" aria-label="Preview mode">
        <button
          type="button"
          className={`btn ${previewMode === "light" ? "btn-primary" : "btn-secondary"}`}
          aria-pressed={previewMode === "light"}
          onClick={() => setPreviewMode("light")}
        >
          Light preview
        </button>
        <button
          type="button"
          className={`btn ${previewMode === "dark" ? "btn-primary" : "btn-secondary"}`}
          aria-pressed={previewMode === "dark"}
          onClick={() => setPreviewMode("dark")}
        >
          Dark preview
        </button>
      </div>

      {busy === "generate" || busy === "regenerate" || busy === "refine" ? (
        <div className="space-y-3">
          <p className="animate-pulse-soft text-sm text-[var(--forest-deep)]" role="status">
            {busy === "refine"
              ? "Refining your selected concept…"
              : busy === "regenerate"
                ? "Regenerating fresh directions…"
                : "Generating distinct logo concepts…"}
          </p>
          <ConceptSkeletonGrid />
        </div>
      ) : null}

      {!(busy === "generate" || busy === "regenerate" || busy === "refine") ? (
        <div className="grid gap-4 md:grid-cols-2">
          {concepts.map((concept, index) => (
            <article
              key={concept.id}
              className={`panel animate-rise overflow-hidden rounded-2xl ${focus?.id === concept.id ? "ring-2 ring-[var(--forest)]" : ""}`}
              style={{ animationDelay: `${index * 70}ms` }}
            >
              <button
                type="button"
                className="block w-full text-left"
                onClick={() => setFocusId(concept.id)}
              >
                <div
                  className="flex min-h-56 items-center justify-center p-6"
                  style={{ background: previewMode === "light" ? "#F7F4EF" : "#121212" }}
                  role="img"
                  aria-label={`${concept.title} logo preview`}
                  dangerouslySetInnerHTML={{
                    __html: concept.svg_markup ?? "<p>No preview</p>",
                  }}
                />
                <div className="space-y-2 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-lg">{concept.title}</h2>
                    {concept.is_selected ? (
                      <span className="text-xs uppercase tracking-wide text-[var(--forest)]">Selected</span>
                    ) : null}
                  </div>
                  <p className="text-sm text-black/55">{concept.layout} · {concept.icon_concept}</p>
                </div>
              </button>
              <div className="flex flex-wrap gap-2 border-t border-black/5 px-4 py-3">
                <button
                  type="button"
                  className="btn btn-secondary min-h-10 px-3 py-2 text-sm"
                  onClick={() => toggleCompare(concept.id)}
                >
                  {selectedIds.includes(concept.id) ? "In compare" : "Compare"}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary min-h-10 px-3 py-2 text-sm"
                  disabled={Boolean(busy)}
                  onClick={() => download(concept.id)}
                >
                  Download
                </button>
                <button
                  type="button"
                  className="btn btn-primary min-h-10 px-3 py-2 text-sm"
                  disabled={Boolean(busy)}
                  onClick={() => selectFinal(concept.id)}
                >
                  Select final
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : null}

      {!hasConcepts && !busy ? (
        <div className="panel rounded-3xl p-8 md:p-10" data-testid="empty-generate-state">
          <h2 className="text-xl">Ready to generate</h2>
          <p className="mt-2 max-w-xl text-black/60">
            Your brief is saved. Generate four distinct directions, then compare, refine, and select
            a final mark to create a Brand Kit.
          </p>
          <button
            type="button"
            className="btn btn-primary mt-6"
            disabled={Boolean(busy)}
            onClick={() => generate("generate")}
            data-testid="empty-generate-button"
          >
            Generate concepts
          </button>
        </div>
      ) : null}

      {selectedIds.length > 0 ? (
        <section className="panel rounded-2xl p-5">
          <h2 className="text-xl">Side-by-side compare</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {concepts
              .filter((c) => selectedIds.includes(c.id))
              .map((c) => (
                <div
                  key={c.id}
                  className="rounded-xl p-3"
                  style={{ background: previewMode === "light" ? "#F7F4EF" : "#121212" }}
                  dangerouslySetInnerHTML={{ __html: c.svg_markup ?? "" }}
                />
              ))}
          </div>
        </section>
      ) : null}

      {focus ? (
        <section className="panel rounded-2xl p-5">
          <h2 className="text-xl">Refine “{focus.title}”</h2>
          <p className="mt-1 text-sm text-black/55">{focus.prompt}</p>
          <label className="field mt-4">
            <span className="sr-only">Refine instruction</span>
            <textarea
              className="w-full rounded-xl border border-black/10 bg-white/70 p-3"
              rows={3}
              value={refineText}
              onChange={(e) => setRefineText(e.target.value)}
              aria-label="Refine instruction"
              placeholder="Make the mark sharper, reduce detail, strengthen the monogram…"
            />
          </label>
          <button
            type="button"
            className="btn btn-primary mt-3"
            disabled={Boolean(busy) || !refineText.trim()}
            onClick={refine}
          >
            {busy === "refine" ? "Refining…" : "Refine concept"}
          </button>
        </section>
      ) : null}
    </div>
  );
}
