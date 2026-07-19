import { describe, expect, it } from "vitest";
import { VISUAL_ANALYSIS_UNAVAILABLE_MESSAGE } from "./analysis-types";
import { summarizeReferencesForPrompt } from "./brief";

describe("summarizeReferencesForPrompt", () => {
  it("includes confirmed visual analysis when present", () => {
    const text = summarizeReferencesForPrompt([
      {
        id: "1",
        filename: "pack.png",
        mimeType: "image/png",
        note: "shelf photo",
        kind: "packaging",
        extractedText: null,
        supportedInProvider: true,
        visuallyAnalysed: true,
        analysisMode: "visual",
        analysisStatus: "succeeded",
        analysisProvider: "openai",
        analysisModel: "gpt-4o-mini",
        analysisConfirmed: {
          summary: "Green leaf mark",
          existingLogoText: "Northwind",
          symbolsAndShapes: ["leaf"],
          layout: "icon left",
          colourPalette: ["#1f4d45"],
          typographyCharacteristics: "geometric sans",
          visualStyle: "modern",
          packagingContext: "box front",
          elementsToPreserve: ["leaf"],
          elementsToAvoid: ["gradient"],
          pdfPagesProcessed: [],
        },
      },
    ]);
    expect(text).toMatch(/Confirmed visual analysis/);
    expect(text).toMatch(/Northwind/);
    expect(text).toMatch(/openai\/gpt-4o-mini/);
    expect(text).not.toMatch(/NOT visually analysed/);
  });

  it("explicitly states metadata-only fallback when vision unavailable", () => {
    const text = summarizeReferencesForPrompt([
      {
        id: "2",
        filename: "sketch.png",
        mimeType: "image/png",
        note: "rough sketch",
        kind: "sketch",
        extractedText: null,
        supportedInProvider: true,
        visuallyAnalysed: false,
        analysisStatus: "unavailable",
        analysisMode: "metadata_only",
        analysisError: VISUAL_ANALYSIS_UNAVAILABLE_MESSAGE,
      },
    ]);
    expect(text).toContain(VISUAL_ANALYSIS_UNAVAILABLE_MESSAGE);
    expect(text).toMatch(/NOT visually analysed/);
  });

  it("mentions PDF pages processed", () => {
    const text = summarizeReferencesForPrompt([
      {
        id: "3",
        filename: "invoice.pdf",
        mimeType: "application/pdf",
        note: null,
        kind: "receipt",
        extractedText: "ACME Logo",
        supportedInProvider: true,
        visuallyAnalysed: true,
        analysisStatus: "succeeded",
        analysisMode: "visual",
        pdfPagesProcessed: [1, 2],
        analysisConfirmed: {
          summary: "Invoice logo header",
          existingLogoText: "ACME",
          symbolsAndShapes: [],
          layout: "header",
          colourPalette: [],
          typographyCharacteristics: "",
          visualStyle: "",
          packagingContext: "",
          elementsToPreserve: [],
          elementsToAvoid: [],
          pdfPagesProcessed: [1, 2],
        },
      },
    ]);
    expect(text).toMatch(/PDF pages processed: 1, 2/);
  });
});
