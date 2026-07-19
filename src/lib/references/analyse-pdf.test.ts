import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildBlankPdf,
  buildScannedPdf,
  buildTextPdf,
  buildVectorPdf,
} from "@/lib/references/pdf-fixtures";
import { PDF_NO_CONTENT_MESSAGE } from "@/lib/references/pdf";

const analyseImageWithVision = vi.fn();
const getVisionConfig = vi.fn();

vi.mock("@/lib/references/vision", async () => {
  const actual = await vi.importActual<typeof import("@/lib/references/vision")>(
    "@/lib/references/vision",
  );
  return {
    ...actual,
    analyseImageWithVision: (...args: unknown[]) => analyseImageWithVision(...args),
    getVisionConfig: (...args: unknown[]) => getVisionConfig(...args),
  };
});

import { analyseProjectReference } from "@/lib/references/analyse";
import type { ProjectReferenceRow } from "@/lib/references/service";

function createClient(pdf: Buffer) {
  const updates: Record<string, unknown>[] = [];
  const bytes = Uint8Array.from(pdf);
  const blob = new Blob([bytes], { type: "application/pdf" });

  const client = {
    storage: {
      from: () => ({
        download: async () => ({ data: blob, error: null }),
      }),
    },
    from: () => ({
      update: (payload: Record<string, unknown>) => {
        updates.push(payload);
        const chain = {
          eq: () => chain,
          select: () => ({
            single: async () => ({
              data: { id: "ref-1", owner_id: "user-1", ...payload },
              error: null,
            }),
          }),
          then: async (resolve: (value: { data: null; error: null }) => unknown) =>
            resolve({ data: null, error: null }),
        };
        return chain;
      },
    }),
  };

  return { client, updates };
}

function reference(partial: Partial<ProjectReferenceRow> = {}): ProjectReferenceRow {
  return {
    id: "ref-1",
    project_id: "proj-1",
    owner_id: "user-1",
    storage_path: "user-1/proj-1/ref-1.pdf",
    original_filename: "sample.pdf",
    safe_filename: "sample.pdf",
    mime_type: "application/pdf",
    size_bytes: 1234,
    title: "sample",
    note: null,
    kind: "document",
    preview_path: null,
    extracted_text: null,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...partial,
  };
}

describe("analyseProjectReference PDF pipeline", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getVisionConfig.mockReturnValue({
      available: true,
      provider: "vercel-ai-gateway",
      model: "openai/gpt-4o-mini",
    });
    analyseImageWithVision.mockResolvedValue({
      analysis: {
        existingLogoText: "ALEYA",
        symbolsAndShapes: ["mark"],
        layout: "centered",
        colourPalette: ["#C45C26"],
        typographyCharacteristics: "bold sans",
        visualStyle: "modern",
        packagingContext: "",
        elementsToPreserve: [],
        elementsToAvoid: [],
        summary: "Logo reference from PDF",
        pdfPagesProcessed: [1],
      },
      provider: "vercel-ai-gateway",
      model: "openai/gpt-4o-mini",
    });
  });

  it("analyses text PDFs visually", async () => {
    const { client, updates } = createClient(await buildTextPdf());
    await analyseProjectReference({
      supabase: client as never,
      ownerId: "user-1",
      reference: reference({ original_filename: "text.pdf" }),
    });

    expect(analyseImageWithVision).toHaveBeenCalled();
    const call = analyseImageWithVision.mock.calls[0][0] as {
      mimeType: string;
      base64: string;
      extractedText?: string;
      pdfPagesProcessed?: number[];
    };
    expect(call.mimeType).toBe("image/png");
    expect(call.base64.length).toBeGreaterThan(100);
    expect(call.extractedText).toMatch(/ALEYA/i);
    expect(call.pdfPagesProcessed).toEqual([1]);
    expect(updates.some((u) => u.analysis_mode === "visual")).toBe(true);
  });

  it("rasterizes scanned PDFs instead of failing with no-content", async () => {
    const { client, updates } = createClient(await buildScannedPdf());
    await analyseProjectReference({
      supabase: client as never,
      ownerId: "user-1",
      reference: reference({ original_filename: "scanned.pdf" }),
    });

    expect(analyseImageWithVision).toHaveBeenCalled();
    expect(updates.find((u) => u.analysis_status === "failed")).toBeUndefined();
    expect(String(updates.at(-1)?.analysis_error ?? "")).not.toMatch(/no content/i);
  });

  it("rasterizes vector PDFs", async () => {
    const { client } = createClient(await buildVectorPdf());
    await analyseProjectReference({
      supabase: client as never,
      ownerId: "user-1",
      reference: reference({ original_filename: "vector.pdf" }),
    });

    expect(analyseImageWithVision).toHaveBeenCalled();
    const call = analyseImageWithVision.mock.calls[0][0] as { mimeType: string };
    expect(call.mimeType).toBe("image/png");
  });

  it("returns no-content only for blank PDFs", async () => {
    const { client, updates } = createClient(await buildBlankPdf());
    await analyseProjectReference({
      supabase: client as never,
      ownerId: "user-1",
      reference: reference({ original_filename: "blank.pdf" }),
    });

    expect(analyseImageWithVision).not.toHaveBeenCalled();
    const failed = updates.find((u) => u.analysis_status === "failed");
    expect(failed?.analysis_error).toBe(PDF_NO_CONTENT_MESSAGE);
    expect(failed?.analysis_mode).toBe("metadata_only");
  });
});
