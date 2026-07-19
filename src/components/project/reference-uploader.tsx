"use client";

import {
  formatBytes,
  getReferenceLimits,
  REFERENCE_HELP_TEXT,
  type ReferenceLimits,
} from "@/lib/references/limits";
import { validateReferenceFile } from "@/lib/references/validate";
import { useCallback, useEffect, useId, useRef, useState } from "react";

const REFERENCE_KINDS = [
  { value: "logo", label: "Existing logo" },
  { value: "sketch", label: "Sketch" },
  { value: "packaging", label: "Packaging photo" },
  { value: "product", label: "Product photo" },
  { value: "screenshot", label: "Screenshot" },
  { value: "inspiration", label: "Inspiration" },
  { value: "receipt", label: "Receipt / invoice" },
  { value: "document", label: "PDF / document" },
  { value: "other", label: "Other" },
] as const;

export type ReferenceItem = {
  id: string;
  original_filename: string;
  mime_type: string;
  size_bytes: number;
  title?: string | null;
  note: string | null;
  is_active: boolean;
  kind: string;
  previewUrl?: string | null;
  signedUrl?: string | null;
  extracted_text?: string | null;
  usedInGeneration?: boolean;
};

type PendingFile = {
  localId: string;
  file: File;
  title: string;
  note: string;
  kind: string;
  progress: number;
  error: string | null;
  status: "queued" | "uploading" | "failed" | "done";
  previewUrl: string | null;
};

type Props = {
  projectId: string | null;
  /** When projectId is null, files stay pending until flushPendingUploads(projectId). */
  initialReferences?: ReferenceItem[];
  onActiveChange?: (activeIds: string[]) => void;
  onReferencesChange?: (refs: ReferenceItem[]) => void;
};

