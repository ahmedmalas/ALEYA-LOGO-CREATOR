import sharp from "sharp";
import {
  applyDesignTransforms,
  type TransformReport,
  type TypographySuggestion,
} from "@/lib/logo/design-transforms";
// imagetracerjs has no types; CommonJS export.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const ImageTracer = require("imagetracerjs") as {
  imagedataToSVG: (
    imgd: { width: number; height: number; data: Uint8ClampedArray | Buffer },
    options?: Record<string, unknown>,
  ) => string;
};

export type ColourRegion = {
  hex: string;
  pixelCount: number;
  role: "background" | "primary" | "secondary" | "accent" | "detail";
  bbox: { x: number; y: number; width: number; height: number };
};

export type SegmentInfo = {
  id: string;
  role: "background" | "symbol" | "wordmark" | "secondary";
  colour: string;
  bbox: { x: number; y: number; width: number; height: number };
  pathCount: number;
};

export type ReferenceReconstruction = {
  width: number;
  height: number;
  /** Editable SVG rebuilt from the reference raster (or original SVG source). */
  reconstructedSvg: string;
  /** High-res PNG used for conditioning + similarity (base64, no data: prefix). */
  referencePngBase64: string;
  colourRegions: ColourRegion[];
  segments: SegmentInfo[];
  /** Dominant non-background colours in paint order. */
  palette: string[];
  source: "svg-source" | "traced-raster";
  /** Contour/path complexity hint. */
  pathCount: number;
};

const MAX_EDGE = 1536;
const TRACE_COLORS = 12;

