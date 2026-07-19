import { z } from "zod";
import {
  emptyAnalysis,
  formatAnalysisForPrompt,
  referenceAnalysisSchema,
  type ReferenceAnalysis,
} from "@/lib/references/analysis-types";
import type { LogoBrief, LogoReferenceBrief, LogoStyle } from "@/types/logo";

function parseAnalysis(raw: unknown): ReferenceAnalysis {
  const parsed = referenceAnalysisSchema.safeParse(raw ?? {});
  return parsed.success ? parsed.data : emptyAnalysis();
}

export const GENERATION_MODES = ["mirror", "refine", "advance", "explore"] as const;
export type GenerationMode = (typeof GENERATION_MODES)[number];

export const CONCEPT_GROUPS = [
  {
    id: "faithful",
    label: "Faithful recreation",
    mode: "mirror" as const,
    similarity: 92,
  },
  {
    id: "refinement",
    label: "Polished refinement",
    mode: "refine" as const,
    similarity: 82,
  },
  {
    id: "evolution",
    label: "Modern evolution",
    mode: "advance" as const,
    similarity: 68,
  },
  {
    id: "alternative",
    label: "Alternative direction",
    mode: "explore" as const,
    similarity: 48,
  },
] as const;

export type ConceptGroupId = (typeof CONCEPT_GROUPS)[number]["id"];

export const STYLE_DIRECTIONS = [
  "minimal",
  "clinical",
  "bold",
  "elegant",
  "premium",
  "luxury",
] as const;
export type StyleDirection = (typeof STYLE_DIRECTIONS)[number];

export const generationControlsSchema = z.object({
  mode: z.enum(GENERATION_MODES).default("refine"),
  similarity: z.number().min(0).max(100).default(80),
  creativity: z.number().min(0).max(100).default(35),
  preserveSymbol: z.boolean().default(true),
  preserveTypography: z.boolean().default(true),
  preserveColours: z.boolean().default(true),
  preserveLayout: z.boolean().default(true),
  modernisation: z.number().min(0).max(100).default(40),
  simplification: z.number().min(0).max(100).default(25),
  premiumDirection: z.boolean().default(false),
  styleDirection: z.enum(STYLE_DIRECTIONS).default("elegant"),
  exactLogoText: z.string().max(120).default(""),
  mustNotChange: z.string().max(500).default(""),
  improve: z.string().max(500).default(""),
});

export type GenerationControls = z.infer<typeof generationControlsSchema>;

export function defaultGenerationControls(
  partial?: Partial<GenerationControls>,
): GenerationControls {
  const mode = partial?.mode ?? "refine";
  const modeDefaults: Record<GenerationMode, Partial<GenerationControls>> = {
    mirror: { similarity: 95, creativity: 10, modernisation: 15, simplification: 20 },
    refine: { similarity: 85, creativity: 30, modernisation: 40, simplification: 35 },
    advance: { similarity: 70, creativity: 55, modernisation: 75, simplification: 45 },
    explore: { similarity: 45, creativity: 80, modernisation: 60, simplification: 30 },
  };
  return generationControlsSchema.parse({
    ...modeDefaults[mode],
    ...partial,
    mode,
  });
}

export function primaryReferenceAnalysis(
  references: LogoReferenceBrief[] | undefined,
): ReferenceAnalysis | null {
  const visual = (references ?? []).find((ref) => ref.visuallyAnalysed);
  if (!visual) return null;
  return parseAnalysis(visual.analysisConfirmed ?? visual.analysis);
}

export function resolveExactLogoText(
  brief: LogoBrief,
  controls: GenerationControls,
  analysis: ReferenceAnalysis | null,
): string {
  const fromControls = controls.exactLogoText.trim();
  if (fromControls) return fromControls;
  const fromAnalysis = analysis?.existingLogoText?.trim();
  if (fromAnalysis) return fromAnalysis;
  return brief.businessName;
}

