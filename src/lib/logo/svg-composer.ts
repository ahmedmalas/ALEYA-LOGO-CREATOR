import {
  CONCEPT_GROUPS,
  buildEvolutionPrompt,
  defaultGenerationControls,
  describeImprovements,
  describeRetention,
  mapAnalysisLayout,
  mapStyleDirection,
  primaryReferenceAnalysis,
  resolveExactLogoText,
  type GenerationControls,
} from "@/lib/logo/evolution";
import {
  compareLogoVisuals,
  MirrorSimilarityError,
  MIRROR_SIMILARITY_THRESHOLD,
} from "@/lib/logo/similarity";
import { summarizeReferencesForPrompt } from "@/lib/references/brief";
import type { ReferenceAnalysis } from "@/lib/references/analysis-types";
import { deriveSvgFromReconstructionWithReport } from "@/lib/references/reconstruct";
import type { TransformReport } from "@/lib/logo/design-transforms";
import { sanitizeHexColor } from "@/lib/security/colors";
import type {
  ConceptPalette,
  GeneratedConcept,
  LayoutDirection,
  LogoBrief,
  LogoStyle,
} from "@/types/logo";

const STYLE_FONTS: Record<LogoStyle, { display: string; body: string }> = {
  minimal: { display: "Inter", body: "Inter" },
  luxury: { display: "Playfair Display", body: "Lato" },
  premium: { display: "Cormorant Garamond", body: "Montserrat" },
  corporate: { display: "IBM Plex Sans", body: "IBM Plex Sans" },
  modern: { display: "Space Grotesk", body: "Space Grotesk" },
  bold: { display: "Anton", body: "Archivo" },
  elegant: { display: "Libre Baskerville", body: "Source Sans 3" },
};

function hashSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function pickColor(preferred: string[], fallback: string, index: number): string {
  if (preferred.length === 0) return fallback;
  return sanitizeHexColor(preferred[index % preferred.length]!, fallback);
}

function analysisColours(analysis: ReferenceAnalysis | null): string[] {
  if (!analysis) return [];
  return [
    ...analysis.primaryColours,
    ...analysis.secondaryColours,
    ...analysis.colourPalette,
  ]
    .map((c) => sanitizeHexColor(c, ""))
    .filter(Boolean);
}

function buildPalette(
  brief: LogoBrief,
  controls: GenerationControls,
  analysis: ReferenceAnalysis | null,
  variant: number,
): ConceptPalette {
  const fromAnalysis = analysisColours(analysis);
  const preferred =
    controls.preserveColours && fromAnalysis.length
      ? fromAnalysis
      : brief.preferredColors.length
        ? brief.preferredColors
        : fromAnalysis;
  const defaults = ["#0F3D3E", "#C4A574", "#1A1A1A", "#F4F7F5", "#E8EEE9"];
  // Explore / high creativity may shift accent slightly while keeping primary DNA.
  const shift = !controls.preserveColours || controls.creativity >= 70 ? variant : 0;
  const primary = pickColor(preferred, defaults[shift % defaults.length]!, 0 + shift);
  const secondary = pickColor(preferred, defaults[(1 + shift) % defaults.length]!, 1 + shift);
  const accent = pickColor(preferred, defaults[(2 + shift) % defaults.length]!, 2 + shift);
  const avoid = new Set(
    brief.avoidColors.map((c) => sanitizeHexColor(c, "").toLowerCase()).filter(Boolean),
  );
  const safe = (c: string, fb: string) => {
    const hex = sanitizeHexColor(c, fb);
    return avoid.has(hex.toLowerCase()) ? fb : hex;
  };
  return {
    primary: safe(primary, "#0F3D3E"),
    secondary: safe(secondary, "#C4A574"),
    accent: safe(accent, "#1A1A1A"),
    background: "#F7F4EF",
    foreground: "#121212",
  };
}

function monogram(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "A";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
}

type MarkKind = "shield" | "circle" | "square" | "triangle" | "leaf" | "letter" | "diamond";

