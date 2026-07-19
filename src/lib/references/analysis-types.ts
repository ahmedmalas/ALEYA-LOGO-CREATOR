import { z } from "zod";

const stringList = z.array(z.string()).default([]);

/** Expanded visual analysis for reference-led logo evolution. */
export const referenceAnalysisSchema = z.object({
  // Legacy / core fields (kept for backward compatibility)
  existingLogoText: z.string().default(""),
  symbolsAndShapes: stringList,
  layout: z.string().default(""),
  colourPalette: stringList,
  typographyCharacteristics: z.string().default(""),
  visualStyle: z.string().default(""),
  packagingContext: z.string().default(""),
  elementsToPreserve: stringList,
  elementsToAvoid: stringList,
  summary: z.string().default(""),
  pdfPagesProcessed: z.array(z.number().int().positive()).default([]),

  // Expanded fidelity fields
  logoMark: z.string().default(""),
  symbolGeometry: z.string().default(""),
  composition: z.string().default(""),
  layoutStructure: z
    .enum(["horizontal", "stacked", "emblem", "wordmark", "monogram", "unknown"])
    .or(z.string())
    .default("unknown"),
  proportions: z.string().default(""),
  alignment: z.string().default(""),
  spacing: z.string().default(""),
  typographyCategory: z.string().default(""),
  letterCasing: z.string().default(""),
  letterSpacing: z.string().default(""),
  strokeWeight: z.string().default(""),
  primaryColours: stringList,
  secondaryColours: stringList,
  gradients: z.string().default(""),
  outlines: z.string().default(""),
  shadows: z.string().default(""),
  backgrounds: z.string().default(""),
  borders: z.string().default(""),
  visualEraStyle: z.string().default(""),
  brandMood: z.string().default(""),
  distinctiveElements: stringList,
  weakAreasToImprove: stringList,
  similarityConstraints: z.string().default(""),
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
  const colours = [
    ...analysis.primaryColours,
    ...analysis.secondaryColours,
    ...analysis.colourPalette,
  ].filter(Boolean);
  const uniqueColours = [...new Set(colours)];

  return [
    `${label}: ${analysis.summary || "No summary"}`,
    analysis.existingLogoText ? `Exact logo text: ${analysis.existingLogoText}` : null,
    analysis.logoMark ? `Logo mark: ${analysis.logoMark}` : null,
    analysis.symbolGeometry
      ? `Symbol geometry: ${analysis.symbolGeometry}`
      : analysis.symbolsAndShapes.length
        ? `Symbols/shapes: ${analysis.symbolsAndShapes.join(", ")}`
        : null,
    analysis.composition || analysis.layout
      ? `Composition: ${analysis.composition || analysis.layout}`
      : null,
    analysis.layoutStructure && analysis.layoutStructure !== "unknown"
      ? `Layout structure: ${analysis.layoutStructure}`
      : null,
    analysis.proportions ? `Proportions: ${analysis.proportions}` : null,
    analysis.alignment ? `Alignment: ${analysis.alignment}` : null,
    analysis.spacing ? `Spacing: ${analysis.spacing}` : null,
    analysis.typographyCategory || analysis.typographyCharacteristics
      ? `Typography: ${[analysis.typographyCategory, analysis.typographyCharacteristics, analysis.letterCasing, analysis.letterSpacing, analysis.strokeWeight].filter(Boolean).join("; ")}`
      : null,
    uniqueColours.length ? `Colours: ${uniqueColours.join(", ")}` : null,
    analysis.gradients ? `Gradients: ${analysis.gradients}` : null,
    analysis.outlines ? `Outlines: ${analysis.outlines}` : null,
    analysis.shadows ? `Shadows: ${analysis.shadows}` : null,
    analysis.backgrounds ? `Backgrounds: ${analysis.backgrounds}` : null,
    analysis.borders ? `Borders: ${analysis.borders}` : null,
    analysis.visualEraStyle || analysis.visualStyle
      ? `Era/style: ${analysis.visualEraStyle || analysis.visualStyle}`
      : null,
    analysis.brandMood ? `Brand mood: ${analysis.brandMood}` : null,
    analysis.distinctiveElements.length
      ? `Distinctive (retain): ${analysis.distinctiveElements.join(", ")}`
      : analysis.elementsToPreserve.length
        ? `Preserve: ${analysis.elementsToPreserve.join(", ")}`
        : null,
    analysis.weakAreasToImprove.length
      ? `Weak areas: ${analysis.weakAreasToImprove.join(", ")}`
      : null,
    analysis.similarityConstraints
      ? `Similarity constraints: ${analysis.similarityConstraints}`
      : null,
    analysis.elementsToAvoid.length ? `Avoid: ${analysis.elementsToAvoid.join(", ")}` : null,
    analysis.packagingContext ? `Packaging context: ${analysis.packagingContext}` : null,
    analysis.pdfPagesProcessed.length
      ? `PDF pages processed: ${analysis.pdfPagesProcessed.join(", ")}`
      : null,
  ]
    .filter(Boolean)
    .join(" | ");
}