export function mapAnalysisLayout(
  analysis: ReferenceAnalysis | null,
  fallback: LogoBrief["layoutDirection"],
): LogoBrief["layoutDirection"] {
  const structure = `${analysis?.layoutStructure || ""}`.toLowerCase();
  if (structure === "horizontal") return "icon-left";
  if (structure === "stacked") return "icon-top";
  if (structure === "emblem") return "badge";
  if (structure === "wordmark") return "wordmark";
  if (structure === "monogram") return "monogram";

  const raw = `${analysis?.composition || analysis?.layout || ""}`.toLowerCase();
  if (!raw) return fallback;
  if (/(emblem|badge|seal|crest|circular)/.test(raw)) return "badge";
  if (/(monogram|lettermark|initial)/.test(raw)) return "monogram";
  if (/(wordmark|logotype|text[- ]only|typography[- ]only)/.test(raw)) return "wordmark";
  if (/(stack|vertical|icon[- ]top|stacked)/.test(raw)) return "icon-top";
  if (/(horizontal|icon[- ]left|lockup|side)/.test(raw)) return "icon-left";
  return fallback;
}

export function mapStyleDirection(
  direction: StyleDirection,
  analysis: ReferenceAnalysis | null,
  fallback: LogoStyle,
): LogoStyle {
  if (direction === "luxury") return "luxury";
  if (direction === "premium") return "premium";
  if (direction === "bold") return "bold";
  if (direction === "elegant") return "elegant";
  if (direction === "clinical" || direction === "minimal") return "minimal";
  const era = `${analysis?.visualEraStyle || analysis?.visualStyle || ""}`.toLowerCase();
  if (/luxury|serif|heritage/.test(era)) return "luxury";
  if (/bold|strong|impact/.test(era)) return "bold";
  if (/minimal|clinical|swiss/.test(era)) return "minimal";
  return fallback;
}

export function modeRules(mode: GenerationMode): string {
  switch (mode) {
    case "mirror":
      return [
        "MODE=Mirror: recognisably the same artwork.",
        "Start from the immutable faithful redraw (traced reference paths).",
        "Production cleanup only — alignment, quantisation, segment tagging.",
        "Do NOT invent a different logo or unrelated concept.",
      ].join(" ");
    case "refine":
      return [
        "MODE=Refine: the same logo, professionally cleaned and balanced.",
        "Derive from the faithful redraw — optical kerning, baseline correction, stroke/curve cleanup, symmetry, preserve enclosed details.",
        "Separate mark vs wordmark editing; do not replace the core symbol.",
      ].join(" ");
    case "advance":
      return [
        "MODE=Advance: a stronger contemporary identity that clearly descends from the original.",
        "Derive from the faithful redraw — controlled symbol simplification, premium geometry, lockup rebalance, typography substitutes.",
        "Retain brand DNA (mark, text, colour cues). Avoid generic AI marks and template drift.",
      ].join(" ");
    case "explore":
      return [
        "MODE=Explore: broader alternatives from the same path DNA — do not pretend to be faithful.",
        "Layout reinterpretation and stronger deviation are acceptable while echoing colour logic and distinctive traits.",
      ].join(" ");
  }
}

