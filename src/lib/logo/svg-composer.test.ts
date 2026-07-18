import { describe, expect, it } from "vitest";
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

describe("composeSvgConcepts", () => {
  it("creates distinct concepts with svg markup", () => {
    const concepts = composeSvgConcepts(brief, 4, "test-seed");
    expect(concepts).toHaveLength(4);
    const layouts = new Set(concepts.map((c) => c.layout));
    expect(layouts.size).toBeGreaterThan(1);
    for (const concept of concepts) {
      expect(concept.svgMarkup).toContain("<svg");
      expect(concept.svgMarkup).toContain("Northwind");
      expect(concept.prompt).toContain("Northwind");
      expect(concept.provider).toBe("svg-composer");
    }
  });

  it("produces monochrome svg", () => {
    const [concept] = composeSvgConcepts(brief, 1, "mono");
    const mono = toMonochromeSvg(concept!.svgMarkup, "#111111");
    expect(mono).toContain("#111111");
  });
});
