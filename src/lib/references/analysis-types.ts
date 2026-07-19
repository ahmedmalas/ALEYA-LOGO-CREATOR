import { z } from "zod";

export const referenceAnalysisSchema = z.object({
  existingLogoText: z.string().default(""),
  symbolsAndShapes: z.array(z.string()).default([]),
  layout: z.string().default(""),
  colourPalette: z.array(z.string()).default([]),
  typographyCharacteristics: z.string().default(""),
  visualStyle: z.string().default(""),
  packagingContext: z.string().default(""),
  elementsToPreserve: z.array(z.string()).default([]),
  elementsToAvoid: z.array(z.string()).default([]),
  summary: z.string().default(""),
  pdfPagesProcessed: z.array(z.number().int().positive()).default([]),
});

export type ReferenceAnalysis = z.infer<typeof referenceAnalysisSchema>;

export type AnalysisStatus = "none" | "pending" | "succeeded" | "unavailable" | "failed";
export type AnalysisMode = "visual" | "metadata_only";

export const VISUAL_ANALYSIS_UNAVAILABLE_MESSAGE =
  "Visual analysis is unavailable. ALEYA will use the filename and your reference notes only.";

export function emptyAnalysis(): ReferenceAnalysis {
  return referenceAnalysisSchema.parse({});
}

export function formatAnalysisForPrompt(analysis: ReferenceAnalysis, confirmed: boolean): string {
  const label = confirmed ? "Confirmed visual analysis" : "Detected visual analysis";
  return [
    `${label}: ${analysis.summary || "No summary"}`,
    analysis.existingLogoText ? `Logo text: ${analysis.existingLogoText}` : null,
    analysis.symbolsAndShapes.length
      ? `Symbols/shapes: ${analysis.symbolsAndShapes.join(", ")}`
      : null,
    analysis.layout ? `Layout: ${analysis.layout}` : null,
    analysis.colourPalette.length ? `Colours: ${analysis.colourPalette.join(", ")}` : null,
    analysis.typographyCharacteristics
      ? `Typography: ${analysis.typographyCharacteristics}`
      : null,
    analysis.visualStyle ? `Style: ${analysis.visualStyle}` : null,
    analysis.packagingContext ? `Packaging context: ${analysis.packagingContext}` : null,
    analysis.elementsToPreserve.length
      ? `Preserve: ${analysis.elementsToPreserve.join(", ")}`
      : null,
    analysis.elementsToAvoid.length ? `Avoid: ${analysis.elementsToAvoid.join(", ")}` : null,
    analysis.pdfPagesProcessed.length
      ? `PDF pages processed: ${analysis.pdfPagesProcessed.join(", ")}`
      : null,
  ]
    .filter(Boolean)
    .join(" | ");
}