export function buildEvolutionPrompt(input: {
  brief: LogoBrief;
  controls: GenerationControls;
  group: (typeof CONCEPT_GROUPS)[number];
  analysis: ReferenceAnalysis | null;
  logoText: string;
  layout: string;
  palette: string[];
  iconConcept: string;
}): string {
  const { brief, controls, group, analysis, logoText, layout, palette, iconConcept } = input;
  const confirmed = analysis ?? emptyAnalysis();
  const referenceBlock = brief.references?.length
    ? formatAnalysisForPrompt(confirmed, true)
    : "No visual reference analysis available — stay close to the brief.";

  const preserve = [
    controls.preserveSymbol ? "symbol/geometry" : null,
    controls.preserveTypography ? "typography style" : null,
    controls.preserveColours ? "colours" : null,
    controls.preserveLayout ? "layout/composition" : null,
  ].filter(Boolean);

  return [
    `ALEYA reference-led logo evolution — concept group: ${group.label}`,
    modeRules(group.mode),
    `Primary session mode: ${controls.mode}`,
    `Target similarity to reference: ${Math.round((controls.similarity + group.similarity) / 2)}/100`,
    `Creativity: ${controls.creativity}/100`,
    `Modernisation: ${controls.modernisation}/100`,
    `Simplification: ${controls.simplification}/100`,
    controls.premiumDirection ? "Bias toward premium/luxury presence." : null,
    `Style direction: ${controls.styleDirection}`,
    `Exact logo text (spell exactly): "${logoText}"`,
    brief.tagline ? `Tagline: "${brief.tagline}"` : null,
    `Industry: ${brief.industry}`,
    `Layout target: ${layout}`,
    `Palette: ${palette.join(", ")}`,
    `Icon/mark concept: ${iconConcept}`,
    preserve.length ? `Hard preserve: ${preserve.join(", ")}` : "No hard preserve flags.",
    controls.mustNotChange.trim()
      ? `Must not change: ${controls.mustNotChange.trim()}`
      : null,
    controls.improve.trim() ? `User wants improved: ${controls.improve.trim()}` : null,
    confirmed.elementsToPreserve?.length
      ? `Analysis preserve: ${confirmed.elementsToPreserve.join(", ")}`
      : null,
    confirmed.weakAreasToImprove?.length
      ? `Weak areas to improve: ${confirmed.weakAreasToImprove.join(", ")}`
      : null,
    confirmed.similarityConstraints
      ? `Similarity constraints: ${confirmed.similarityConstraints}`
      : null,
    `Confirmed visual analysis: ${referenceBlock}`,
    "Avoid generic AI swooshes, clip-art, wrong spelling, weak kerning, and unrelated concept drift.",
  ]
    .filter(Boolean)
    .join("\n");
}

export function describeRetention(input: {
  group: (typeof CONCEPT_GROUPS)[number];
  controls: GenerationControls;
  analysis: ReferenceAnalysis | null;
  logoText: string;
}): string {
  const parts = [`Exact text "${input.logoText}"`];
  if (input.controls.preserveSymbol || input.group.mode === "mirror") {
    parts.push(input.analysis?.logoMark || input.analysis?.symbolGeometry || "core mark geometry");
  }
  if (input.controls.preserveLayout) parts.push(input.analysis?.composition || input.analysis?.layout || "composition");
  if (input.controls.preserveColours) parts.push("reference colour cues");
  if (input.controls.preserveTypography) parts.push("typography character");
  if (input.analysis?.distinctiveElements?.length) {
    parts.push(...input.analysis.distinctiveElements.slice(0, 3));
  }
  return parts.filter(Boolean).join("; ");
}

export function describeImprovements(input: {
  group: (typeof CONCEPT_GROUPS)[number];
  controls: GenerationControls;
  analysis: ReferenceAnalysis | null;
}): string {
  const base =
    input.group.mode === "mirror"
      ? "Alignment, geometry cleanup, resolution and production polish"
      : input.group.mode === "refine"
        ? "Spacing, stroke consistency, balance, kerning and legibility"
        : input.group.mode === "advance"
          ? "Sophistication, distinctiveness, scalability and contemporary presence"
          : "Broader creative interpretation while echoing brand DNA";
  const extras = [
    input.controls.improve.trim() || null,
    ...(input.analysis?.weakAreasToImprove ?? []).slice(0, 2),
    input.controls.simplification >= 50 ? "simplified detail for scalability" : null,
    input.controls.modernisation >= 60 ? "modernised proportions and finishes" : null,
    input.controls.premiumDirection ? "premium material presence" : null,
  ].filter(Boolean);
  return [base, ...extras].join("; ");
}
