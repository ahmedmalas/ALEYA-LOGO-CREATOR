"use client";

import { GenerationControlsPanel } from "@/components/generator/generation-controls";
import { ReferenceUploader } from "@/components/project/reference-uploader";
import { ConceptSkeletonGrid } from "@/components/ui/loading-block";
import {
  defaultGenerationControls,
  type GenerationControls,
} from "@/lib/logo/evolution";
import { applyConceptEdits } from "@/lib/logo/svg-edits";
import Link from "next/link";
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
  provider_metadata?: {
    referenceIds?: string[];
    referenceFilenames?: string[];
    conceptGroup?: string;
    conceptGroupLabel?: string;
    similarityLevel?: number;
    visualSsim?: number | null;
    modeDifferentiation?: string;
    typographySuggestion?: {
      matched?: string;
      category?: string;
      substitutes?: string[];
      rationale?: string;
    };
    sideBySideScores?: Record<
      string,
      { ssim: number; score: number; mode: string; differentiation: string }
    >;
    transformOperations?: string[];
    retained?: string;
    improved?: string;
    logoText?: string;
    generationMode?: string;
    groupMode?: string;
  } | null;
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

type LocalEdits = {
  logoText: string;
  primary: string;
  secondary: string;
  accent: string;
  svg: string;
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
  const [activeReferenceIds, setActiveReferenceIds] = useState<string[]>([]);
  const [lastReferencesUsed, setLastReferencesUsed] = useState<
    { id: string; filename: string }[]
  >([]);
  const [controls, setControls] = useState<GenerationControls>(() =>
    defaultGenerationControls({
      mode: "refine",
      exactLogoText: project.business_name,
    }),
  );
  const [edits, setEdits] = useState<Record<string, LocalEdits>>({});

  const focus = useMemo(
    () => concepts.find((c) => c.id === focusId) ?? concepts[0] ?? null,
    [concepts, focusId],
  );
  const hasConcepts = concepts.length > 0;
  const showHeaderGenerateActions = hasConcepts;

  function ensureEdits(concept: Concept): LocalEdits {
    const existing = edits[concept.id];
    if (existing) return existing;
    return {
      logoText: concept.provider_metadata?.logoText || project.business_name,
      primary: concept.palette?.primary || "#0F3D3E",
      secondary: concept.palette?.secondary || "#C4A574",
      accent: concept.palette?.accent || "#1A1A1A",
      svg: concept.svg_markup ?? "",
    };
  }

  function updateEdit(concept: Concept, patch: Partial<LocalEdits>) {
    const current = ensureEdits(concept);
    const next = { ...current, ...patch };
    next.svg = applyConceptEdits(
      concept.svg_markup ?? "",
      {
        logoText: next.logoText,
        primary: next.primary,
        secondary: next.secondary,
        accent: next.accent,
      },
      {
        logoText: concept.provider_metadata?.logoText || project.business_name,
        primary: concept.palette?.primary,
        secondary: concept.palette?.secondary,
        accent: concept.palette?.accent,
      },
    );
    setEdits((prev) => ({ ...prev, [concept.id]: next }));
  }

  async function reload() {
    const res = await fetch(`/api/projects/${project.id}`);
    const json = await res.json();
    if (res.ok) {
      setConcepts(json.concepts ?? []);
      setEdits({});
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
          referenceIds: activeReferenceIds,
          controls,
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
      const used = (json.referencesUsed ?? []).map(
        (r: { id: string; filename: string }) => ({
          id: r.id,
          filename: r.filename,
        }),
      );
      setLastReferencesUsed(used);
      setMessage(
        json.reused
          ? "Reused an in-flight or completed job (no duplicate charge)."
          : used.length
            ? `Generated Faithful / Refine / Advance / Explore groups using ${used.length} reference file(s).`
            : "Concept groups generated. Upload and confirm a reference for true mirroring.",
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
          referenceIds: activeReferenceIds,
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
      const used = (json.referencesUsed ?? []).map(
        (r: { id: string; filename: string }) => ({
          id: r.id,
          filename: r.filename,
        }),
      );
      setLastReferencesUsed(used);
      setMessage(
        used.length
          ? `Refined concept created using ${used.length} reference file(s).`
          : "Refined concept created.",
      );
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
              {busy === "generate" ? "Generating…" : "Generate evolution set"}
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

      <div className="panel rounded-3xl p-5 md:p-6">
        <ReferenceUploader
          projectId={project.id}
          onActiveChange={setActiveReferenceIds}
        />
        {lastReferencesUsed.length ? (
          <p className="mt-4 text-sm text-black/60" data-testid="references-used-summary">
            Last generation used:{" "}
            {lastReferencesUsed.map((r) => r.filename).join(", ")}
          </p>
        ) : null}
      </div>

      <GenerationControlsPanel value={controls} onChange={setControls} disabled={Boolean(busy)} />

      <ol className="flex flex-wrap gap-2 text-xs uppercase tracking-wide text-black/55">
        <li className="rounded-full bg-black/5 px-3 py-1">1. Brief</li>
        <li className="rounded-full bg-black/5 px-3 py-1">2. Analyse reference</li>
        <li className="rounded-full bg-[rgba(31,77,69,0.12)] px-3 py-1 text-[var(--forest-deep)]">
          3. Evolve
        </li>
        <li className="rounded-full bg-black/5 px-3 py-1">4. Compare / refine</li>
        <li className="rounded-full bg-black/5 px-3 py-1">5. Brand Kit</li>
      </ol>

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
              : "Building Faithful, Refine, Advance and Explore directions…"}
          </p>
          <ConceptSkeletonGrid />
        </div>
      ) : null}

      {!(busy === "generate" || busy === "regenerate" || busy === "refine") ? (
        <div className="grid gap-4 md:grid-cols-2">
          {concepts.map((concept, index) => {
            const local = ensureEdits(concept);
            const meta = concept.provider_metadata;
            return (
              <article
                key={concept.id}
                className={`panel animate-rise overflow-hidden rounded-2xl ${focus?.id === concept.id ? "ring-2 ring-[var(--forest)]" : ""}`}
                style={{ animationDelay: `${index * 70}ms` }}
                data-concept-group={meta?.conceptGroup || ""}
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
                      __html: local.svg || concept.svg_markup || "<p>No preview</p>",
                    }}
                  />
                  <div className="space-y-2 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <h2 className="text-lg">{meta?.conceptGroupLabel || concept.title}</h2>
                      {typeof meta?.similarityLevel === "number" ? (
                        <span className="text-xs uppercase tracking-wide text-[var(--forest)]">
                          vs original {meta.similarityLevel}%
                          {typeof meta.visualSsim === "number"
                            ? ` · SSIM ${meta.visualSsim.toFixed(2)}`
                            : ""}
                        </span>
                      ) : null}
                    </div>
                    <p className="text-sm text-black/55">
                      {concept.layout}
                      {meta?.groupMode ? ` · ${meta.groupMode}` : ""}
                    </p>
                    {meta?.modeDifferentiation ? (
                      <p className="text-xs text-black/65">{meta.modeDifferentiation}</p>
                    ) : null}
                    {meta?.retained ? (
                      <p className="text-xs text-black/60">
                        <span className="font-medium text-[var(--forest-deep)]">Retained:</span>{" "}
                        {meta.retained}
                      </p>
                    ) : null}
                    {meta?.improved ? (
                      <p className="text-xs text-black/60">
                        <span className="font-medium text-[var(--forest-deep)]">Improved:</span>{" "}
                        {meta.improved}
                      </p>
                    ) : null}
                    {meta?.typographySuggestion?.matched ? (
                      <p className="text-xs text-black/60">
                        <span className="font-medium text-[var(--forest-deep)]">Typography:</span>{" "}
                        {meta.typographySuggestion.matched}
                        {meta.typographySuggestion.substitutes?.length
                          ? ` · substitutes ${meta.typographySuggestion.substitutes.slice(0, 2).join(", ")}`
                          : ""}
                      </p>
                    ) : null}
                    {meta?.referenceFilenames?.length ? (
                      <p className="text-xs text-black/50">
                        References used: {meta.referenceFilenames.join(", ")}
                      </p>
                    ) : null}
                  </div>
                </button>

                <div className="grid gap-2 border-t border-black/5 px-4 py-3 sm:grid-cols-2">
                  <label className="field">
                    <span className="text-xs">Editable text</span>
                    <input
                      value={local.logoText}
                      onChange={(e) => updateEdit(concept, { logoText: e.target.value })}
                    />
                  </label>
                  <label className="field">
                    <span className="text-xs">Primary</span>
                    <input
                      type="color"
                      value={local.primary}
                      onChange={(e) => updateEdit(concept, { primary: e.target.value })}
                    />
                  </label>
                  <label className="field">
                    <span className="text-xs">Secondary</span>
                    <input
                      type="color"
                      value={local.secondary}
                      onChange={(e) => updateEdit(concept, { secondary: e.target.value })}
                    />
                  </label>
                  <label className="field">
                    <span className="text-xs">Accent</span>
                    <input
                      type="color"
                      value={local.accent}
                      onChange={(e) => updateEdit(concept, { accent: e.target.value })}
                    />
                  </label>
                </div>

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
                    Download SVG/PNG
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
            );
          })}
        </div>
      ) : null}

      {!hasConcepts && !busy ? (
        <div className="panel rounded-3xl p-8 md:p-10" data-testid="empty-generate-state">
          <h2 className="text-xl">Ready to evolve your logo</h2>
          <p className="mt-2 max-w-xl text-black/60">
            Upload a reference, confirm the visual analysis, set Mirror / Refine / Advance / Explore
            controls, then generate a labelled evolution set — not random unrelated concepts.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              className="btn btn-primary"
              disabled={Boolean(busy)}
              onClick={() => generate("generate")}
              data-testid="empty-generate-button"
            >
              Generate evolution set
            </button>
            <Link href="/dashboard" className="btn btn-secondary">
              Back to dashboard
            </Link>
          </div>
        </div>
      ) : null}

      {selectedIds.length > 0 ? (
        <section className="panel rounded-2xl p-5">
          <h2 className="text-xl">Side-by-side compare</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {concepts
              .filter((c) => selectedIds.includes(c.id))
              .map((c) => (
                <div key={c.id}>
                  <p className="mb-2 text-xs uppercase tracking-wide text-black/50">
                    {c.provider_metadata?.conceptGroupLabel || c.title}
                  </p>
                  <div
                    className="rounded-xl p-3"
                    style={{ background: previewMode === "light" ? "#F7F4EF" : "#121212" }}
                    dangerouslySetInnerHTML={{
                      __html: edits[c.id]?.svg || c.svg_markup || "",
                    }}
                  />
                </div>
              ))}
          </div>
        </section>
      ) : null}

      {focus ? (
        <section className="panel rounded-2xl p-5">
          <h2 className="text-xl">
            Refine “{focus.provider_metadata?.conceptGroupLabel || focus.title}”
          </h2>
          <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap rounded-xl bg-black/[0.03] p-3 text-xs text-black/65">
            {focus.prompt}
          </pre>
          <label className="field mt-4">
            <span className="sr-only">Refine instruction</span>
            <textarea
              className="w-full rounded-xl border border-black/10 bg-white/70 p-3"
              rows={3}
              value={refineText}
              onChange={(e) => setRefineText(e.target.value)}
              aria-label="Refine instruction"
              placeholder="Tighten kerning, simplify the mark, strengthen the monogram…"
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
