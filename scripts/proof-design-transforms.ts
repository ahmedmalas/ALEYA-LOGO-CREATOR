/**
 * Side-by-side visual proof: Mirror / Refine / Advance / Explore from faithful redraw.
 * Writes SVGs + PNGs + scoreboard JSON under /opt/cursor/artifacts/evolution-gen/transforms/
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { composeSvgConcepts } from "../src/lib/logo/svg-composer";
import { reconstructReferenceLogo } from "../src/lib/references/reconstruct";
import { compareLogoVisuals } from "../src/lib/logo/similarity";
import type { LogoBrief } from "../src/types/logo";

const OUT = "/opt/cursor/artifacts/evolution-gen/transforms";

async function fixturePng(): Promise<Buffer> {
  return sharp({
    create: { width: 720, height: 400, channels: 3, background: { r: 247, g: 244, b: 239 } },
  })
    .composite([
      {
        input: Buffer.from(`<svg width="720" height="400" xmlns="http://www.w3.org/2000/svg">
          <rect width="100%" height="100%" fill="#F7F4EF"/>
          <circle cx="150" cy="200" r="78" fill="#1F4D45"/>
          <circle cx="150" cy="200" r="30" fill="#B08A4F"/>
          <text x="260" y="218" font-size="54" font-family="Georgia" font-weight="700" fill="#1F4D45">NORTHWIND</text>
        </svg>`),
        top: 0,
        left: 0,
      },
    ])
    .png()
    .toBuffer();
}

async function svgToPng(svg: string): Promise<Buffer> {
  return sharp(Buffer.from(svg))
    .flatten({ background: { r: 247, g: 244, b: 239 } })
    .resize(512, 512, { fit: "contain", background: { r: 247, g: 244, b: 239, alpha: 1 } })
    .png()
    .toBuffer();
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const png = await fixturePng();
  await writeFile(path.join(OUT, "reference.png"), png);

  const reconstruction = await reconstructReferenceLogo({
    buffer: png,
    mimeType: "image/png",
    fidelity: "faithful",
  });
  await writeFile(path.join(OUT, "faithful-redraw.svg"), reconstruction.reconstructedSvg);

  const brief: LogoBrief = {
    businessName: "NORTHWIND",
    tagline: "Clear craft",
    industry: "Design",
    personality: "refined",
    style: "elegant",
    preferredColors: ["#1F4D45", "#B08A4F"],
    avoidColors: [],
    iconIdeas: "circle with inner disc",
    typographyDirection: "modern-serif",
    layoutDirection: "icon-left",
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
          symbolGeometry: "circle with inner gold disc",
          composition: "horizontal icon-left lockup",
          layoutStructure: "horizontal",
          colourPalette: reconstruction.palette,
          primaryColours: ["#1F4D45"],
          secondaryColours: ["#B08A4F"],
          typographyCategory: "serif",
          fontGuess: "Georgia",
          fontCategoryMatch: "serif",
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
      mode: "refine",
      similarity: 85,
      creativity: 35,
      preserveSymbol: true,
      preserveTypography: true,
      preserveColours: true,
      preserveLayout: true,
      modernisation: 55,
      simplification: 40,
      premiumDirection: true,
      styleDirection: "elegant",
      exactLogoText: "NORTHWIND",
      mustNotChange: "circle mark and inner disc",
      improve: "kerning, stroke consistency, balance",
    },
  };

  const concepts = await composeSvgConcepts(brief, 4, "proof-transforms");
  const refPng = Buffer.from(reconstruction.referencePngBase64, "base64");
  const scoreboard: Record<string, unknown>[] = [];

  for (const c of concepts) {
    const mode = String(c.providerMetadata.groupMode);
    const id = String(c.providerMetadata.conceptGroup);
    await writeFile(path.join(OUT, `${id}.svg`), c.svgMarkup);
    await writeFile(path.join(OUT, `${id}.png`), await svgToPng(c.svgMarkup));
    await writeFile(path.join(OUT, `${id}-prompt.txt`), c.prompt);
    const report = await compareLogoVisuals(refPng, c.svgMarkup);
    scoreboard.push({
      id,
      mode,
      title: c.title,
      ssim: report.ssim,
      score: report.score,
      differentiation: c.providerMetadata.modeDifferentiation,
      operations: c.providerMetadata.transformOperations,
      typography: c.providerMetadata.typographySuggestion,
      markPaths: c.providerMetadata.markPathCount,
      wordmarkPaths: c.providerMetadata.wordmarkPathCount,
      preservedDetails: c.providerMetadata.preservedDetails,
      algorithm: c.providerMetadata.algorithm,
    });
  }

  // Composite side-by-side strip: reference | mirror | refine | advance | explore
  const tiles = [
    await sharp(png)
      .resize(256, 256, { fit: "contain", background: { r: 247, g: 244, b: 239, alpha: 1 } })
      .png()
      .toBuffer(),
    ...(["faithful", "refinement", "evolution", "alternative"] as const).map(async (id) =>
      sharp(path.join(OUT, `${id}.png`)).resize(256, 256).png().toBuffer(),
    ),
  ];
  const resolved = await Promise.all(tiles);
  const strip = await sharp({
    create: {
      width: 256 * resolved.length,
      height: 256,
      channels: 3,
      background: { r: 247, g: 244, b: 239 },
    },
  })
    .composite(resolved.map((input, i) => ({ input, left: i * 256, top: 0 })))
    .png()
    .toBuffer();
  await writeFile(path.join(OUT, "side-by-side.png"), strip);

  const summary = {
    acceptance: {
      mirror: "recognisably the same artwork",
      refine: "same logo professionally cleaned and balanced",
      advance: "stronger contemporary identity clearly descended from the original",
      explore: "broader alternatives, without pretending to be faithful",
    },
    scoreboard,
    sideBySideScores: concepts[0]?.providerMetadata.sideBySideScores,
    allMirrorPass: scoreboard.some((s) => s.mode === "mirror" && Number(s.ssim) >= 0.78),
  };
  await writeFile(path.join(OUT, "summary.json"), JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