function rgbToHex(r: number, g: number, b: number): string {
  return (
    "#" +
    [r, g, b]
      .map((v) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase()
  );
}

function parseHex(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  if (h.length === 3) {
    return [
      parseInt(h[0]! + h[0]!, 16),
      parseInt(h[1]! + h[1]!, 16),
      parseInt(h[2]! + h[2]!, 16),
    ];
  }
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

function colourDistance(a: [number, number, number], b: [number, number, number]): number {
  const dr = a[0] - b[0];
  const dg = a[1] - b[1];
  const db = a[2] - b[2];
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

/** Quantize RGBA buffer into up to `maxColors` opaque colours + track bboxes. */
function analyzeColourRegions(
  data: Buffer,
  width: number,
  height: number,
  maxColors = TRACE_COLORS,
): ColourRegion[] {
  // Sample every Nth pixel for palette building
  const samples: [number, number, number][] = [];
  for (let i = 0; i < data.length; i += 16) {
    const a = data[i + 3]!;
    if (a < 32) continue;
    samples.push([data[i]!, data[i + 1]!, data[i + 2]!]);
  }
  if (!samples.length) return [];

  // Simple sequential clustering
  const centers: [number, number, number][] = [];
  for (const sample of samples) {
    if (centers.length === 0) {
      centers.push(sample);
      continue;
    }
    const nearest = centers.reduce(
      (best, c, idx) => {
        const d = colourDistance(sample, c);
        return d < best.d ? { d, idx } : best;
      },
      { d: Infinity, idx: 0 },
    );
    if (nearest.d > 48 && centers.length < maxColors) {
      centers.push(sample);
    } else {
      // nudge center
      const c = centers[nearest.idx]!;
      c[0] = Math.round((c[0] + sample[0]) / 2);
      c[1] = Math.round((c[1] + sample[1]) / 2);
      c[2] = Math.round((c[2] + sample[2]) / 2);
    }
  }

  type Acc = {
    count: number;
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
    rgb: [number, number, number];
  };
  const accs: Acc[] = centers.map((rgb) => ({
    count: 0,
    minX: width,
    minY: height,
    maxX: 0,
    maxY: 0,
    rgb,
  }));

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4;
      if (data[i + 3]! < 32) continue;
      const rgb: [number, number, number] = [data[i]!, data[i + 1]!, data[i + 2]!];
      let best = 0;
      let bestD = Infinity;
      for (let c = 0; c < centers.length; c += 1) {
        const d = colourDistance(rgb, centers[c]!);
        if (d < bestD) {
          bestD = d;
          best = c;
        }
      }
      const a = accs[best]!;
      a.count += 1;
      a.minX = Math.min(a.minX, x);
      a.minY = Math.min(a.minY, y);
      a.maxX = Math.max(a.maxX, x);
      a.maxY = Math.max(a.maxY, y);
    }
  }

  const total = accs.reduce((s, a) => s + a.count, 0) || 1;
  const regions = accs
    .filter((a) => a.count > 0)
    .map((a) => {
      const hex = rgbToHex(a.rgb[0], a.rgb[1], a.rgb[2]);
      const areaRatio = a.count / total;
      const touchesEdge =
        a.minX <= 2 || a.minY <= 2 || a.maxX >= width - 3 || a.maxY >= height - 3;
      let role: ColourRegion["role"] = "detail";
      if (areaRatio > 0.35 && touchesEdge) role = "background";
      else if (areaRatio > 0.12) role = "primary";
      else if (areaRatio > 0.05) role = "secondary";
      else role = "accent";
      return {
        hex,
        pixelCount: a.count,
        role,
        bbox: {
          x: a.minX,
          y: a.minY,
          width: Math.max(1, a.maxX - a.minX + 1),
          height: Math.max(1, a.maxY - a.minY + 1),
        },
      };
    })
    .sort((a, b) => b.pixelCount - a.pixelCount);

  // Ensure only one background (largest edge-touching)
  let bgSet = false;
  return regions.map((r) => {
    if (r.role === "background") {
      if (bgSet) return { ...r, role: "secondary" as const };
      bgSet = true;
    }
    return r;
  });
}

function classifySegments(regions: ColourRegion[], width: number, height: number): SegmentInfo[] {
  const ink = regions.filter((r) => r.role !== "background");
  return ink.map((r, index) => {
    const cx = r.bbox.x + r.bbox.width / 2;
    const cy = r.bbox.y + r.bbox.height / 2;
    const aspect = r.bbox.width / Math.max(1, r.bbox.height);
    // Heuristic: wide mid-band regions → wordmark; compact left/center → symbol
    let role: SegmentInfo["role"] = "secondary";
    if (aspect > 2.2 && r.bbox.width > width * 0.35) role = "wordmark";
    else if (r.bbox.width < width * 0.45 && r.bbox.height > height * 0.2 && cx < width * 0.55)
      role = "symbol";
    else if (r.role === "primary") role = aspect > 1.6 ? "wordmark" : "symbol";
    else role = "secondary";
    return {
      id: `seg-${index}`,
      role,
      colour: r.hex,
      bbox: r.bbox,
      pathCount: 0,
    };
  });
}

function normalizeSvgViewBox(svg: string, width: number, height: number): string {
  // Force a consistent 512 artboard while preserving aspect via nested group scale.
  const scale = 512 / Math.max(width, height);
  const ox = (512 - width * scale) / 2;
  const oy = (512 - height * scale) / 2;
  const inner = svg
    .replace(/^[\s\S]*?<svg[^>]*>/i, "")
    .replace(/<\/svg>[\s\S]*$/i, "");
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512" data-reconstruction="true" role="img">
  <rect width="512" height="512" fill="transparent"/>
  <g transform="translate(${ox.toFixed(2)},${oy.toFixed(2)}) scale(${scale.toFixed(5)})" data-source-size="${width}x${height}">
    ${inner}
  </g>
</svg>`;
}

function countPaths(svg: string): number {
  return (svg.match(/<path\b/gi) || []).length;
}

function stripBackgroundFills(svg: string, backgroundHex: string | undefined): string {
  if (!backgroundHex) return svg;
  const variants = [
    backgroundHex,
    backgroundHex.toLowerCase(),
    backgroundHex.toUpperCase(),
  ];
  let out = svg;
  for (const hex of variants) {
    // Remove full-canvas rects / paths filled with background
    out = out.replace(
      new RegExp(`<rect[^>]*fill="${hex}"[^>]*\\/?>`, "gi"),
      "",
    );
    out = out.replace(
      new RegExp(`<path[^>]*fill="${hex}"[^>]*\\/?>`, "gi"),
      "",
    );
  }
  // Also common near-white backgrounds
  if (/^#F{3,8}$/i.test(backgroundHex) || /^#FFF/i.test(backgroundHex)) {
    out = out.replace(/<rect[^>]*fill="#(?:FFF|FFFFFF|F[7-9A-F]{5})"[^>]*\/?>/gi, "");
  }
  return out;
}

export async function prepareHighResReference(
  input: Buffer,
  mimeType: string,
): Promise<{ png: Buffer; width: number; height: number; fromSvg: boolean; svgSource?: string }> {
  if (mimeType === "image/svg+xml") {
    const svgSource = input.toString("utf8");
    const png = await sharp(input)
      .ensureAlpha()
      .resize(MAX_EDGE, MAX_EDGE, { fit: "inside", withoutEnlargement: false })
      .png()
      .toBuffer();
    const meta = await sharp(png).metadata();
    return {
      png,
      width: meta.width ?? MAX_EDGE,
      height: meta.height ?? MAX_EDGE,
      fromSvg: true,
      svgSource,
    };
  }

  const png = await sharp(input)
    .ensureAlpha()
    .resize(MAX_EDGE, MAX_EDGE, { fit: "inside", withoutEnlargement: false })
    .png()
    .toBuffer();
  const meta = await sharp(png).metadata();
  return {
    png,
    width: meta.width ?? MAX_EDGE,
    height: meta.height ?? MAX_EDGE,
    fromSvg: false,
  };
}

function traceRasterToSvg(
  rgba: Buffer,
  width: number,
  height: number,
  options?: { colors?: number; pathomit?: number; ltres?: number; qtres?: number },
): string {
  const imgd = {
    width,
    height,
    data: new Uint8ClampedArray(rgba.buffer, rgba.byteOffset, rgba.byteLength),
  };
  return ImageTracer.imagedataToSVG(imgd, {
    ltres: options?.ltres ?? 0.8,
    qtres: options?.qtres ?? 0.8,
    pathomit: options?.pathomit ?? 4,
    colorsampling: 2,
    numberofcolors: options?.colors ?? TRACE_COLORS,
    blurradius: 0,
    blurdelta: 20,
    strokewidth: 0,
    linefilter: true,
    scale: 1,
    roundcoords: 1,
    viewbox: true,
    desc: false,
  });
}

function isNearWhite(hex: string): boolean {
  const [r, g, b] = parseHex(hex);
  return r > 235 && g > 235 && b > 235;
}

function isLowChromaGray(hex: string): boolean {
  const [r, g, b] = parseHex(hex);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  // Anti-aliased greys between ink and white — skip as their own layers.
  return max - min < 28 && max > 120 && max < 230;
}

function forceFills(svgInner: string, hex: string): string {
  return svgInner
    .replace(/fill="[^"]*"/gi, `fill="${hex}"`)
    .replace(/stroke="[^"]*"/gi, `stroke="none"`)
    .replace(/\sopacity="[^"]*"/gi, "")
    .replace(/<path\b[^>]*opacity="0"[^>]*\/?>/gi, "")
    .replace(/<rect[^>]*fill="${hex}"[^>]*\/?>/gi, "");
}

function isNearColour(hex: string, target: string, maxDist: number): boolean {
  return colourDistance(parseHex(hex), parseHex(target)) <= maxDist;
}

/** Drop full-artboard underlays and near-invisible paths that wash out solid fills. */
function stripSpuriousTracePaths(svg: string, width: number, height: number): string {
  const area = Math.max(1, width * height);
  return svg.replace(/<path\b([^>]*)\/?>/gi, (full, attrs: string) => {
    if (/opacity="0"/i.test(attrs)) return "";
    const opacity = Number((attrs.match(/opacity="([^"]+)"/i) || [])[1] ?? "1");
    if (Number.isFinite(opacity) && opacity < 0.2) return "";
    const d = (attrs.match(/\bd="([^"]*)"/i) || [])[1] || "";
    const nums = [...d.matchAll(/[+-]?(?:\d*\.\d+|\d+)/g)].map((m) => Number(m[0]));
    if (nums.length >= 6) {
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      for (let i = 0; i + 1 < nums.length; i += 2) {
        minX = Math.min(minX, nums[i]!);
        minY = Math.min(minY, nums[i + 1]!);
        maxX = Math.max(maxX, nums[i]!);
        maxY = Math.max(maxY, nums[i + 1]!);
      }
      const cover = Math.max(0, maxX - minX) * Math.max(0, maxY - minY);
      // Tracer underlays: nearly full-frame rectangles.
      if (cover > area * 0.85 && nums.length <= 16) return "";
    }
    return full.replace(/\sopacity="[^"]*"/gi, "");
  });
}

/**
 * Trace each non-background colour as its own layer so secondary fills
 * (e.g. an inner gold disc) are not absorbed into the primary colour.
 */
function traceColourLayers(
  rgba: Buffer,
  width: number,
  height: number,
  regions: ColourRegion[],
): string {
  const background = regions.find((r) => r.role === "background");
  const bgHex = background?.hex ?? "#FFFFFF";
  const totalInk = regions
    .filter(
      (r) =>
        r.role !== "background" &&
        !isNearWhite(r.hex) &&
        !isNearColour(r.hex, bgHex, 36),
    )
    .reduce((s, r) => s + r.pixelCount, 0);
  // Keep strong brand inks only — absorb near-background + anti-alias greys into parents.
  const candidates = regions
    .filter(
      (r) =>
        r.role !== "background" &&
        !isNearWhite(r.hex) &&
        !isNearColour(r.hex, bgHex, 36) &&
        !isLowChromaGray(r.hex),
    )
    .filter((r) => r.pixelCount > Math.max(48, totalInk * 0.015))
    .sort((a, b) => b.pixelCount - a.pixelCount);

  // Merge near-duplicate inks (e.g. dark green + mid anti-alias green) into the dominant parent.
  const ink: ColourRegion[] = [];
  for (const region of candidates) {
    const parent = ink.find((kept) => isNearColour(kept.hex, region.hex, 85));
    if (parent) {
      parent.pixelCount += region.pixelCount;
      continue;
    }
    ink.push({ ...region });
    if (ink.length >= 3) break;
  }

  if (ink.length === 0) {
    return traceRasterToSvg(rgba, width, height, {
      colors: 12,
      pathomit: 1,
      ltres: 0.4,
      qtres: 0.4,
    });
  }

  // Assign every opaque pixel to nearest kept ink colour (absorb anti-alias into parents).
  // Trace as black-on-white — ImageTracer collapses dark-on-transparent into a washed
  // full-frame path; brand colour is reapplied via forceFills after tracing.
  const centers = ink.map((r) => parseHex(r.hex));
  const bgRgb = parseHex(bgHex);
  const layers: string[] = [];
  for (let idx = 0; idx < ink.length; idx += 1) {
    const region = ink[idx]!;
    const layer = Buffer.alloc(width * height * 4, 255);
    for (let i = 3; i < layer.length; i += 4) layer[i] = 255;
    let painted = 0;
    for (let i = 0; i < rgba.length; i += 4) {
      const a = rgba[i + 3]!;
      if (a < 32) continue;
      const rgb: [number, number, number] = [rgba[i]!, rgba[i + 1]!, rgba[i + 2]!];
      const hex = rgbToHex(rgb[0], rgb[1], rgb[2]);
      if (isNearWhite(hex) || colourDistance(rgb, bgRgb) <= 36) continue;
      let best = 0;
      let bestD = Infinity;
      for (let c = 0; c < centers.length; c += 1) {
        const d = colourDistance(rgb, centers[c]!);
        if (d < bestD) {
          bestD = d;
          best = c;
        }
      }
      // Wider absorb so anti-alias / mid-tones collapse into brand inks (solid fills).
      if (best !== idx || bestD > 110) continue;
      layer[i] = 0;
      layer[i + 1] = 0;
      layer[i + 2] = 0;
      layer[i + 3] = 255;
      painted += 1;
    }
    if (painted < 12) continue;

    const traced = ImageTracer.imagedataToSVG(
      {
        width,
        height,
        data: new Uint8ClampedArray(layer.buffer, layer.byteOffset, layer.byteLength),
      },
      {
        ltres: 0.4,
        qtres: 0.4,
        pathomit: 2,
        colorsampling: 0,
        numberofcolors: 2,
        blurradius: 0,
        strokewidth: 0,
        linefilter: true,
        scale: 1,
        roundcoords: 1,
        viewbox: false,
        desc: false,
      },
    );
    let inner = traced
      .replace(/^[\s\S]*?<svg[^>]*>/i, "")
      .replace(/<\/svg>[\s\S]*$/i, "");
    // Drop white underlays BEFORE recolouring (forceFills would otherwise paint them brand).
    inner = inner
      .replace(/<path[^>]*fill="(?:#fff(?:fff)?|white|rgb\(\s*255\s*,\s*255\s*,\s*255\s*\))"[^>]*\/?>/gi, "")
      .replace(/<rect[^>]*fill="(?:#fff(?:fff)?|white|rgb\(\s*255\s*,\s*255\s*,\s*255\s*\))"[^>]*\/?>/gi, "");
    inner = stripSpuriousTracePaths(inner, width, height);
    inner = forceFills(inner, region.hex);
    if (inner.trim()) {
      layers.push(`<g data-colour-layer="${region.hex}" data-role="${region.role}">${inner}</g>`);
    }
  }

  const composed = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  ${layers.join("\n  ")}
</svg>`;
  return stripSpuriousTracePaths(composed, width, height);
}

/**
 * Reconstruct an uploaded logo into editable SVG paths.
 * SVG sources are normalized; rasters are colour-quantized and traced.
 */
export async function reconstructReferenceLogo(input: {
  buffer: Buffer;
  mimeType: string;
  fidelity?: "faithful" | "clean" | "simplified";
}): Promise<ReferenceReconstruction> {
  const prepared = await prepareHighResReference(input.buffer, input.mimeType);
  const { width, height, png } = prepared;
  const { data } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });

  const colourRegions = analyzeColourRegions(Buffer.from(data), width, height);
  const segments = classifySegments(colourRegions, width, height);
  const background = colourRegions.find((r) => r.role === "background");
  const palette = colourRegions
    .filter((r) => r.role !== "background")
    .map((r) => r.hex)
    .slice(0, 8);

  let reconstructedSvg: string;
  let source: ReferenceReconstruction["source"];

  if (prepared.fromSvg && prepared.svgSource) {
    source = "svg-source";
    reconstructedSvg = normalizeSvgViewBox(
      stripBackgroundFills(prepared.svgSource, background?.hex),
      width,
      height,
    );
  } else {
    source = "traced-raster";
    const fidelity = input.fidelity ?? "faithful";
    const rgbaBuf = Buffer.from(data);
    let traced: string;
    if (fidelity === "faithful") {
      // Per-colour layers preserve secondary fills (inner discs, accents, letter counters).
      traced = traceColourLayers(rgbaBuf, width, height, colourRegions);
    } else if (fidelity === "clean") {
      traced = traceRasterToSvg(rgbaBuf, width, height, {
        colors: 12,
        pathomit: 3,
        ltres: 0.8,
        qtres: 0.8,
      });
    } else {
      traced = traceRasterToSvg(rgbaBuf, width, height, {
        colors: 8,
        pathomit: 8,
        ltres: 1.4,
        qtres: 1.4,
      });
    }
    reconstructedSvg = normalizeSvgViewBox(
      stripSpuriousTracePaths(
        stripBackgroundFills(traced, background?.hex ?? "#FFFFFF"),
        width,
        height,
      ),
      width,
      height,
    );
  }

  // Similarity conditioning raster: white background for stable compare
  const referencePng = await sharp(png)
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .resize(512, 512, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .png()
    .toBuffer();

  return {
    width,
    height,
    reconstructedSvg,
    referencePngBase64: referencePng.toString("base64"),
    colourRegions,
    segments,
    palette,
    source,
    pathCount: countPaths(reconstructedSvg),
  };
}

