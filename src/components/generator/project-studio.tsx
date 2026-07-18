"use client";

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
    const json = await res.json();
    setBusy(null);
    if (!res.ok) {
      setError(json.error ?? "Generation failed");
      return;
    }
    setMessage(json.reused ? "Reused an in-flight or completed job (no duplicate charge)." : "Concepts generated.");
    await reload();
  }

  async function refine() {
    if (!focus || !refineText.trim()) return;
    setBusy("refine");
    setError(null);
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
    const json = await res.json();
    setBusy(null);
    if (!res.ok) {
      setError(json.error ?? "Refine failed");
      return;
    }
    setMessage("Refined concept created.");
    setRefineText("");
    await reload();
  }

  async function selectFinal(conceptId: string) {
    setBusy("select");
    setError(null);
    const res = await fetch("/api/select", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId: project.id,
        conceptId,
        deliverToAleya: Boolean(project.aleya_business_id),
      }),
    });
    const json = await res.json();
    setBusy(null);
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
  }

  async function download(conceptId: string) {
    setBusy(`export:${conceptId}`);
    const res = await fetch("/api/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conceptId }),
    });
    setBusy(null);
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setError(json.error ?? "Export failed");
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `aleya-logo-${conceptId.slice(0, 8)}.zip`;
    a.click();
    URL.revokeObjectURL(url);
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
        <div className="flex flex-wrap gap-2">
          <button className="btn btn-primary" disabled={Boolean(busy)} onClick={() => generate("generate")}>
            {busy === "generate" ? "Generating…" : "Generate concepts"}
          </button>
          <button className="btn btn-secondary" disabled={Boolean(busy)} onClick={() => generate("regenerate")}>
            Regenerate
          </button>
        </div>
      </div>

      {message ? <p className="rounded-xl bg-[var(--mist)] px-4 py-3 text-sm">{message}</p> : null}
      {error ? <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-[var(--danger)]">{error}</p> : null}

      <div className="flex gap-2">
        <button
          className={`btn ${previewMode === "light" ? "btn-primary" : "btn-secondary"}`}
          onClick={() => setPreviewMode("light")}
        >
          Light preview
        </button>
        <button
          className={`btn ${previewMode === "dark" ? "btn-primary" : "btn-secondary"}`}
          onClick={() => setPreviewMode("dark")}
        >
          Dark preview
        </button>
      </div>

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
              <button className="btn btn-secondary px-3 py-2 text-xs" onClick={() => toggleCompare(concept.id)}>
                {selectedIds.includes(concept.id) ? "In compare" : "Compare"}
              </button>
              <button
                className="btn btn-secondary px-3 py-2 text-xs"
                disabled={Boolean(busy)}
                onClick={() => download(concept.id)}
              >
                Download
              </button>
              <button
                className="btn btn-primary px-3 py-2 text-xs"
                disabled={Boolean(busy)}
                onClick={() => selectFinal(concept.id)}
              >
                Select final
              </button>
            </div>
          </article>
        ))}
      </div>

      {concepts.length === 0 ? (
        <div className="panel rounded-2xl p-8">
          <p>No concepts yet. Generate multiple distinct logo directions from your brief.</p>
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
          <textarea
            className="mt-4 w-full rounded-xl border border-black/10 bg-white/70 p-3"
            rows={3}
            value={refineText}
            onChange={(e) => setRefineText(e.target.value)}
            placeholder="Make the mark sharper, reduce detail, strengthen the monogram…"
          />
          <button className="btn btn-primary mt-3" disabled={Boolean(busy) || !refineText.trim()} onClick={refine}>
            {busy === "refine" ? "Refining…" : "Refine concept"}
          </button>
        </section>
      ) : null}
    </div>
  );
}
