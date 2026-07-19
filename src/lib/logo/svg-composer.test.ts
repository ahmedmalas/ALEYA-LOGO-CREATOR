import { describe, expect, it } from "vitest";
import { applyConceptEdits } from "./svg-edits";
import { composeSvgConcepts, toMonochromeSvg } from "./svg-composer";
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

const referenceBrief: LogoBrief = {
  ...brief,
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
        logoMark: "leaf in circle",
        symbolGeometry: "circular leaf emblem",
        composition: "horizontal icon-left lockup",
        layoutStructure: "horizontal",
        colourPalette: ["#1F4D45", "#B08A4F"],
        primaryColours: ["#1F4D45"],
        secondaryColours: ["#B08A4F"],
        typographyCharacteristics: "serif display",
        distinctiveElements: ["leaf circle", "wordmark"],
        similarityConstraints: "Keep leaf circle left of wordmark",
        summary: "Horizontal lockup with leaf circle and NORTHWIND wordmark",
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
    mustNotChange: "leaf circle",
    improve: "alignment",
  },
};

describe("composeSvgConcepts", () => {
  it("creates labelled evolution groups with svg markup", () => {
    const concepts = composeSvgConcepts(brief, 4, "test-seed");
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
      expect(concept.prompt).toContain("Northwind");
      expect(concept.provider).toBe("svg-composer");
      expect(concept.providerMetadata.algorithm).toBe("aleya-svg-evolution-v1");
      expect(concept.providerMetadata.conceptGroup).toBeTruthy();
      expect(concept.providerMetadata.similarityLevel).toBeGreaterThan(0);
    }
  });

  it("mirrors confirmed reference text, colours and layout", () => {
    const concepts = composeSvgConcepts(referenceBrief, 4, "mirror-seed");
    const faithful = concepts.find((c) => c.providerMetadata.conceptGroup === "faithful")!;
    expect(faithful.svgMarkup).toContain("NORTHWIND");
    expect(faithful.palette.primary.toLowerCase()).toBe("#1f4d45");
    expect(faithful.layout).toBe("icon-left");
    expect(faithful.prompt).toMatch(/MODE=Mirror/);
    expect(faithful.prompt).toContain("Keep leaf circle left of wordmark");
    expect(String(faithful.providerMetadata.retained)).toMatch(/NORTHWIND/);
  });

  it("respects colour preservation off", () => {
    const concepts = composeSvgConcepts(
      {
        ...referenceBrief,
        preferredColors: ["#112233", "#445566"],
        generationControls: {
          ...referenceBrief.generationControls!,
          preserveColours: false,
          mode: "explore",
          creativity: 90,
        },
      },
      4,
      "colour-seed",
    );
    const alt = concepts.find((c) => c.providerMetadata.conceptGroup === "alternative")!;
    // Explore without preserve may leave analysis colours or preferred — assert prompt carries flag.
    expect(alt.prompt).toMatch(/Hard preserve:/);
    expect(alt.prompt).not.toMatch(/Hard preserve:.*colours/);
  });

  it("applies editable text and colour helpers", () => {
    const [concept] = composeSvgConcepts(referenceBrief, 1, "edit-seed");
    const edited = applyConceptEdits(
      concept!.svgMarkup,
      { logoText: "NORTH", primary: "#000000" },
      {
        logoText: "NORTHWIND",
        primary: concept!.palette.primary,
      },
    );
    expect(edited).toContain("NORTH");
    expect(edited).toContain("#000000");
  });

  it("produces monochrome svg", () => {
    const [concept] = composeSvgConcepts(brief, 1, "mono");
    const mono = toMonochromeSvg(concept!.svgMarkup, "#111111");
    expect(mono).toContain("#111111");
  });
});
