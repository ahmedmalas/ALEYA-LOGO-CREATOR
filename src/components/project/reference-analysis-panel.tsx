"use client";

import { VISUAL_ANALYSIS_UNAVAILABLE_MESSAGE } from "@/lib/references/analysis-types";
import { useState } from "react";

export type AnalysisFields = {
  existingLogoText: string;
  symbolsAndShapes: string[];
  layout: string;
  colourPalette: string[];
  typographyCharacteristics: string;
  visualStyle: string;
  packagingContext: string;
  elementsToPreserve: string[];
  elementsToAvoid: string[];
  summary: string;
  pdfPagesProcessed: number[];
};

type Props = {
  projectId: string;
  referenceId: string;
  analysisStatus?: string;
  analysisMode?: string | null;
  analysisError?: string | null;
  analysisProvider?: string | null;
  analysisModel?: string | null;
  analysis?: Partial<AnalysisFields> | null;
  analysisConfirmed?: Partial<AnalysisFields> | null;
  pdfPagesProcessed?: number[];
  visionAvailable?: boolean;
  onUpdated?: () => void;
};

function asList(value: string[] | string | undefined): string {
  if (Array.isArray(value)) return value.join(", ");
  return value ?? "";
}

function toList(value: string): string[] {
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

export function ReferenceAnalysisPanel({
  projectId,
  referenceId,
  analysisStatus,
  analysisMode,
  analysisError,
  analysisProvider,
  analysisModel,
  analysis,
  analysisConfirmed,
  pdfPagesProcessed,
  visionAvailable,
  onUpdated,
}: Props) {
  const source = analysisConfirmed ?? analysis ?? {};
  const [draft, setDraft] = useState({
    summary: source.summary ?? "",
    existingLogoText: source.existingLogoText ?? "",
    symbolsAndShapes: asList(source.symbolsAndShapes),
    layout: source.layout ?? "",
    colourPalette: asList(source.colourPalette),
    typographyCharacteristics: source.typographyCharacteristics ?? "",
    visualStyle: source.visualStyle ?? "",
    packagingContext: source.packagingContext ?? "",
    elementsToPreserve: asList(source.elementsToPreserve),
    elementsToAvoid: asList(source.elementsToAvoid),
  });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const visuallyAnalysed = analysisStatus === "succeeded" && analysisMode === "visual";
  const pages = pdfPagesProcessed?.length
    ? pdfPagesProcessed
    : source.pdfPagesProcessed ?? [];

  async function save() {
    setBusy(true);
    setError(null);
    setMessage(null);
    const res = await fetch(`/api/projects/${projectId}/references`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        referenceId,
        action: "confirm_analysis",
        analysisConfirmed: {
          summary: draft.summary,
          existingLogoText: draft.existingLogoText,
          symbolsAndShapes: toList(draft.symbolsAndShapes),
          layout: draft.layout,
          colourPalette: toList(draft.colourPalette),
          typographyCharacteristics: draft.typographyCharacteristics,
          visualStyle: draft.visualStyle,
          packagingContext: draft.packagingContext,
          elementsToPreserve: toList(draft.elementsToPreserve),
          elementsToAvoid: toList(draft.elementsToAvoid),
          pdfPagesProcessed: pages,
        },
      }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(json.error ?? "Could not save analysis corrections");
      return;
    }
    setMessage("Saved your corrections. They will be used in the next generation.");
    onUpdated?.();
  }

  async function reanalyse() {
    setBusy(true);
    setError(null);
    setMessage(null);
    const res = await fetch(`/api/projects/${projectId}/references`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ referenceId, action: "reanalyse" }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(json.error ?? "Could not re-run analysis");
      return;
    }
    setMessage("Analysis refreshed.");
    onUpdated?.();
  }

  return (
    <div className="space-y-2 rounded-xl bg-[rgba(31,77,69,0.05)] p-3" data-testid="reference-analysis">
      <p className="text-xs font-medium uppercase tracking-wide text-[var(--forest)]">
        Reference analysis
      </p>

      {!visionAvailable || analysisStatus === "unavailable" || analysisMode === "metadata_only" ? (
        <p className="text-sm text-amber-950" data-testid="visual-analysis-unavailable">
          {analysisError || VISUAL_ANALYSIS_UNAVAILABLE_MESSAGE}
        </p>
      ) : null}

      {analysisStatus === "failed" ? (
        <p className="text-sm text-[var(--danger)]">Visual analysis failed: {analysisError}</p>
      ) : null}

      {visuallyAnalysed ? (
        <p className="text-xs text-black/55">
          Analysed with {analysisProvider}/{analysisModel}. You can correct anything below before
          generating.
        </p>
      ) : null}

      {pages.length ? (
        <p className="text-xs text-black/55">PDF pages processed: {pages.join(", ")}</p>
      ) : null}

      {visuallyAnalysed || analysisConfirmed ? (
        <div className="grid gap-2 sm:grid-cols-2">
          {(
            [
              ["summary", "Summary"],
              ["existingLogoText", "Existing logo text"],
              ["symbolsAndShapes", "Symbols / shapes"],
              ["layout", "Layout"],
              ["colourPalette", "Colour palette"],
              ["typographyCharacteristics", "Typography"],
              ["visualStyle", "Visual style"],
              ["packagingContext", "Packaging context"],
              ["elementsToPreserve", "Preserve"],
              ["elementsToAvoid", "Avoid"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className={`field ${key === "summary" ? "sm:col-span-2" : ""}`}>
              <span className="text-xs">{label}</span>
              <input
                value={draft[key]}
                onChange={(e) => setDraft((current) => ({ ...current, [key]: e.target.value }))}
              />
            </label>
          ))}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {(visuallyAnalysed || analysisConfirmed) && (
          <button type="button" className="btn btn-secondary text-sm" disabled={busy} onClick={() => void save()}>
            Save corrections
          </button>
        )}
        <button type="button" className="btn btn-secondary text-sm" disabled={busy} onClick={() => void reanalyse()}>
          Re-run analysis
        </button>
      </div>
      {error ? <p className="text-xs text-[var(--danger)]">{error}</p> : null}
      {message ? <p className="text-xs text-[var(--forest-deep)]">{message}</p> : null}
    </div>
  );
}
