import { describe, expect, it } from "vitest";
import sharp from "sharp";
import {
  deriveSvgFromReconstruction,
  reconstructReferenceLogo,
} from "@/lib/references/reconstruct";
import { compareLogoVisuals, MIRROR_SIMILARITY_THRESHOLD } from "@/lib/logo/similarity";

async function sampleLogo(): Promise<Buffer> {
  return sharp({
    create: { width: 700, height: 400, channels: 3, background: { r: 255, g: 255, b: 255 } },
  })
    .composite([
      {
        input: Buffer.from(`<svg width="700" height="400" xmlns="http://www.w3.org/2000/svg">
          <rect width="100%" height="100%" fill="#FFFFFF"/>
          <circle cx="150" cy="200" r="80" fill="#1F4D45"/>
          <circle cx="150" cy="200" r="32" fill="#B08A4F"/>
          <text x="260" y="215" font-size="56" font-family="Georgia" font-weight="700" fill="#1F4D45">NORTHWIND</text>
        </svg>`),
        top: 0,
        left: 0,
      },
    ])
    .png()
    .toBuffer();
}

describe("reconstructReferenceLogo", () => {
  it("renders hi-res, segments colours, and traces editable SVG paths", async () => {
    const png = await sampleLogo();
    const result = await reconstructReferenceLogo({
      buffer: png,
      mimeType: "image/png",
      fidelity: "faithful",
    });
    expect(result.width).toBeGreaterThan(300);
    expect(result.colourRegions.length).toBeGreaterThan(1);
    expect(result.segments.length).toBeGreaterThan(0);
    expect(result.reconstructedSvg).toContain("<svg");
    expect(result.reconstructedSvg).toContain("<path");
    expect(result.pathCount).toBeGreaterThan(0);
    expect(result.referencePngBase64.length).toBeGreaterThan(100);
    expect(result.palette.some((c) => /1F4D45|B08A4F/i.test(c) || c.length === 7)).toBe(true);
  }, 30000);

  it("keeps SVG sources as editable SVG without inventing a new mark", async () => {
    const svg = Buffer.from(`<?xml version="1.0"?>
<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100" viewBox="0 0 200 100">
  <circle cx="40" cy="50" r="30" fill="#0A4A5A"/>
  <text x="80" y="58" font-size="24" fill="#0A4A5A">LAB</text>
</svg>`);
    const result = await reconstructReferenceLogo({
      buffer: svg,
      mimeType: "image/svg+xml",
    });
    expect(result.source).toBe("svg-source");
    expect(result.reconstructedSvg).toContain("circle");
    expect(result.reconstructedSvg).toContain("LAB");
  });

  it("derives refine/advance from the same reconstruction with real transforms", async () => {
    const png = await sampleLogo();
    const result = await reconstructReferenceLogo({
      buffer: png,
      mimeType: "image/png",
    });
    const mirror = deriveSvgFromReconstruction(result.reconstructedSvg, "mirror");
    const refine = deriveSvgFromReconstruction(result.reconstructedSvg, "refine", {
      simplification: 40,
      logoText: "NORTHWIND",
      fontCategoryMatch: "serif",
    });
    const advance = deriveSvgFromReconstruction(result.reconstructedSvg, "advance", {
      modernisation: 70,
      simplification: 45,
      logoText: "NORTHWIND",
      fontGuess: "Libre Baskerville",
      preserveTypography: false,
    });
    expect(mirror).toContain("<path");
    expect(mirror).toContain("data-segment=");
    expect(refine).toContain("<path");
    expect(refine).toContain('data-evolved="refine"');
    expect(refine).toContain("<!-- typography:");
    expect(advance).toContain('data-evolved="advance"');
    expect(advance).toContain("data-edit-group=");
    // Same path DNA — advance must not drop reconstructed mark paths
    expect((advance.match(/<path/g) || []).length).toBeGreaterThan(0);
    // Refine and Advance must differ (genuine transforms, not the same scale nudge)
    expect(refine).not.toEqual(advance);
  }, 30000);

  it("scores Mirror redraw above similarity threshold vs reference", async () => {
    const png = await sampleLogo();
    const result = await reconstructReferenceLogo({
      buffer: png,
      mimeType: "image/png",
      fidelity: "faithful",
    });
    const mirror = deriveSvgFromReconstruction(result.reconstructedSvg, "mirror");
    const report = await compareLogoVisuals(Buffer.from(result.referencePngBase64, "base64"), mirror);
    expect(report.ssim).toBeGreaterThanOrEqual(MIRROR_SIMILARITY_THRESHOLD);
    expect(report.passed).toBe(true);
  }, 30000);
});
