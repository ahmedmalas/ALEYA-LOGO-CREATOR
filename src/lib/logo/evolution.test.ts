import { describe, expect, it } from "vitest";
import {
  CONCEPT_GROUPS,
  buildEvolutionPrompt,
  defaultGenerationControls,
  mapAnalysisLayout,
  modeRules,
  resolveExactLogoText,
} from "@/lib/logo/evolution";
import { emptyAnalysis } from "@/lib/references/analysis-types";
import type { LogoBrief } from "@/types/logo";

const brief: LogoBrief = {
  businessName: "ALEYA",
  industry: "Branding",
  personality: "refined",
  style: "elegant",
  preferredColors: ["#1F4D45"],
  avoidColors: [],
  typographyDirection: "modern-serif",
  layoutDirection: "icon-left",
};

describe("evolution controls", () => {
  it("sets mode-specific similarity defaults", () => {
    expect(defaultGenerationControls({ mode: "mirror" }).similarity).toBeGreaterThan(90);
    expect(defaultGenerationControls({ mode: "explore" }).creativity).toBeGreaterThan(70);
  });

  it("maps analysis layouts", () => {
    expect(mapAnalysisLayout({ ...emptyAnalysis(), layout: "horizontal lockup" }, "wordmark")).toBe(
      "icon-left",
    );
    expect(mapAnalysisLayout({ ...emptyAnalysis(), composition: "stacked vertical lockup" }, "icon-left")).toBe(
      "icon-top",
    );
    expect(mapAnalysisLayout({ ...emptyAnalysis(), layoutStructure: "wordmark" }, "icon-left")).toBe(
      "wordmark",
    );
  });

  it("prefers exact logo text from controls then analysis", () => {
    const analysis = { ...emptyAnalysis(), existingLogoText: "NORTHWIND" };
    expect(
      resolveExactLogoText(
        brief,
        defaultGenerationControls({ exactLogoText: "Exact Co" }),
        analysis,
      ),
    ).toBe("Exact Co");
    expect(
      resolveExactLogoText(brief, defaultGenerationControls({ exactLogoText: "" }), analysis),
    ).toBe("NORTHWIND");
  });

  it("builds mode prompts with similarity rules", () => {
    const prompt = buildEvolutionPrompt({
      brief,
      controls: defaultGenerationControls({ mode: "mirror", preserveColours: true }),
      group: CONCEPT_GROUPS[0],
      analysis: {
        ...emptyAnalysis(),
        existingLogoText: "ALEYA",
        summary: "Green wordmark with circle mark",
        similarityConstraints: "Keep circle + wordmark lockup",
      },
      logoText: "ALEYA",
      layout: "icon-left",
      palette: ["#1F4D45", "#B08A4F"],
      iconConcept: "circle mark",
    });
    expect(prompt).toContain("MODE=Mirror");
    expect(prompt).toContain("Exact logo text");
    expect(prompt).toContain("Keep circle + wordmark lockup");
    expect(modeRules("advance")).toMatch(/modern premium evolution/i);
  });
});
