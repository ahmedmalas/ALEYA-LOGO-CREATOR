"use client";

import { useState, useTransition } from "react";
import type { InvoiceAnalysis, InvoiceRecreationMode, InvoiceTemplate } from "@/lib/invoice/types";

type AnalyseResponse = {
  documentType: string;
  analysis: InvoiceAnalysis;
  text?: string;
  source: string;
};

type RecreateResponse = {
  mode: InvoiceRecreationMode;
  template: InvoiceTemplate;
  html: string;
  differentiation: string;
};

const MODES: { id: InvoiceRecreationMode; label: string; blurb: string }[] = [
  {
    id: "mirror",
    label: "Mirror",
    blurb: "Faithful full-page recreation of the uploaded invoice.",
  },
  {
    id: "refine",
    label: "Refine",
    blurb: "Same identity — cleaner spacing, hierarchy and print quality.",
  },
  {
    id: "advance",
    label: "Advance",
    blurb: "Modern evolution that still descends from the original.",
  },
];

export function InvoiceStudio() {
  const [analysis, setAnalysis] = useState<InvoiceAnalysis | null>(null);
  const [mode, setMode] = useState<InvoiceRecreationMode>("refine");
  const [recreations, setRecreations] = useState<Record<string, RecreateResponse>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [exportUrl, setExportUrl] = useState<string | null>(null);

  function runAnalyse(useFixture: boolean, file?: File | null) {
    setError(null);
    startTransition(async () => {
      try {
        let res: Response;
        if (useFixture) {
          res = await fetch("/api/invoice/analyse?fixture=northwind", { method: "POST" });
        } else {
          if (!file) throw new Error("Choose an invoice PDF or image");
          const form = new FormData();
          form.set("file", file);
          res = await fetch("/api/invoice/analyse", { method: "POST", body: form });
        }
        const json = (await res.json()) as AnalyseResponse & { error?: string };
        if (!res.ok) throw new Error(json.error || "Analysis failed");
        setAnalysis(json.analysis);
        setRecreations({});
        setExportUrl(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Analysis failed");
      }
    });
  }

  function runRecreate(nextMode: InvoiceRecreationMode) {
    if (!analysis) return;
    setMode(nextMode);
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/invoice/recreate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ analysis, mode: nextMode }),
        });
        const json = (await res.json()) as RecreateResponse & { error?: string };
        if (!res.ok) throw new Error(json.error || "Recreation failed");
        setRecreations((prev) => ({ ...prev, [nextMode]: json }));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Recreation failed");
      }
    });
  }

  function runExport() {
    if (!analysis) return;
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/invoice/export", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ analysis, mode }),
        });
        if (!res.ok) {
          const json = (await res.json()) as { error?: string };
          throw new Error(json.error || "Export failed");
        }
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        setExportUrl(url);
        const a = document.createElement("a");
        a.href = url;
        a.download = `invoice-template-${mode}.zip`;
        a.click();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Export failed");
      }
    });
  }

  const active = recreations[mode];

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-10 md:px-8">
      <header className="space-y-3">
        <p className="brand text-4xl text-[var(--forest-deep)]">ALEYA</p>
        <h1 className="text-2xl font-medium">Invoice reconstruction &amp; template authoring</h1>
        <p className="max-w-2xl text-black/65">
          Upload an invoice PDF or image. ALEYA analyses the full page, recreates it as an editable
          template (Mirror / Refine / Advance), and exports a package for Aleya Invoicing.
        </p>
      </header>

      <section className="panel space-y-4 rounded-2xl p-5">
        <h2 className="text-lg">1. Upload or load sample</h2>
        <div className="flex flex-wrap items-center gap-3">
          <label className="field">
            <span className="text-xs">Invoice PDF / image</span>
            <input
              type="file"
              accept="application/pdf,image/*"
              onChange={(e) => runAnalyse(false, e.target.files?.[0] ?? null)}
            />
          </label>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={pending}
            onClick={() => runAnalyse(true)}
          >
            Load Northwind sample invoice
          </button>
        </div>
      </section>

      {analysis ? (
        <section className="panel space-y-3 rounded-2xl p-5">
          <h2 className="text-lg">2. Detected fields</h2>
          <p className="text-sm text-black/60">{analysis.summary}</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 text-sm">
            <Field label="Company" value={analysis.companyName} />
            <Field label="Customer" value={analysis.customerName} />
            <Field label="Invoice #" value={analysis.invoiceNumber} />
            <Field label="Issue" value={analysis.issueDate} />
            <Field label="Due" value={analysis.dueDate} />
            <Field label="Total" value={String(analysis.total)} />
            <Field label="Line items" value={String(analysis.items.length)} />
            <Field label="Confidence" value={`${Math.round(analysis.confidence * 100)}%`} />
          </div>
          <label className="field">
            <span className="text-xs">Correct company name</span>
            <input
              value={analysis.companyName}
              onChange={(e) => setAnalysis({ ...analysis, companyName: e.target.value })}
            />
          </label>
          <label className="field">
            <span className="text-xs">Correct customer name</span>
            <input
              value={analysis.customerName}
              onChange={(e) => setAnalysis({ ...analysis, customerName: e.target.value })}
            />
          </label>
        </section>
      ) : null}

      {analysis ? (
        <section className="panel space-y-4 rounded-2xl p-5">
          <h2 className="text-lg">3. Recreate</h2>
          <div className="grid gap-3 md:grid-cols-3">
            {MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                className={`rounded-xl border p-4 text-left transition ${
                  mode === m.id ? "border-[var(--forest)] bg-[var(--forest)]/5" : "border-black/10"
                }`}
                disabled={pending}
                onClick={() => runRecreate(m.id)}
              >
                <div className="font-medium">{m.label}</div>
                <p className="mt-1 text-xs text-black/60">{m.blurb}</p>
              </button>
            ))}
          </div>
          {active ? (
            <div className="space-y-2">
              <p className="text-sm text-black/65">{active.differentiation}</p>
              <p className="text-xs text-black/50">
                Regions: {active.template.regions.map((r) => r.type).join(", ")} · Variables:{" "}
                {active.template.variables.length}
              </p>
              <div
                className="overflow-auto rounded-xl border border-black/10 bg-[#e8ebe9]"
                dangerouslySetInnerHTML={{ __html: active.html }}
              />
            </div>
          ) : (
            <p className="text-sm text-black/55">Choose a mode to generate the full-page recreation.</p>
          )}
        </section>
      ) : null}

      {analysis ? (
        <section className="panel space-y-3 rounded-2xl p-5">
          <h2 className="text-lg">4. Export for Aleya Invoicing</h2>
          <p className="text-sm text-black/60">
            Downloads an <code>aleya.invoiceTemplate</code> ZIP (<code>template.json</code> + assets)
            that Aleya Invoicing can import to generate real customer PDFs.
          </p>
          <button type="button" className="btn btn-primary" disabled={pending} onClick={runExport}>
            Export template package
          </button>
          {exportUrl ? (
            <p className="text-xs text-black/50">
              Package ready — import via{" "}
              <code>POST /api/integrations/invoice-templates/import</code> in Aleya Invoicing.
            </p>
          ) : null}
        </section>
      ) : null}

      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {pending ? <p className="text-sm text-black/50">Working…</p> : null}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-black/[0.03] px-3 py-2">
      <div className="text-[10px] uppercase tracking-wide text-black/45">{label}</div>
      <div className="truncate">{value || "—"}</div>
    </div>
  );
}