function inferMarkKind(analysis: ReferenceAnalysis | null, brief: LogoBrief): MarkKind {
  const blob = [
    analysis?.logoMark,
    analysis?.symbolGeometry,
    ...(analysis?.symbolsAndShapes ?? []),
    brief.iconIdeas,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  if (/shield|crest|badge|emblem/.test(blob)) return "shield";
  if (/diamond|rhomb/.test(blob)) return "diamond";
  if (/triangle|delta|pyramid/.test(blob)) return "triangle";
  if (/leaf|organic|plant|nature/.test(blob)) return "leaf";
  if (/square|rect|block|geometric/.test(blob)) return "square";
  if (/letter|monogram|initial|wordmark only|text only/.test(blob)) return "letter";
  if (/circle|round|orb|ring|dot/.test(blob)) return "circle";
  return "circle";
}

function markGeometry(kind: MarkKind, simplify: number): { outer: string; inner?: string } {
  // Higher simplification reduces nested geometry.
  if (kind === "shield") {
    return {
      outer: "M60 18 L104 36 L104 78 C104 102 84 118 60 126 C36 118 16 102 16 78 L16 36 Z",
      inner: simplify < 60 ? "M60 40 L84 52 L84 78 C84 94 72 104 60 110 C48 104 36 94 36 78 L36 52 Z" : undefined,
    };
  }
  if (kind === "square") {
    return {
      outer: simplify >= 60 ? "M28 28 H92 V92 H28 Z" : "M24 24 H96 V96 H24 Z",
      inner: simplify < 50 ? "M40 40 H80 V80 H40 Z" : undefined,
    };
  }
  if (kind === "triangle") {
    return { outer: "M60 20 L108 108 H12 Z" };
  }
  if (kind === "leaf") {
    return {
      outer: "M60 16 C92 28 110 58 96 90 C78 118 42 118 28 90 C14 58 32 28 60 16 Z",
      inner: simplify < 55 ? "M60 34 C78 44 86 66 76 88" : undefined,
    };
  }
  if (kind === "diamond") {
    return { outer: "M60 16 L108 60 L60 104 L12 60 Z" };
  }
  if (kind === "letter") {
    return { outer: "M20 20 H100 V100 H20 Z" };
  }
  // circle / default
  return {
    outer: "M60 18 C90 18 108 40 108 68 C108 96 60 118 60 118 C60 118 12 96 12 68 C12 40 30 18 60 18 Z",
    inner: simplify < 60 ? undefined : undefined,
  };
}

function renderMark(input: {
  palette: ConceptPalette;
  kind: MarkKind;
  mono: string;
  simplify: number;
  modernisation: number;
  showLetter: boolean;
}): string {
  const { palette, kind, mono, simplify, modernisation, showLetter } = input;
  const geo = markGeometry(kind, simplify);
  const stroke = modernisation >= 70 ? 0 : 2;
  const radiusBoost = modernisation >= 60 ? 2 : 0;

  if (kind === "letter") {
    return `
    <g transform="translate(40,40)" data-mark="letter">
      <rect x="18" y="18" width="84" height="84" rx="${12 + radiusBoost}" fill="${escapeXml(palette.primary)}"/>
      <text x="60" y="78" text-anchor="middle" font-size="42" font-family="Georgia, serif" font-weight="700" fill="${escapeXml(palette.background)}">${escapeXml(mono.slice(0, 2))}</text>
    </g>`;
  }

  if (kind === "circle" && simplify >= 55) {
    return `
    <g transform="translate(40,40)" data-mark="circle">
      <circle cx="60" cy="65" r="${48 + radiusBoost}" fill="${escapeXml(palette.primary)}"/>
      ${showLetter ? `<text x="60" y="76" text-anchor="middle" font-size="28" font-family="Georgia, serif" font-weight="700" fill="${escapeXml(palette.background)}">${escapeXml(mono.slice(0, 1))}</text>` : `<circle cx="60" cy="65" r="18" fill="${escapeXml(palette.secondary)}"/>`}
    </g>`;
  }

  return `
    <g transform="translate(40,40)" data-mark="${kind}">
      <path d="${geo.outer}" fill="${escapeXml(palette.primary)}" opacity="0.96"${stroke ? ` stroke="${escapeXml(palette.accent)}" stroke-width="${stroke}"` : ""}/>
      ${geo.inner ? `<path d="${geo.inner}" fill="${escapeXml(palette.secondary)}" opacity="0.9"/>` : `<circle cx="60" cy="65" r="${26 + radiusBoost}" fill="${escapeXml(palette.secondary)}" opacity="0.95"/>`}
      ${showLetter ? `<text x="60" y="74" text-anchor="middle" font-size="22" font-family="Georgia, serif" font-weight="700" fill="${escapeXml(palette.background)}">${escapeXml(mono.slice(0, 2))}</text>` : ""}
    </g>`;
}

function letterSpacingFor(analysis: ReferenceAnalysis | null, groupMode: string): number {
  const raw = `${analysis?.letterSpacing || ""}`.toLowerCase();
  if (/tight|narrow/.test(raw)) return groupMode === "advance" ? 1 : 0;
  if (/wide|tracked|open/.test(raw)) return groupMode === "mirror" ? 5 : 4;
  return groupMode === "explore" ? 3 : 1;
}

function fontSizeFor(layout: LayoutDirection, text: string): number {
  const len = text.length;
  if (layout === "wordmark") return len > 14 ? 36 : len > 10 ? 42 : 48;
  if (layout === "badge") return len > 14 ? 22 : 28;
  return len > 14 ? 30 : 40;
}

function casing(text: string, analysis: ReferenceAnalysis | null): string {
  const c = `${analysis?.letterCasing || ""}`.toLowerCase();
  if (/upper|all caps|small caps/.test(c)) return text.toUpperCase();
  if (/lower/.test(c)) return text.toLowerCase();
  return text;
}

function renderLayout(input: {
  logoText: string;
  tagline?: string;
  palette: ConceptPalette;
  layout: LayoutDirection;
  mark: string;
  fonts: { display: string; body: string };
  analysis: ReferenceAnalysis | null;
  groupMode: string;
  preserveSymbol: boolean;
  wordmarkOnly: boolean;
}): string {
  const {
    logoText,
    tagline = "",
    palette,
    layout,
    mark,
    fonts,
    analysis,
    groupMode,
    preserveSymbol,
    wordmarkOnly,
  } = input;
  const name = casing(logoText, analysis);
  const tag = tagline;
  const tracking = letterSpacingFor(analysis, groupMode);
  const size = fontSizeFor(layout, name);
  const includeMark = !wordmarkOnly && preserveSymbol && layout !== "wordmark";

  if (layout === "wordmark" || wordmarkOnly) {
    return `
      <text data-logo-text="true" x="256" y="210" text-anchor="middle" font-size="${size}" letter-spacing="${tracking}" font-family="${fonts.display}, Georgia, serif" font-weight="700" fill="${escapeXml(palette.primary)}">${escapeXml(name)}</text>
      ${tag ? `<text x="256" y="248" text-anchor="middle" font-size="15" letter-spacing="3" font-family="${fonts.body}, sans-serif" fill="${escapeXml(palette.accent)}">${escapeXml(tag)}</text>` : ""}`;
  }

  if (layout === "icon-top") {
    return `${includeMark ? mark : ""}
      <text data-logo-text="true" x="256" y="${includeMark ? 230 : 200}" text-anchor="middle" font-size="${size}" letter-spacing="${tracking}" font-family="${fonts.display}, Georgia, serif" font-weight="700" fill="${escapeXml(palette.foreground)}">${escapeXml(name)}</text>
      ${tag ? `<text x="256" y="${includeMark ? 265 : 235}" text-anchor="middle" font-size="15" font-family="${fonts.body}, sans-serif" fill="${escapeXml(palette.accent)}">${escapeXml(tag)}</text>` : ""}`;
  }

  if (layout === "badge") {
    return `
      <rect x="88" y="78" width="336" height="240" rx="28" fill="${escapeXml(palette.primary)}"/>
      ${includeMark ? `<g transform="translate(126,-8) scale(0.65)">${mark}</g>` : ""}
      <text data-logo-text="true" x="256" y="${includeMark ? 255 : 210}" text-anchor="middle" font-size="${size}" letter-spacing="${tracking}" font-family="${fonts.display}, Georgia, serif" font-weight="700" fill="${escapeXml(palette.background)}">${escapeXml(name)}</text>
      ${tag ? `<text x="256" y="${includeMark ? 285 : 245}" text-anchor="middle" font-size="13" font-family="${fonts.body}, sans-serif" fill="${escapeXml(palette.secondary)}">${escapeXml(tag)}</text>` : ""}`;
  }

  if (layout === "monogram") {
    return `
      <circle cx="256" cy="170" r="108" fill="${escapeXml(palette.primary)}"/>
      <text data-logo-text="true" x="256" y="190" text-anchor="middle" font-size="70" font-family="${fonts.display}, Georgia, serif" font-weight="700" fill="${escapeXml(palette.background)}">${escapeXml(monogram(name))}</text>
      <text x="256" y="330" text-anchor="middle" font-size="20" letter-spacing="${tracking}" font-family="${fonts.body}, sans-serif" fill="${escapeXml(palette.foreground)}">${escapeXml(name)}</text>`;
  }

  // icon-left / horizontal lockup
  return `
    ${includeMark ? `<g transform="translate(24,78) scale(0.82)">${mark}</g>` : ""}
    <text data-logo-text="true" x="${includeMark ? 210 : 80}" y="178" font-size="${size}" letter-spacing="${tracking}" font-family="${fonts.display}, Georgia, serif" font-weight="700" fill="${escapeXml(palette.foreground)}">${escapeXml(name)}</text>
    ${tag ? `<text x="${includeMark ? 210 : 80}" y="214" font-size="15" font-family="${fonts.body}, sans-serif" fill="${escapeXml(palette.accent)}">${escapeXml(tag)}</text>` : ""}`;
}

function layoutForGroup(
  groupMode: GenerationControls["mode"],
  controls: GenerationControls,
  analysis: ReferenceAnalysis | null,
  brief: LogoBrief,
): LayoutDirection {
  const mirrored = mapAnalysisLayout(analysis, brief.layoutDirection);
  if (controls.preserveLayout || groupMode === "mirror" || groupMode === "refine") {
    return mirrored;
  }
  if (groupMode === "advance") {
    // Keep structure family but prefer cleaner stacked/horizontal.
    if (mirrored === "badge") return "icon-top";
    return mirrored;
  }
  // Explore may rotate layout family
  const exploreCycle: LayoutDirection[] = ["icon-left", "icon-top", "wordmark", "monogram", "badge"];
  const idx = exploreCycle.indexOf(mirrored);
  return exploreCycle[(idx + 2) % exploreCycle.length]!;
}

function iconConceptFor(
  analysis: ReferenceAnalysis | null,
  brief: LogoBrief,
  kind: MarkKind,
  groupLabel: string,
): string {
  return (
    analysis?.logoMark ||
    analysis?.symbolGeometry ||
    brief.iconIdeas?.trim() ||
    `${kind} mark derived from ${brief.industry} (${groupLabel})`
  );
}

function getReconstruction(analysis: ReferenceAnalysis | null): {
  svg: string;
  pngBase64: string;
  source: string;
} | null {
  if (!analysis?.reconstructedSvg?.trim()) return null;
  return {
    svg: analysis.reconstructedSvg,
    pngBase64: analysis.referencePngBase64 || "",
    source: analysis.reconstructionSource || "traced-raster",
  };
}

/** @deprecated Prefer composeSvgConcepts — kept for narrow unit tests of primitive fallback. */
export function composePrimitiveConcepts(
  brief: LogoBrief,
  count = 4,
  seed = "seed",
  controlsInput?: Partial<GenerationControls> | null,
): GeneratedConcept[] {
  const controls = defaultGenerationControls({
    ...brief.generationControls,
    ...controlsInput,
  });
  const analysis = primaryReferenceAnalysis(brief.references);
  const logoText = resolveExactLogoText(brief, controls, analysis);
  const style = mapStyleDirection(controls.styleDirection, analysis, brief.style);
  const fonts = STYLE_FONTS[style];
  const markKind = inferMarkKind(analysis, brief);
  const groups = CONCEPT_GROUPS.slice(0, Math.min(Math.max(count, 1), CONCEPT_GROUPS.length));
  const ordered = [
    ...groups.filter((g) => g.mode === controls.mode),
    ...groups.filter((g) => g.mode !== controls.mode),
  ].slice(0, Math.min(count, 4));

  return ordered.map((group, i) => {
    const palette = buildPalette(brief, controls, analysis, i);
    const layout = layoutForGroup(group.mode, controls, analysis, brief);
    const wordmarkOnly =
      layout === "wordmark" ||
      `${analysis?.layoutStructure || analysis?.layout || ""}`.toLowerCase().includes("wordmark");
    const preserveSymbol =
      controls.preserveSymbol &&
      !(group.mode === "explore" && controls.creativity >= 85) &&
      !wordmarkOnly;
    const mono = monogram(logoText);
    const mark = renderMark({
      palette,
      kind: markKind,
      mono,
      simplify: controls.simplification + (group.mode === "advance" ? 15 : 0),
      modernisation: controls.modernisation + (group.mode === "advance" ? 20 : 0),
      showLetter:
        markKind === "letter" ||
        /monogram|letter/.test(`${analysis?.logoMark || ""}`.toLowerCase()),
    });
    const body = renderLayout({
      logoText,
      tagline: brief.tagline,
      palette,
      layout,
      mark,
      fonts,
      analysis,
      groupMode: group.mode,
      preserveSymbol,
      wordmarkOnly: wordmarkOnly && (controls.preserveLayout || group.mode !== "explore"),
    });
    const svgMarkup = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512" role="img" aria-label="${escapeXml(logoText)} logo" data-concept-group="${group.id}">
  <rect width="512" height="512" fill="transparent"/>
  ${body}
</svg>`;
    const iconConcept = iconConceptFor(analysis, brief, markKind, group.label);
    return {
      title: group.label,
      prompt: buildEvolutionPrompt({
        brief,
        controls,
        group,
        analysis,
        logoText,
        layout,
        palette: [palette.primary, palette.secondary, palette.accent],
        iconConcept,
      }),
      iconConcept,
      layout,
      palette,
      typography: fonts,
      svgMarkup,
      provider: "svg-composer",
      providerMetadata: {
        seed: `${seed}:${group.id}`,
        algorithm: "aleya-svg-primitive-fallback",
        conceptGroup: group.id,
        conceptGroupLabel: group.label,
        generationMode: controls.mode,
        groupMode: group.mode,
        logoText,
        markKind,
        controls,
        referenceIds: (brief.references ?? []).map((r) => r.id),
        referenceFilenames: (brief.references ?? []).map((r) => r.filename),
      },
    };
  });
}

/**
 * Reference-conditioned evolution:
 * 1) faithful redraw from reconstructed SVG paths
 * 2) Refine / Advance / Explore derived from that redraw (no generic symbol swap)
 * 3) Mirror fails if SSIM vs reference is below threshold
 */
export async function composeSvgConcepts(
  brief: LogoBrief,
  count = 4,
  seed = "seed",
  controlsInput?: Partial<GenerationControls> | null,
): Promise<GeneratedConcept[]> {
  const controls = defaultGenerationControls({
    ...brief.generationControls,
    ...controlsInput,
  });
  const analysis = primaryReferenceAnalysis(brief.references);
  const logoText = resolveExactLogoText(brief, controls, analysis);
  const style = mapStyleDirection(controls.styleDirection, analysis, brief.style);
  const fonts = STYLE_FONTS[style];
  const recon = getReconstruction(analysis);
  const groups = CONCEPT_GROUPS.slice(0, Math.min(Math.max(count, 1), CONCEPT_GROUPS.length));
  const ordered = [
    ...groups.filter((g) => g.mode === controls.mode),
    ...groups.filter((g) => g.mode !== controls.mode),
  ].slice(0, Math.min(count, 4));

  // Without a reconstruction we cannot meet the visual Mirror standard.
  if (!recon) {
    if (controls.mode === "mirror" || controls.mode === "refine" || controls.mode === "advance") {
      throw new Error(
        "Reference reconstruction is required for Mirror / Refine / Advance. Re-run analysis on an image or SVG logo first.",
      );
    }
    return composePrimitiveConcepts(brief, count, seed, controls);
  }

  const deriveOpts = {
    modernisation: controls.modernisation,
    simplification: controls.simplification,
    creativity: controls.creativity,
    preserveColours: controls.preserveColours,
    preserveTypography: controls.preserveTypography,
    preserveSymbol: controls.preserveSymbol,
    palette: analysis?.colourPalette,
    logoText,
    fontGuess: analysis?.fontGuess,
    fontCategoryMatch: analysis?.fontCategoryMatch,
    typographyCategory: analysis?.typographyCategory || analysis?.typographyCharacteristics,
    letterSpacing: analysis?.letterSpacing,
  };

  // Immutable starting point: faithful Mirror redraw (production cleanup only).
  const faithful = deriveSvgFromReconstructionWithReport(recon.svg, "mirror", deriveOpts);
  const faithfulSvg = faithful.svg;

  // Visual similarity gate on the faithful redraw (conditioning target).
  let mirrorReport = null as Awaited<ReturnType<typeof compareLogoVisuals>> | null;
  const refPng = recon.pngBase64 ? Buffer.from(recon.pngBase64, "base64") : null;
  if (refPng) {
    mirrorReport = await compareLogoVisuals(refPng, faithfulSvg, {
      threshold: MIRROR_SIMILARITY_THRESHOLD,
    });
    if (!mirrorReport.passed) {
      throw new MirrorSimilarityError(
        mirrorReport,
        `Mirror redraw drifted too far from the reference (SSIM ${mirrorReport.ssim.toFixed(3)} < ${mirrorReport.threshold}). Generic substitute symbols are not accepted — re-upload a clearer logo or re-run analysis.`,
      );
    }
  }

  const layout = mapAnalysisLayout(analysis, brief.layoutDirection);
  const palette = buildPalette(brief, controls, analysis, 0);
  const concepts: GeneratedConcept[] = [];
  const sideBySideScores: Record<
    string,
    { ssim: number; score: number; mode: string; differentiation: string }
  > = {};

  for (let i = 0; i < ordered.length; i += 1) {
    const group = ordered[i]!;
    // Always derive from the immutable faithful redraw — never from a prior evolved variant.
    // Per-group intensity so Advance / Explore clearly diverge even when session mode is Refine.
    const groupOpts = {
      ...deriveOpts,
      modernisation:
        group.mode === "advance"
          ? Math.max(deriveOpts.modernisation, 70)
          : group.mode === "explore"
            ? Math.max(deriveOpts.modernisation, 55)
            : group.mode === "refine"
              ? Math.min(deriveOpts.modernisation, 50)
              : deriveOpts.modernisation,
      simplification:
        group.mode === "advance"
          ? Math.max(deriveOpts.simplification, 45)
          : group.mode === "refine"
            ? Math.max(deriveOpts.simplification, 30)
            : deriveOpts.simplification,
      creativity:
        group.mode === "explore"
          ? Math.max(deriveOpts.creativity, 75)
          : group.mode === "advance"
            ? Math.max(deriveOpts.creativity, 50)
            : deriveOpts.creativity,
      preserveTypography:
        group.mode === "advance" || group.mode === "explore"
          ? false
          : deriveOpts.preserveTypography,
    };
    const derived =
      group.mode === "mirror"
        ? faithful
        : deriveSvgFromReconstructionWithReport(faithfulSvg, group.mode, groupOpts);
    const transformReport: TransformReport = derived.report;
    const svgMarkup = derived.svg.replace(
      'data-reconstruction="true"',
      `data-reconstruction="true" data-concept-group="${group.id}" data-group-mode="${group.mode}"`,
    );

    let visualScore: number = group.similarity;
    let visualSsim: number | null = mirrorReport?.ssim ?? null;
    if (refPng) {
      const report = await compareLogoVisuals(refPng, svgMarkup);
      visualScore = report.score;
      visualSsim = report.ssim;
      sideBySideScores[group.id] = {
        ssim: report.ssim,
        score: report.score,
        mode: group.mode,
        differentiation: transformReport.differentiation,
      };
      if (group.mode === "mirror" && !report.passed) {
        throw new MirrorSimilarityError(report);
      }
    }

    const iconConcept =
      analysis?.logoMark ||
      analysis?.symbolGeometry ||
      "Reconstructed reference mark (traced paths)";
    const improvedFromOps = transformReport.operations.slice(0, 5).join("; ");
    const prompt = [
      buildEvolutionPrompt({
        brief,
        controls,
        group,
        analysis,
        logoText,
        layout,
        palette: [palette.primary, palette.secondary, palette.accent],
        iconConcept,
      }),
      "CONDITIONING: immutable faithful redraw → mode-specific design transforms. Do not invent a different symbol.",
      recon.source ? `Reconstruction source: ${recon.source}` : null,
      `Transform ops: ${transformReport.operations.join("; ")}`,
      `Differentiation: ${transformReport.differentiation}`,
      `Mark/wordmark/detail paths: ${transformReport.markPathCount}/${transformReport.wordmarkPathCount}/${transformReport.preservedDetails}`,
      `Typography: ${transformReport.typography.matched} (${transformReport.typography.category}); substitutes: ${transformReport.typography.substitutes.join(", ")}`,
      transformReport.typography.rationale,
      mirrorReport
        ? `Faithful redraw SSIM vs reference: ${mirrorReport.ssim.toFixed(3)} (threshold ${mirrorReport.threshold})`
        : null,
      visualSsim !== null
        ? `This variant SSIM vs reference: ${visualSsim.toFixed(3)} (score ${visualScore})`
        : null,
    ]
      .filter(Boolean)
      .join("\n");

    concepts.push({
      title: group.label,
      prompt,
      iconConcept,
      layout,
      palette,
      typography: {
        display: transformReport.typography.matched || analysis?.fontGuess || fonts.display,
        body: fonts.body,
      },
      svgMarkup,
      provider: "svg-composer",
      providerMetadata: {
        seed: `${seed}:${group.id}:${hashSeed(seed + group.id)}`,
        variant: i,
        algorithm: "aleya-svg-redraw-v3",
        conceptGroup: group.id,
        conceptGroupLabel: group.label,
        generationMode: controls.mode,
        groupMode: group.mode,
        similarityLevel: visualScore,
        visualSsim,
        sideBySideScores,
        transformOperations: transformReport.operations,
        modeDifferentiation: transformReport.differentiation,
        preservedDetails: transformReport.preservedDetails,
        markPathCount: transformReport.markPathCount,
        wordmarkPathCount: transformReport.wordmarkPathCount,
        typographySuggestion: transformReport.typography,
        retained: describeRetention({ group, controls, analysis, logoText }),
        improved: [
          describeImprovements({ group, controls, analysis }),
          improvedFromOps,
        ]
          .filter(Boolean)
          .join("; "),
        logoText,
        markKind: "reconstructed-paths",
        reconstructionSource: recon.source,
        conditionedOnReference: true,
        derivedFromFaithfulRedraw: true,
        controls,
        referenceIds: (brief.references ?? []).map((r) => r.id),
        referenceFilenames: (brief.references ?? []).map((r) => r.filename),
        referenceSummary: summarizeReferencesForPrompt(brief.references),
      },
    });
  }

  // Attach full side-by-side scoreboard to every concept for UI comparison.
  for (const concept of concepts) {
    concept.providerMetadata = {
      ...concept.providerMetadata,
      sideBySideScores,
    };
  }

  return concepts;
}

export async function composeRefinedConcept(
  brief: LogoBrief,
  base: GeneratedConcept,
  instruction: string,
): Promise<GeneratedConcept> {
  const baseControls =
    (base.providerMetadata?.controls as GenerationControls | undefined) ??
    brief.generationControls;
  const next = (
    await composeSvgConcepts(
      {
        ...brief,
        generationControls: defaultGenerationControls({
          ...baseControls,
          mode: "refine",
          improve: instruction,
          exactLogoText:
            (base.providerMetadata?.logoText as string | undefined) ||
            baseControls?.exactLogoText ||
            brief.businessName,
        }),
        iconIdeas: `${brief.iconIdeas ?? base.iconConcept}; refine: ${instruction}`,
        layoutDirection: base.layout,
      },
      1,
      `${base.title}:${instruction}`,
    )
  )[0]!;

  return {
    ...next,
    title: `${base.title} (refined)`,
    prompt: `${base.prompt}\n\nRefine instruction: ${instruction}`,
    providerMetadata: {
      ...next.providerMetadata,
      parentTitle: base.title,
      refinement: instruction,
      conceptGroup: "refinement",
      conceptGroupLabel: "Polished refinement",
    },
  };
}

export { applyConceptEdits } from "@/lib/logo/svg-edits";

export function toMonochromeSvg(svg: string, color = "#111111"): string {
  const safe = sanitizeHexColor(color, "#111111");
  return svg
    .replace(/fill="#[0-9A-Fa-f]{3,8}"/g, `fill="${safe}"`)
    .replace(/fill='#[0-9A-Fa-f]{3,8}'/g, `fill='${safe}'`);
}

export function wrapPreview(svgInnerOrFull: string, background: string): string {
  const safeBg = sanitizeHexColor(background, "#F7F4EF");
  const inner = svgInnerOrFull.includes("<svg")
    ? svgInnerOrFull.replace(/^[\s\S]*?<svg[^>]*>/i, "").replace(/<\/svg>[\s\S]*$/i, "")
    : svgInnerOrFull;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="${escapeXml(safeBg)}"/>
  ${inner}
</svg>`;
}
