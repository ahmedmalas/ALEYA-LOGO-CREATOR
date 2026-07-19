import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { composePrimitiveConcepts, composeSvgConcepts, toMonochromeSvg } from "./svg-composer";
import { reconstructReferenceLogo } from "@/lib/references/reconstruct";
import type { LogoBrief } from "@/types/logo";

const brief: LogoBrief = {
  businessName: "Northwind",
  tagline: "Clear craft",
  industry: "Design",
  personality: "refined",
  style: "elegant",
  preferredColors: ["#1F4D45", "#B08A4F"],
  avoidColors: ["#FF00FF"],
  iconIdeas: "leaf monogram",
  typographyDirection: "modern-serif",
  layoutDirection: "icon-left",
};

async function northwindReferencePng(): Promise<Buffer> {
  return sharp({
    create: { width: 640, height: 360, channels: 3, background: { r: 247, g: 244, b: 239 } },
  })
    .composite([
      {
        input: Buffer.from(`<svg width="640" height="360" xmlns="http://www.w3.org/2000/svg">
          <rect width="100%" height="100%" fill="#F7F4EF"/>
          <circle cx="160" cy="180" r="70" fill="#1F4D45"/>
          <circle cx="160" cy="180" r="28" fill="#B08A4F"/>
          <text x="260" y="195" font-size="52" font-family="Georgia" font-weight="700" fill="#1F4D45">NORTHWIND</text>
        </svg>`),
        top: 0,
        left: 0,
      },
    ])
    .png()
    .toBuffer();
}

describe("composePrimitiveConcepts", () => {
  it("creates labelled evolution groups with svg markup", () => {
    const concepts = composePrimitiveConcepts(brief, 4, "test-seed");
    expect(concepts).toHaveLength(4);
    expect(concepts.map((c) => c.title)).toEqual([
      "Polished refinement",
      "Faithful recreation",
      "Modern evolution",
      "Alternative direction",
    ]);
    for (const concept of concepts) {
      expect(concept.svgMarkup).toContain("<svg");
      expect(concept.svgMarkup).toContain("Northwind");
    }
  });

  it("produces monochrome svg", () => {
    const [concept] = composePrimitiveConcepts(brief, 1, "mono");
    const mono = toMonochromeSvg(concept!.svgMarkup, "#111111");
    expect(mono).toContain("#111111");
  });
});