export type DeriveOptions = {
  modernisation?: number;
  simplification?: number;
  creativity?: number;
  palette?: string[];
  preserveColours?: boolean;
  preserveTypography?: boolean;
  preserveSymbol?: boolean;
  logoText?: string;
  fontGuess?: string;
  fontCategoryMatch?: string;
  typographyCategory?: string;
  letterSpacing?: string;
};

export type { TransformReport, TypographySuggestion };

/**
 * Derive Mirror / Refine / Advance / Explore from an immutable faithful redraw.
 * Performs genuine optical and geometric transforms — never swaps in a generic mark.
 */
export function deriveSvgFromReconstruction(
  faithfulSvg: string,
  mode: "mirror" | "refine" | "advance" | "explore",
  options?: DeriveOptions,
): string {
  return deriveSvgFromReconstructionWithReport(faithfulSvg, mode, options).svg;
}

export function deriveSvgFromReconstructionWithReport(
  faithfulSvg: string,
  mode: "mirror" | "refine" | "advance" | "explore",
  options?: DeriveOptions,
): { svg: string; report: TransformReport } {
  return applyDesignTransforms(faithfulSvg, mode, {
    modernisation: options?.modernisation,
    simplification: options?.simplification,
    creativity: options?.creativity,
    palette: options?.palette,
    preserveColours: options?.preserveColours,
    preserveTypography: options?.preserveTypography,
    preserveSymbol: options?.preserveSymbol,
    logoText: options?.logoText,
    fontGuess: options?.fontGuess,
    fontCategoryMatch: options?.fontCategoryMatch,
    typographyCategory: options?.typographyCategory,
    letterSpacing: options?.letterSpacing,
  });
}