export function ReferenceUploader({
  projectId,
  initialReferences = [],
  onActiveChange,
  onReferencesChange,
}: Props) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [limits, setLimits] = useState<ReferenceLimits>(getReferenceLimits("free"));
  const [helpText, setHelpText] = useState(REFERENCE_HELP_TEXT);
  const [items, setItems] = useState<ReferenceItem[]>(initialReferences);
  const [pending, setPending] = useState<PendingFile[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!projectId) return;
    try {
      const res = await fetch(`/api/projects/${projectId}/references`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error ?? "Could not load references");
        return;
      }
      setItems(json.references ?? []);
      if (json.limits) {
        setLimits(json.limits);
        setHelpText(json.limits.helpText ?? REFERENCE_HELP_TEXT);
      }
      onReferencesChange?.(json.references ?? []);
      onActiveChange?.(
        (json.references ?? [])
          .filter((r: ReferenceItem) => r.is_active)
          .map((r: ReferenceItem) => r.id),
      );
    } catch {
      setError("Could not load references. Check your connection and try again.");
    }
  }, [projectId, onActiveChange, onReferencesChange]);

  useEffect(() => {
    // Load saved references when a project id becomes available.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional data fetch on mount/id change
    void refresh();
  }, [refresh]);

  useEffect(() => {
    onActiveChange?.(items.filter((r) => r.is_active).map((r) => r.id));
  }, [items, onActiveChange]);

  function queueFiles(fileList: FileList | File[]) {
    setError(null);
    const next: PendingFile[] = [];
    for (const file of Array.from(fileList)) {
      const validation = validateReferenceFile(file, limits);
      const previewUrl = file.type.startsWith("image/") ? URL.createObjectURL(file) : null;
      next.push({
        localId: crypto.randomUUID(),
        file,
        title: file.name.replace(/\.[^.]+$/, ""),
        note: "",
        kind: file.type === "application/pdf" ? "document" : "inspiration",
        progress: 0,
        error: validation?.message ?? null,
        status: validation ? "failed" : "queued",
        previewUrl,
      });
    }
    setPending((prev) => [...prev, ...next]);
    setStatusMessage(`${next.length} file(s) added to the upload queue.`);
  }

  async function uploadOne(entry: PendingFile, targetProjectId: string) {
    setPending((prev) =>
      prev.map((p) =>
        p.localId === entry.localId ? { ...p, status: "uploading", progress: 15, error: null } : p,
      ),
    );
    const form = new FormData();
    form.append("file", entry.file);
    form.append("title", entry.title);
    form.append("note", entry.note);
    form.append("kind", entry.kind);
    try {
      const res = await fetch(`/api/projects/${targetProjectId}/references`, {
        method: "POST",
        body: form,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPending((prev) =>
          prev.map((p) =>
            p.localId === entry.localId
              ? { ...p, status: "failed", progress: 0, error: json.error ?? "Upload failed" }
              : p,
          ),
        );
        return false;
      }
      setPending((prev) => prev.filter((p) => p.localId !== entry.localId));
      if (entry.previewUrl) URL.revokeObjectURL(entry.previewUrl);
      await refresh();
      setStatusMessage(`Uploaded ${entry.file.name}`);
      return true;
    } catch {
      setPending((prev) =>
        prev.map((p) =>
          p.localId === entry.localId
            ? { ...p, status: "failed", progress: 0, error: "Network error — retry when online." }
            : p,
        ),
      );
      return false;
    }
  }

  async function uploadQueued(targetProjectId = projectId) {
    if (!targetProjectId) {
      setStatusMessage("Save the project to finish uploading references, or keep them queued.");
      return;
    }
    const queue = pending.filter((p) => p.status === "queued" || p.status === "failed");
    for (const entry of queue) {
      if (entry.error && entry.status === "failed" && validateReferenceFile(entry.file, limits)) {
        continue;
      }
      await uploadOne({ ...entry, error: null, status: "queued" }, targetProjectId);
    }
  }

  /** Called by parent after project create. */
  async function flushPendingUploads(newProjectId: string) {
    await uploadQueued(newProjectId);
  }

  // Expose flush via custom event for new-project page without ref forwarding complexity.
  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ projectId: string }>).detail;
      if (!detail?.projectId) return;
      void flushPendingUploads(detail.projectId).finally(() => {
        window.dispatchEvent(new CustomEvent("aleya:flush-references-done"));
      });
    };
    window.addEventListener("aleya:flush-references", handler as EventListener);
    return () => window.removeEventListener("aleya:flush-references", handler as EventListener);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending]);

  async function removeSaved(id: string) {
    if (!projectId) return;
    const res = await fetch(`/api/projects/${projectId}/references?referenceId=${id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setError(json.error ?? "Could not remove file");
      return;
    }
    setStatusMessage("Reference removed.");
    await refresh();
  }

  async function patchSaved(
    id: string,
    patch: { note?: string; title?: string; isActive?: boolean; kind?: string },
  ) {
    if (!projectId) return;
    const res = await fetch(`/api/projects/${projectId}/references`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ referenceId: id, ...patch }),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setError(json.error ?? "Could not update reference");
      return;
    }
    await refresh();
  }

  return (
    <section
      className="md:col-span-2 space-y-4"
      aria-labelledby={`${inputId}-heading`}
      data-testid="reference-uploader"
    >
      <div>
        <h2 id={`${inputId}-heading`} className="text-lg font-medium">
          Reference files (required for real uploads)
        </h2>
        <p className="mt-1 text-sm text-black/60">{helpText}</p>
        <p className="mt-1 text-sm text-black/55">
          Optional notes are supplementary. A reference is created only when a file is uploaded.
        </p>
        <p className="mt-2 text-xs text-black/55" data-testid="reference-limits">
          Limits: up to {limits.maxFilesPerProject} files per project ·{" "}
          {formatBytes(limits.maxFileBytes)} per file ·{" "}
          {formatBytes(limits.maxTotalBytesPerUser)} total · PNG, JPG, WEBP, SVG, PDF
        </p>
      </div>

      <div
        role="button"
        tabIndex={0}
        className={`rounded-2xl border border-dashed px-4 py-8 text-center transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--forest)] ${
          dragOver ? "border-[var(--forest)] bg-[rgba(31,77,69,0.08)]" : "border-black/20 bg-white/40"
        }`}
        onDragEnter={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files?.length) queueFiles(e.dataTransfer.files);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        aria-describedby={`${inputId}-help`}
      >
        <p className="text-sm text-black/70">Drag and drop files here, or browse manually.</p>
        <p id={`${inputId}-help`} className="mt-1 text-xs text-black/50">
          Mobile: use Browse files. Multiple files supported.
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => inputRef.current?.click()}
          >
            Browse files
          </button>
          {projectId ? (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => void uploadQueued()}
              disabled={!pending.some((p) => p.status === "queued" || p.status === "failed")}
            >
              Upload queued files
            </button>
          ) : (
            <p className="text-xs text-black/55 self-center">
              Queued files upload after you save the project.
            </p>
          )}
        </div>
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          className="sr-only"
          multiple
          accept="image/png,image/jpeg,image/webp,image/svg+xml,application/pdf,.png,.jpg,.jpeg,.webp,.svg,.pdf"
          onChange={(e) => {
            if (e.target.files?.length) queueFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      <div className="sr-only" role="status" aria-live="polite">
        {statusMessage}
      </div>
      {error ? (
        <p className="text-sm text-[var(--danger)]" role="alert">
          {error}
        </p>
      ) : null}
      {statusMessage ? (
        <p className="text-sm text-[var(--forest-deep)]" role="status">
          {statusMessage}
        </p>
      ) : null}

      {pending.length ? (
        <ul className="space-y-3" aria-label="Queued uploads">
          {pending.map((entry) => (
            <li
              key={entry.localId}
              className="flex flex-col gap-2 rounded-2xl border border-black/10 bg-white/50 p-3 sm:flex-row sm:items-center"
            >
              <div className="flex min-w-0 flex-1 items-center gap-3">
                {entry.previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={entry.previewUrl}
                    alt=""
                    className="h-14 w-14 rounded-lg object-cover"
                  />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-black/5 text-xs uppercase">
                    {entry.file.type.includes("pdf") ? "PDF" : "FILE"}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{entry.file.name}</p>
                  <p className="text-xs text-black/55">
                    {entry.file.type || "unknown"} · {formatBytes(entry.file.size)}
                  </p>
                  {entry.status === "uploading" ? (
                    <div className="mt-1 h-1.5 w-40 overflow-hidden rounded-full bg-black/10">
                      <div
                        className="h-full bg-[var(--forest)] transition-all"
                        style={{ width: `${entry.progress}%` }}
                      />
                    </div>
                  ) : null}
                  {entry.error ? (
                    <p className="text-xs text-[var(--danger)]">{entry.error}</p>
                  ) : null}
                </div>
              </div>
              <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-2">
                <label className="field">
                  <span className="text-xs">Title</span>
                  <input
                    value={entry.title}
                    onChange={(e) =>
                      setPending((prev) =>
                        prev.map((p) =>
                          p.localId === entry.localId ? { ...p, title: e.target.value } : p,
                        ),
                      )
                    }
                  />
                </label>
                <label className="field">
                  <span className="text-xs">Type</span>
                  <select
                    value={entry.kind}
                    onChange={(e) =>
                      setPending((prev) =>
                        prev.map((p) =>
                          p.localId === entry.localId ? { ...p, kind: e.target.value } : p,
                        ),
                      )
                    }
                  >
                    {REFERENCE_KINDS.map((kind) => (
                      <option key={kind.value} value={kind.value}>
                        {kind.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field sm:col-span-2">
                  <span className="text-xs">Optional note</span>
                  <input
                    value={entry.note}
                    placeholder="e.g. current logo from packaging photo"
                    onChange={(e) =>
                      setPending((prev) =>
                        prev.map((p) =>
                          p.localId === entry.localId ? { ...p, note: e.target.value } : p,
                        ),
                      )
                    }
                  />
                </label>
              </div>
              <div className="flex gap-2">
                {entry.status === "failed" ? (
                  <button
                    type="button"
                    className="btn btn-secondary text-sm"
                    onClick={() => {
                      setPending((prev) =>
                        prev.map((p) =>
                          p.localId === entry.localId
                            ? {
                                ...p,
                                status: validateReferenceFile(p.file, limits) ? "failed" : "queued",
                                error: validateReferenceFile(p.file, limits)?.message ?? null,
                              }
                            : p,
                        ),
                      );
                      if (projectId) void uploadOne(entry, projectId);
                    }}
                  >
                    Retry
                  </button>
                ) : null}
                <button
                  type="button"
                  className="btn btn-secondary text-sm"
                  onClick={() => {
                    if (entry.previewUrl) URL.revokeObjectURL(entry.previewUrl);
                    setPending((prev) => prev.filter((p) => p.localId !== entry.localId));
                  }}
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      {items.length ? (
        <ul className="space-y-3" aria-label="Saved references">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex flex-col gap-2 rounded-2xl border border-black/10 bg-white/60 p-3 sm:flex-row sm:items-start"
              data-testid="saved-reference"
            >
              <div className="flex min-w-0 flex-1 items-start gap-3">
                {item.previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.previewUrl}
                    alt=""
                    className="h-16 w-16 rounded-lg object-cover"
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-black/5 text-xs uppercase">
                    {item.mime_type.includes("pdf") ? "PDF" : "DOC"}
                  </div>
                )}
                <div className="min-w-0 flex-1 space-y-2">
                  <p className="truncate text-sm font-medium">
                    {item.title || item.original_filename}
                  </p>
                  <p className="text-xs text-black/55">
                    {item.original_filename} · {item.mime_type} · {formatBytes(item.size_bytes)}
                  </p>
                  {item.usedInGeneration ? (
                    <p
                      className="text-xs font-medium text-[var(--forest)]"
                      data-testid="reference-used-badge"
                    >
                      Used in a generation
                    </p>
                  ) : null}
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={item.is_active}
                      onChange={(e) => void patchSaved(item.id, { isActive: e.target.checked })}
                    />
                    Active for generation
                  </label>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <label className="field">
                      <span className="text-xs">Title</span>
                      <input
                        defaultValue={item.title ?? ""}
                        onBlur={(e) => {
                          if (e.target.value !== (item.title ?? "")) {
                            void patchSaved(item.id, { title: e.target.value });
                          }
                        }}
                      />
                    </label>
                    <label className="field">
                      <span className="text-xs">Type</span>
                      <select
                        defaultValue={item.kind}
                        onChange={(e) => void patchSaved(item.id, { kind: e.target.value })}
                      >
                        {REFERENCE_KINDS.map((kind) => (
                          <option key={kind.value} value={kind.value}>
                            {kind.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <label className="field">
                    <span className="text-xs">Optional note</span>
                    <input
                      defaultValue={item.note ?? ""}
                      onBlur={(e) => {
                        if (e.target.value !== (item.note ?? "")) {
                          void patchSaved(item.id, { note: e.target.value });
                        }
                      }}
                    />
                  </label>
                  {item.extracted_text ? (
                    <p className="text-xs text-black/55 line-clamp-2">
                      Extracted text preview: {item.extracted_text.slice(0, 160)}
                    </p>
                  ) : null}
                </div>
              </div>
              <button
                type="button"
                className="btn btn-secondary text-sm"
                onClick={() => void removeSaved(item.id)}
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-black/55">No references uploaded yet.</p>
      )}
    </section>
  );
}