describe("composeSvgConcepts reconstruction path", () => {
  it("builds Mirror/Refine/Advance from traced reference paths — not generic primitives", async () => {
    const png = await northwindReferencePng();
    const reconstruction = await reconstructReferenceLogo({
      buffer: png,
      mimeType: "image/png",
      fidelity: "faithful",
    });
    expect(reconstruction.pathCount).toBeGreaterThan(0);
    expect(reconstruction.reconstructedSvg).toContain("<path");

    const referenceBrief: LogoBrief = {
      ...brief,
      businessName: "NORTHWIND",
      references: [
        {
          id: "11111111-1111-1111-1111-111111111111",
          filename: "northwind.png",
          mimeType: "image/png",
          note: null,
          kind: "current_logo",
          extractedText: "NORTHWIND",
          supportedInProvider: true,
          visuallyAnalysed: true,
          analysisStatus: "succeeded",
          analysisMode: "visual",
          analysisConfirmed: {
            existingLogoText: "NORTHWIND",
            logoMark: "circle mark",
            symbolGeometry: "circle with inner disc",
            composition: "horizontal icon-left lockup",
            layoutStructure: "horizontal",
            colourPalette: reconstruction.palette,
            primaryColours: ["#1F4D45"],
            secondaryColours: ["#B08A4F"],
            summary: "NORTHWIND horizontal lockup",
            reconstructedSvg: reconstruction.reconstructedSvg,
            referencePngBase64: reconstruction.referencePngBase64,
            reconstructionSource: reconstruction.source,
            reconstructionPathCount: reconstruction.pathCount,
            colourRegions: reconstruction.colourRegions,
            segments: reconstruction.segments,
          },
        },
      ],
      generationControls: {
        mode: "mirror",
        similarity: 95,
        creativity: 10,
        preserveSymbol: true,
        preserveTypography: true,
        preserveColours: true,
        preserveLayout: true,
        modernisation: 15,
        simplification: 20,
        premiumDirection: false,
        styleDirection: "elegant",
        exactLogoText: "NORTHWIND",
        mustNotChange: "circle mark",
        improve: "alignment",
      },
    };

    const concepts = await composeSvgConcepts(referenceBrief, 4, "mirror-seed");
    expect(concepts).toHaveLength(4);
    const faithful = concepts.find((c) => c.providerMetadata.conceptGroup === "faithful")!;
    expect(faithful.providerMetadata.algorithm).toBe("aleya-svg-redraw-v3");
    expect(faithful.providerMetadata.markKind).toBe("reconstructed-paths");
    expect(faithful.providerMetadata.conditionedOnReference).toBe(true);
    expect(faithful.providerMetadata.derivedFromFaithfulRedraw).toBe(true);
    expect(faithful.svgMarkup).toContain("data-reconstruction");
    expect(faithful.svgMarkup).toContain("<path");
    // Must not inject the old generic monogram/shield primitive templates as the sole mark.
    expect(faithful.svgMarkup).not.toContain('data-mark="shield"');
    expect(Number(faithful.providerMetadata.visualSsim)).toBeGreaterThanOrEqual(0.78);

    const refine = concepts.find((c) => c.providerMetadata.conceptGroup === "refinement")!;
    const advance = concepts.find((c) => c.providerMetadata.conceptGroup === "evolution")!;
    expect(refine.svgMarkup).toContain('data-evolved="refine"');
    expect(advance.svgMarkup).toContain('data-evolved="advance"');
    expect(refine.providerMetadata.modeDifferentiation).toMatch(/cleaned/i);
    expect(advance.providerMetadata.modeDifferentiation).toMatch(/Contemporary|descended/i);
    expect(refine.svgMarkup).toContain("data-segment=");
    expect(advance.svgMarkup).toContain("data-edit-group=");
    expect(faithful.providerMetadata.sideBySideScores).toBeTruthy();
    expect(Object.keys(faithful.providerMetadata.sideBySideScores as object).length).toBe(4);
    // Advance should diverge more than Refine from the original (side-by-side scores).
    const refineScore = Number(refine.providerMetadata.similarityLevel);
    const advanceScore = Number(advance.providerMetadata.similarityLevel);
    expect(advanceScore).toBeLessThanOrEqual(refineScore + 2);
  }, 30000);

  it("rejects Mirror when reconstruction is missing", async () => {
    await expect(
      composeSvgConcepts(
        {
          ...brief,
          generationControls: {
            mode: "mirror",
            similarity: 95,
            creativity: 10,
            preserveSymbol: true,
            preserveTypography: true,
            preserveColours: true,
            preserveLayout: true,
            modernisation: 15,
            simplification: 20,
            premiumDirection: false,
            styleDirection: "elegant",
            exactLogoText: "NORTHWIND",
            mustNotChange: "",
            improve: "",
          },
          references: [
            {
              id: "11111111-1111-1111-1111-111111111111",
              filename: "x.png",
              mimeType: "image/png",
              note: null,
              kind: "current_logo",
              extractedText: null,
              supportedInProvider: true,
              visuallyAnalysed: true,
              analysisStatus: "succeeded",
              analysisMode: "visual",
              analysisConfirmed: {
                existingLogoText: "NORTHWIND",
                summary: "no reconstruction stored",
              },
            },
          ],
        },
        4,
        "missing-recon",
      ),
    ).rejects.toThrow(/reconstruction is required/i);
  });
});
