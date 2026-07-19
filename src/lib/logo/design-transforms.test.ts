import { describe, expect, it } from "vitest";
import { applyDesignTransforms, suggestTypography } from "./design-transforms";

const sampleSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512" data-reconstruction="true">
  <rect width="512" height="512" fill="transparent"/>
  <g transform="translate(40,80) scale(1)" data-source-size="400x300">
    <g data-colour-layer="#1F4D45" data-role="primary">
      <path fill="#1F4D45" d="M40 40 L140 40 L140 140 L40 140 Z"/>
      <path fill="#1F4D45" d="M200 70 L220 70 L220 110 L200 110 Z"/>
      <path fill="#1F4D45" d="M240 70 L260 70 L260 110 L240 110 Z"/>
      <path fill="#1F4D45" d="M280 70 L380 70 L380 110 L280 110 Z"/>
    </g>
    <g data-colour-layer="#B08A4F" data-role="secondary">
      <path fill="#B08A4F" d="M70 70 L110 70 L110 110 L70 110 Z"/>
    </g>
  </g>
</svg>`;

describe("suggestTypography", () => {
  it("returns matched font and high-quality substitutes", () => {
    const s = suggestTypography({
      fontGuess: "Playfair Display",
      fontCategoryMatch: "serif",
      mode: "refine",
    });
    expect(s.matched).toBe("Playfair Display");
    expect(s.category).toBe("serif");
    expect(s.substitutes.length).toBeGreaterThan(0);
  });
});

describe("applyDesignTransforms", () => {
  it("tags segments and preserves details on Mirror", () => {
    const { svg, report } = applyDesignTransforms(sampleSvg, "mirror", {
      logoText: "NORTHWIND",
    });
    expect(svg).toContain("data-segment=");
    expect(svg).toContain("data-edit-group=");
    expect(report.operations.length).toBeGreaterThan(0);
    expect(report.differentiation).toMatch(/same artwork/i);
    expect(report.preservedDetails).toBeGreaterThanOrEqual(0);
  });

  it("Refine applies optical cleanup distinct from Advance", () => {
    const refine = applyDesignTransforms(sampleSvg, "refine", {
      simplification: 40,
      logoText: "NORTHWIND",
      fontCategoryMatch: "serif",
    });
    const advance = applyDesignTransforms(sampleSvg, "advance", {
      modernisation: 75,
      simplification: 45,
      logoText: "NORTHWIND",
      preserveTypography: false,
      fontGuess: "Libre Baskerville",
    });
    expect(refine.svg).toContain('data-evolved="refine"');
    expect(advance.svg).toContain('data-evolved="advance"');
    expect(refine.svg).not.toEqual(advance.svg);
    expect(refine.report.differentiation).toMatch(/cleaned/i);
    expect(advance.report.differentiation).toMatch(/Contemporary|descended/i);
    expect(advance.report.operations.some((o) => /simplif|premium|lockup|typography/i.test(o))).toBe(
      true,
    );
    expect(advance.svg).toContain("data-wordmark-suggestion");
  });

  it("Explore does not pretend to be faithful", () => {
    const { report } = applyDesignTransforms(sampleSvg, "explore", {
      creativity: 80,
      logoText: "NORTHWIND",
    });
    expect(report.differentiation).toMatch(/not a faithful/i);
  });
});
