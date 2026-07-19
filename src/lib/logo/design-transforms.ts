/**
 * Design transforms applied on top of an immutable faithful redraw.
 * Mirror = production cleanup only.
 * Refine = optical cleanup of the same logo.
 * Advance = premium geometry evolution that still descends from the original.
 * Explore = broader reinterpretation of the same path DNA.
 */

export type EvolutionMode = "mirror" | "refine" | "advance" | "explore";

export type TypographySuggestion = {
  matched: string;
  category: string;
  substitutes: string[];
  rationale: string;
};

export type TransformOptions = {
  modernisation?: number;
  simplification?: number;
  creativity?: number;
  preserveColours?: boolean;
  preserveTypography?: boolean;
  preserveSymbol?: boolean;
  logoText?: string;
  fontGuess?: string;
  fontCategoryMatch?: string;
  typographyCategory?: string;
  letterSpacing?: string;
  palette?: string[];
};

export type TransformReport = {
  mode: EvolutionMode;
  operations: string[];
  preservedDetails: number;
  markPathCount: number;
  wordmarkPathCount: number;
  secondaryPathCount: number;
  typography: TypographySuggestion;
  /** Human-readable mode differentiation for UI. */
  differentiation: string;
};

type PathCmd = { cmd: string; args: number[] };

type PathRecord = {
  full: string;
  d: string;
  fill: string;
  attrs: string;
  index: number;
  bbox: { x: number; y: number; width: number; height: number; cx: number; cy: number; area: number };
  closed: boolean;
  pointCount: number;
  segment: "mark" | "wordmark" | "detail" | "secondary";
  clusterId: number;
};

const FONT_BY_CATEGORY: Record<string, { matched: string; substitutes: string[] }> = {
  serif: {
    matched: "Libre Baskerville",
    substitutes: ["Playfair Display", "Cormorant Garamond", "Source Serif 4", "Georgia"],
  },
  "modern-serif": {
    matched: "Cormorant Garamond",
    substitutes: ["Playfair Display", "Libre Baskerville", "EB Garamond"],
  },
  sans: {
    matched: "Space Grotesk",
    substitutes: ["Montserrat", "IBM Plex Sans", "DM Sans", "Helvetica Neue"],
  },
  "geometric-sans": {
    matched: "Montserrat",
    substitutes: ["Space Grotesk", "DM Sans", "Futura", "Avenir"],
  },
  display: {
    matched: "Anton",
    substitutes: ["Archivo Black", "Bebas Neue", "Oswald"],
  },
  script: {
    matched: "Great Vibes",
    substitutes: ["Allura", "Sacramento", "Pacifico"],
  },
  mono: {
    matched: "IBM Plex Mono",
    substitutes: ["JetBrains Mono", "Space Mono", "Source Code Pro"],
  },
  unknown: {
    matched: "Georgia",
    substitutes: ["Libre Baskerville", "Space Grotesk", "Montserrat"],
  },
};

function normalizeCategory(raw: string): string {
  const s = raw.toLowerCase();
  if (/geometric/.test(s) && /sans/.test(s)) return "geometric-sans";
  if (/modern/.test(s) && /serif/.test(s)) return "modern-serif";
  if (/serif|garamond|baskerville|didot|bodoni/.test(s)) return "serif";
  if (/script|hand|calligraphy|brush/.test(s)) return "script";
  if (/mono|typewriter|code/.test(s)) return "mono";
  if (/display|impact|condensed|black/.test(s)) return "display";
  if (/sans|grotesk|helvetica|gothic|arial/.test(s)) return "sans";
  return "unknown";
}

export function suggestTypography(input: {
  fontGuess?: string;
  fontCategoryMatch?: string;
  typographyCategory?: string;
  preserveTypography?: boolean;
  mode?: EvolutionMode;
}): TypographySuggestion {
  const guess = (input.fontGuess || "").trim();
  const category = normalizeCategory(
    input.fontCategoryMatch || input.typographyCategory || guess || "unknown",
  );
  const catalog = FONT_BY_CATEGORY[category] ?? FONT_BY_CATEGORY.unknown!;
  const matched = guess || catalog.matched;
  const substitutes = catalog.substitutes.filter(
    (s) => s.toLowerCase() !== matched.toLowerCase(),
  );
  const mode = input.mode ?? "refine";
  let rationale: string;
  if (guess) {
    rationale =
      mode === "advance" && !input.preserveTypography
        ? `Matched "${guess}"; Advance may use a high-quality ${category} substitute for clearer contemporary typesetting.`
        : `Closest match "${guess}" (${category}); keep glyph DNA, use substitutes only if outlines cannot be productionised.`;
  } else {
    rationale = `Category ${category}: prefer ${matched}; substitutes ${substitutes.slice(0, 3).join(", ")}.`;
  }
  return { matched, category, substitutes: substitutes.slice(0, 4), rationale };
}

function tokenizePath(d: string): PathCmd[] {
  const cmds: PathCmd[] = [];
  const re = /([MmLlHhVvCcSsQqTtAaZz])|([+-]?(?:\d*\.\d+|\d+)(?:[eE][+-]?\d+)?)/g;
  let current: PathCmd | null = null;
  let match: RegExpExecArray | null;
  while ((match = re.exec(d))) {
    if (match[1]) {
      if (current) cmds.push(current);
      current = { cmd: match[1], args: [] };
    } else if (match[2] && current) {
      current.args.push(Number(match[2]));
    }
  }
  if (current) cmds.push(current);
  return cmds;
}

function serializePath(cmds: PathCmd[], decimals: number): string {
  return cmds
    .map((c) => {
      if (!c.args.length) return c.cmd;
      const nums = c.args.map((n) => {
        if (!Number.isFinite(n)) return "0";
        const f = Number(n.toFixed(decimals));
        return Number.isInteger(f) ? String(f) : String(f);
      });
      return `${c.cmd}${nums.join(" ")}`;
    })
    .join("");
}

/** Map absolute-ish coordinates; ImageTracer emits absolute commands. */
function mapPathCommands(
  cmds: PathCmd[],
  mapPoint: (x: number, y: number) => [number, number],
): PathCmd[] {
  let cx = 0;
  let cy = 0;
  const out: PathCmd[] = [];
  for (const c of cmds) {
    const cmd = c.cmd;
    const a = c.args;
    const upper = cmd.toUpperCase();
    const rel = cmd !== upper;
    const next: number[] = [];
    const pushPt = (x: number, y: number, absolute: boolean) => {
      const ax = absolute ? x : cx + x;
      const ay = absolute ? y : cy + y;
      const [nx, ny] = mapPoint(ax, ay);
      if (absolute) {
        next.push(nx, ny);
        cx = nx;
        cy = ny;
      } else {
        next.push(nx - cx, ny - cy);
        cx = nx;
        cy = ny;
      }
    };

    if (upper === "Z") {
      out.push({ cmd, args: [] });
      continue;
    }
    if (upper === "H") {
      for (const x of a) {
        const ax = rel ? cx + x : x;
        const [nx] = mapPoint(ax, cy);
        next.push(rel ? nx - cx : nx);
        cx = nx;
      }
      out.push({ cmd, args: next });
      continue;
    }
    if (upper === "V") {
      for (const y of a) {
        const ay = rel ? cy + y : y;
        const [, ny] = mapPoint(cx, ay);
        next.push(rel ? ny - cy : ny);
        cy = ny;
      }
      out.push({ cmd, args: next });
      continue;
    }
    if (upper === "A") {
      for (let i = 0; i + 6 < a.length; i += 7) {
        next.push(a[i]!, a[i + 1]!, a[i + 2]!, a[i + 3]!, a[i + 4]!);
        pushPt(a[i + 5]!, a[i + 6]!, !rel);
      }
      out.push({ cmd, args: next });
      continue;
    }
    // M L T Q S C — consume in pairs / sextets via pairwise for simplicity
    const stride = upper === "C" ? 6 : upper === "S" || upper === "Q" ? 4 : 2;
    for (let i = 0; i + stride - 1 < a.length; i += stride) {
      for (let k = 0; k < stride; k += 2) {
        pushPt(a[i + k]!, a[i + k + 1]!, !rel);
      }
      // After first M pair, subsequent pairs behave like L — already handled by stride 2
      if (upper === "M" && i === 0) {
        // ok
      }
    }
    out.push({ cmd, args: next });
  }
  return out;
}

function pathPoints(cmds: PathCmd[]): { x: number; y: number }[] {
  const pts: { x: number; y: number }[] = [];
  mapPathCommands(cmds, (x, y) => {
    pts.push({ x, y });
    return [x, y];
  });
  return pts;
}

function bboxOf(pts: { x: number; y: number }[]) {
  if (!pts.length) {
    return { x: 0, y: 0, width: 0, height: 0, cx: 0, cy: 0, area: 0 };
  }
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of pts) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  const width = Math.max(0, maxX - minX);
  const height = Math.max(0, maxY - minY);
  return {
    x: minX,
    y: minY,
    width,
    height,
    cx: minX + width / 2,
    cy: minY + height / 2,
    area: width * height,
  };
}

function snapNearAxis(cmds: PathCmd[], tolerance: number): PathCmd[] {
  const pts = pathPoints(cmds);
  if (pts.length < 2) return cmds;
  // Collect near-horizontal / near-vertical spans via consecutive points
  const yBuckets = new Map<number, number>();
  const xBuckets = new Map<number, number>();
  for (const p of pts) {
    const yk = Math.round(p.y / tolerance) * tolerance;
    const xk = Math.round(p.x / tolerance) * tolerance;
    yBuckets.set(yk, (yBuckets.get(yk) || 0) + 1);
    xBuckets.set(xk, (xBuckets.get(xk) || 0) + 1);
  }
  const dominantY = [...yBuckets.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  const dominantX = [...xBuckets.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  return mapPathCommands(cmds, (x, y) => {
    let nx = x;
    let ny = y;
    if (dominantY !== undefined && Math.abs(y - dominantY) <= tolerance) ny = dominantY;
    if (dominantX !== undefined && Math.abs(x - dominantX) <= tolerance) nx = dominantX;
    return [nx, ny];
  });
}

function simplifyCommands(cmds: PathCmd[], epsilon: number): PathCmd[] {
  // Drop micro midpoints on polylines (L segments) while keeping curves and ends.
  const out: PathCmd[] = [];
  for (const c of cmds) {
    const upper = c.cmd.toUpperCase();
    if (upper !== "L" || c.args.length < 4) {
      out.push(c);
      continue;
    }
    const kept: number[] = [];
    let prevX = c.args[0]!;
    let prevY = c.args[1]!;
    kept.push(prevX, prevY);
    for (let i = 2; i + 1 < c.args.length; i += 2) {
      const x = c.args[i]!;
      const y = c.args[i + 1]!;
      const dist = Math.hypot(x - prevX, y - prevY);
      if (dist >= epsilon || i + 2 >= c.args.length) {
        kept.push(x, y);
        prevX = x;
        prevY = y;
      }
    }
    out.push({ cmd: c.cmd, args: kept });
  }
  return out;
}

function extractPaths(svg: string): PathRecord[] {
  const re = /<path\b([^>]*)\/?>/gi;
  const records: PathRecord[] = [];
  let m: RegExpExecArray | null;
  let index = 0;
  while ((m = re.exec(svg))) {
    // Strip a trailing self-close slash captured by [^>]* before \/?
    const attrs = (m[1] || "").replace(/\/\s*$/, "").trim();
    const dMatch = attrs.match(/\bd="([^"]*)"/i);
    if (!dMatch) continue;
    const d = dMatch[1] || "";
    const fillMatch = attrs.match(/\bfill="([^"]*)"/i);
    const fill = fillMatch?.[1] || "#000000";
    const cmds = tokenizePath(d);
    const pts = pathPoints(cmds);
    const bbox = bboxOf(pts);
    const closed = /z/i.test(d);
    records.push({
      full: m[0],
      d,
      fill,
      attrs,
      index,
      bbox,
      closed,
      pointCount: pts.length,
      segment: "secondary",
      clusterId: -1,
    });
    index += 1;
  }
  return records;
}

function clusterPaths(paths: PathRecord[]): void {
  const n = paths.length;
  const parent = paths.map((_, i) => i);
  const find = (i: number): number => {
    while (parent[i] !== i) {
      parent[i] = parent[parent[i]!]!;
      i = parent[i]!;
    }
    return i;
  };
  const union = (a: number, b: number) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent[ra] = rb;
  };
  const gap = 14;
  for (let i = 0; i < n; i += 1) {
    const a = paths[i]!.bbox;
    for (let j = i + 1; j < n; j += 1) {
      const b = paths[j]!.bbox;
      const ox = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
      const oy = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
      if (ox > -gap && oy > -gap) union(i, j);
    }
  }
  const map = new Map<number, number>();
  let next = 0;
  for (let i = 0; i < n; i += 1) {
    const r = find(i);
    if (!map.has(r)) map.set(r, next++);
    paths[i]!.clusterId = map.get(r)!;
  }
}

function classifySegments(paths: PathRecord[]): void {
  if (!paths.length) return;
  const content = bboxOf(
    paths.flatMap((p) => [
      { x: p.bbox.x, y: p.bbox.y },
      { x: p.bbox.x + p.bbox.width, y: p.bbox.y + p.bbox.height },
    ]),
  );
  const totalArea = Math.max(1, content.area);

  // Prefer cluster-level classification so leading glyphs are not mistaken for the mark.
  const clusters = new Map<number, PathRecord[]>();
  for (const p of paths) {
    const list = clusters.get(p.clusterId) || [];
    list.push(p);
    clusters.set(p.clusterId, list);
  }
  type ClusterBox = {
    id: number;
    members: PathRecord[];
    box: ReturnType<typeof bboxOf>;
    aspect: number;
  };
  const clusterBoxes: ClusterBox[] = [...clusters.entries()].map(([id, members]) => {
    const box = bboxOf(
      members.flatMap((p) => [
        { x: p.bbox.x, y: p.bbox.y },
        { x: p.bbox.x + p.bbox.width, y: p.bbox.y + p.bbox.height },
      ]),
    );
    return {
      id,
      members,
      box,
      aspect: box.width / Math.max(1, box.height),
    };
  });

  // Mark = largest compact cluster in the left half of the lockup.
  let bestMark: ClusterBox | null = null;
  for (const c of clusterBoxes) {
    if (c.box.cx > content.x + content.width * 0.5) continue;
    if (c.aspect >= 2.4) continue;
    if (c.box.width > content.width * 0.5) continue;
    if (!bestMark || c.box.area > bestMark.box.area) bestMark = c;
  }

  const markRight = bestMark
    ? bestMark.box.x + bestMark.box.width * 0.92
    : content.x + content.width * 0.35;

  for (const c of clusterBoxes) {
    let role: PathRecord["segment"] = "wordmark";
    if (bestMark && c.id === bestMark.id) role = "mark";
    else if (c.box.cx < markRight && c.aspect < 2.2 && c.box.width < content.width * 0.45) {
      // Secondary mark-adjacent geometry (rings / accents) still left of wordmark.
      role = bestMark && c.box.area < bestMark.box.area * 0.85 ? "mark" : "wordmark";
    } else {
      role = "wordmark";
    }
    for (const p of c.members) p.segment = role;
  }

  // Small enclosed details inside mark envelope — preserve counters / inner discs.
  const markBox = bestMark?.box ?? bboxOf([]);
  if (markBox.width > 0 && markBox.height > 0) {
    const markArea = Math.max(1, markBox.area);
    for (const p of paths) {
      const insideMark =
        p.bbox.cx >= markBox.x + markBox.width * 0.12 &&
        p.bbox.cx <= markBox.x + markBox.width * 0.88 &&
        p.bbox.cy >= markBox.y + markBox.height * 0.12 &&
        p.bbox.cy <= markBox.y + markBox.height * 0.88;
      const relative = p.bbox.area / markArea;
      const globalRatio = p.bbox.area / totalArea;
      if (
        p.closed &&
        insideMark &&
        relative > 0 &&
        relative < 0.35 &&
        globalRatio < 0.03 &&
        p.bbox.width < markBox.width * 0.7 &&
        p.bbox.height < markBox.height * 0.7
      ) {
        p.segment = "detail";
      }
    }
  }

  // Hard rule: anything clearly to the right of the mark envelope is wordmark.
  if (markBox.width > 0) {
    const cut = markBox.x + markBox.width * 0.98;
    for (const p of paths) {
      if (p.segment === "detail") continue;
      if (p.bbox.x >= cut) p.segment = "wordmark";
    }
  }
}

function opticalKernWordmark(paths: PathRecord[], amount: number): Map<number, { dx: number; dy: number }> {
  const shifts = new Map<number, { dx: number; dy: number }>();
  const wordClusters = new Map<number, PathRecord[]>();
  for (const p of paths) {
    if (p.segment !== "wordmark") continue;
    const list = wordClusters.get(p.clusterId) || [];
    list.push(p);
    wordClusters.set(p.clusterId, list);
  }
  const clusters = [...wordClusters.entries()]
    .map(([id, members]) => {
      const box = bboxOf(
        members.flatMap((p) => [
          { x: p.bbox.x, y: p.bbox.y },
          { x: p.bbox.x + p.bbox.width, y: p.bbox.y + p.bbox.height },
        ]),
      );
      return { id, members, box };
    })
    .filter((c) => c.box.width > 0)
    .sort((a, b) => a.box.x - b.box.x);

  if (clusters.length < 2) {
    // Single wordmark blob — baseline-align as a unit to mark if present.
    return shifts;
  }

  // Cap kerning aggression: only nudge outliers, never rebuild the whole line
  // (aggressive rebuilds shatter serif wordmarks into stacked glyphs).
  const gaps: number[] = [];
  for (let i = 0; i < clusters.length - 1; i += 1) {
    gaps.push(clusters[i + 1]!.box.x - (clusters[i]!.box.x + clusters[i]!.box.width));
  }
  const medianGap = [...gaps].sort((a, b) => a - b)[Math.floor(gaps.length / 2)] ?? 0;
  const baselines = clusters.map((c) => c.box.y + c.box.height);
  const targetBaseline =
    baselines.reduce((s, v) => s + v, 0) / Math.max(1, baselines.length);

  for (let i = 0; i < clusters.length; i += 1) {
    const c = clusters[i]!;
    let dx = 0;
    if (i > 0 && medianGap > 0) {
      const gap = gaps[i - 1]!;
      const delta = medianGap - gap;
      // Only correct large gap errors; keep letter identity intact.
      if (Math.abs(delta) > medianGap * 0.35) {
        dx = delta * amount * 0.35;
      }
    }
    const dy = (targetBaseline - (c.box.y + c.box.height)) * Math.min(1, amount) * 0.65;
    if (dx === 0 && Math.abs(dy) < 0.15) continue;
    for (const p of c.members) {
      shifts.set(p.index, { dx, dy });
    }
  }
  return shifts;
}

function symmetryAlignMark(paths: PathRecord[], strength: number): Map<number, { dx: number; dy: number }> {
  const shifts = new Map<number, { dx: number; dy: number }>();
  const mark = paths.filter((p) => p.segment === "mark" || p.segment === "detail");
  if (!mark.length) return shifts;
  const box = bboxOf(
    mark.flatMap((p) => [
      { x: p.bbox.x, y: p.bbox.y },
      { x: p.bbox.x + p.bbox.width, y: p.bbox.y + p.bbox.height },
    ]),
  );
  // Snap mark center toward nearest 0.5px grid and vertical optical center with wordmark
  const word = paths.filter((p) => p.segment === "wordmark");
  let targetCy = box.cy;
  if (word.length) {
    const wbox = bboxOf(
      word.flatMap((p) => [
        { x: p.bbox.x, y: p.bbox.y },
        { x: p.bbox.x + p.bbox.width, y: p.bbox.y + p.bbox.height },
      ]),
    );
    targetCy = box.cy * (1 - strength * 0.55) + wbox.cy * (strength * 0.55);
  }
  const dx = (Math.round(box.cx * 2) / 2 - box.cx) * strength;
  const dy = (targetCy - box.cy) * strength;
  for (const p of mark) {
    shifts.set(p.index, { dx, dy });
  }
  return shifts;
}

function mergeShifts(
  ...maps: Map<number, { dx: number; dy: number }>[]
): Map<number, { dx: number; dy: number }> {
  const out = new Map<number, { dx: number; dy: number }>();
  for (const m of maps) {
    for (const [k, v] of m) {
      const prev = out.get(k) || { dx: 0, dy: 0 };
      out.set(k, { dx: prev.dx + v.dx, dy: prev.dy + v.dy });
    }
  }
  return out;
}

function rewriteSvgPaths(
  svg: string,
  paths: PathRecord[],
  options: {
    shifts: Map<number, { dx: number; dy: number }>;
    decimals: number;
    simplifyEpsilon: number;
    axisSnap: number;
    dropNoise: boolean;
    noiseAreaRatio: number;
    markScale?: { cx: number; cy: number; scale: number };
    wordScale?: { cx: number; cy: number; scale: number };
    tagSegments: boolean;
  },
): { svg: string; dropped: number } {
  const totalArea = Math.max(
    1,
    bboxOf(
      paths.flatMap((p) => [
        { x: p.bbox.x, y: p.bbox.y },
        { x: p.bbox.x + p.bbox.width, y: p.bbox.y + p.bbox.height },
      ]),
    ).area,
  );
  let dropped = 0;
  let out = svg;
  // Replace from the end so indices in string remain stable for unique full matches
  const ordered = [...paths].sort((a, b) => b.index - a.index);
  for (const p of ordered) {
    if (
      options.dropNoise &&
      p.segment !== "detail" &&
      p.segment !== "mark" &&
      p.bbox.area / totalArea < options.noiseAreaRatio &&
      p.pointCount < 6
    ) {
      out = out.replace(p.full, "");
      dropped += 1;
      continue;
    }

    let cmds = tokenizePath(p.d);
    if (options.axisSnap > 0 && (p.segment === "mark" || p.segment === "detail")) {
      cmds = snapNearAxis(cmds, options.axisSnap);
    }
    if (options.simplifyEpsilon > 0 && p.segment !== "detail") {
      cmds = simplifyCommands(cmds, options.simplifyEpsilon);
    }

    const shift = options.shifts.get(p.index) || { dx: 0, dy: 0 };
    const scaleTarget =
      p.segment === "wordmark"
        ? options.wordScale
        : p.segment === "mark" || p.segment === "detail"
          ? options.markScale
          : undefined;

    cmds = mapPathCommands(cmds, (x, y) => {
      let nx = x + shift.dx;
      let ny = y + shift.dy;
      if (scaleTarget && scaleTarget.scale !== 1) {
        nx = scaleTarget.cx + (nx - scaleTarget.cx) * scaleTarget.scale;
        ny = scaleTarget.cy + (ny - scaleTarget.cy) * scaleTarget.scale;
      }
      return [nx, ny];
    });

    const d = serializePath(cmds, options.decimals);
    let attrs = p.attrs.replace(/\bd="[^"]*"/i, `d="${d}"`).trim();
    if (options.tagSegments) {
      if (!/\bdata-segment=/.test(attrs)) {
        attrs += ` data-segment="${p.segment}" data-cluster="${p.clusterId}"`;
      }
      if (p.segment === "detail" && !/\bdata-detail=/.test(attrs)) {
        attrs += ` data-detail="preserve"`;
      }
    }
    const replacement = `<path ${attrs} />`;
    out = out.replace(p.full, replacement);
  }
  return { svg: out, dropped };
}

function wrapSegmentGroups(svg: string, paths: PathRecord[]): string {
  // Non-destructive: annotate colour layers / path DNA for separate mark vs wordmark editing.
  // Never tear apart existing colour-layer groups (secondary fills / counters live there).
  if (/data-edit-group=/.test(svg)) return svg;

  let out = svg;
  if (/data-colour-layer=/.test(out)) {
    const layerRe = /<g\b([^>]*data-colour-layer="[^"]*"[^>]*)>/gi;
    out = out.replace(layerRe, (full, attrs: string) => {
      if (/data-edit-group=/.test(attrs)) return full;
      // Classify layer by majority segment of paths whose fill matches layer colour.
      const colour = (attrs.match(/data-colour-layer="([^"]*)"/i) || [])[1] || "";
      const layerPaths = paths.filter(
        (p) => p.fill.toLowerCase() === colour.toLowerCase(),
      );
      const counts = { mark: 0, wordmark: 0, detail: 0, secondary: 0 };
      for (const p of layerPaths) counts[p.segment] += 1;
      const role =
        counts.detail > 0 && counts.mark + counts.detail >= counts.wordmark
          ? "mark"
          : counts.mark >= counts.wordmark
            ? "mark"
            : counts.wordmark > 0
              ? "wordmark"
              : "secondary";
      return `<g ${attrs.trim()} data-edit-group="${role}">`;
    });
    return out;
  }

  // Flat path SVGs (no colour layers): wrap into editable groups.
  const openMatch = out.match(
    /<g\b[^>]*transform="translate\([^"]*\)[^"]*"[^>]*>/i,
  );
  if (!openMatch || openMatch.index === undefined) return out;
  const open = openMatch[0];
  const start = openMatch.index + open.length;
  const end = out.lastIndexOf("</g>");
  if (end <= start) return out;
  const body = out.slice(start, end);
  const markParts: string[] = [];
  const wordParts: string[] = [];
  const otherParts: string[] = [];
  const pieces = body.split(/(?=<path\b)/i).filter((s) => s.trim());
  for (const piece of pieces) {
    if (!/<path\b/i.test(piece)) {
      otherParts.push(piece);
      continue;
    }
    if (/data-segment="mark"|data-segment="detail"/i.test(piece)) markParts.push(piece);
    else if (/data-segment="wordmark"/i.test(piece)) wordParts.push(piece);
    else otherParts.push(piece);
  }
  const regrouped = [
    otherParts.join(""),
    markParts.length
      ? `<g data-edit-group="mark" data-role="symbol">${markParts.join("")}</g>`
      : "",
    wordParts.length
      ? `<g data-edit-group="wordmark" data-role="wordmark">${wordParts.join("")}</g>`
      : "",
  ].join("");
  return out.slice(0, start) + regrouped + out.slice(end);
}

function injectTypographyHint(
  svg: string,
  suggestion: TypographySuggestion,
  logoText: string,
  mode: EvolutionMode,
): string {
  if (!logoText.trim()) return svg;
  const hint = `<!-- typography: matched=${suggestion.matched}; category=${suggestion.category}; substitutes=${suggestion.substitutes.join("|")}; mode=${mode} -->`;
  if (svg.includes("<!-- typography:")) {
    return svg.replace(/<!-- typography:[\s\S]*?-->/, hint);
  }
  return svg.replace(/<svg([^>]*)>/i, `<svg$1>\n  ${hint}`);
}

function injectAdvanceWordmarkOverlay(
  svg: string,
  logoText: string,
  suggestion: TypographySuggestion,
  fill: string,
): string {
  // Non-destructive: keep path wordmark, add editable text suggestion for production typesetting.
  if (!logoText.trim() || /data-wordmark-suggestion="true"/.test(svg)) return svg;
  const overlay = `
  <g data-edit-group="wordmark-suggestion" data-wordmark-suggestion="true" opacity="0">
    <text data-logo-text="true" x="320" y="270" font-size="42" font-family="${suggestion.matched}, ${suggestion.substitutes[0] || "Georgia"}, serif" font-weight="700" fill="${fill}">${escapeXml(logoText)}</text>
  </g>`;
  return svg.replace(/<\/svg>\s*$/i, `${overlay}\n</svg>`);
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function modeDifferentiation(mode: EvolutionMode, ops: string[]): string {
  switch (mode) {
    case "mirror":
      return "Recognisably the same artwork — production cleanup only, no redesign.";
    case "refine":
      return `Same logo, professionally cleaned: ${ops.slice(0, 4).join("; ") || "optical balance"}.`;
    case "advance":
      return `Contemporary identity descended from the original: ${ops.slice(0, 4).join("; ") || "premium geometry"}.`;
    case "explore":
      return `Broader alternative from the same path DNA — not a faithful claim. ${ops.slice(0, 3).join("; ")}`;
  }
}

/**
 * Apply mode-specific design transforms to a faithful reconstructed SVG.
 * The input is treated as immutable source DNA — transforms clone via string rewrite.
 */
export function applyDesignTransforms(
  faithfulSvg: string,
  mode: EvolutionMode,
  options: TransformOptions = {},
): { svg: string; report: TransformReport } {
  const modernisation = options.modernisation ?? 40;
  const simplification = options.simplification ?? 25;
  const creativity = options.creativity ?? 40;
  const operations: string[] = [];
  const typography = suggestTypography({
    fontGuess: options.fontGuess,
    fontCategoryMatch: options.fontCategoryMatch,
    typographyCategory: options.typographyCategory,
    preserveTypography: options.preserveTypography,
    mode,
  });

  let svg = faithfulSvg;
  const paths = extractPaths(svg);
  clusterPaths(paths);
  classifySegments(paths);

  const preservedDetails = paths.filter((p) => p.segment === "detail").length;
  const markPathCount = paths.filter((p) => p.segment === "mark").length;
  const wordmarkPathCount = paths.filter((p) => p.segment === "wordmark").length;
  const secondaryPathCount = paths.filter((p) => p.segment === "secondary").length;

  const markBox = bboxOf(
    paths
      .filter((p) => p.segment === "mark" || p.segment === "detail")
      .flatMap((p) => [
        { x: p.bbox.x, y: p.bbox.y },
        { x: p.bbox.x + p.bbox.width, y: p.bbox.y + p.bbox.height },
      ]),
  );
  const wordBox = bboxOf(
    paths
      .filter((p) => p.segment === "wordmark")
      .flatMap((p) => [
        { x: p.bbox.x, y: p.bbox.y },
        { x: p.bbox.x + p.bbox.width, y: p.bbox.y + p.bbox.height },
      ]),
  );

  if (mode === "mirror") {
    operations.push("coordinate quantisation", "segment tagging", "preserve enclosed details");
    const { svg: next } = rewriteSvgPaths(svg, paths, {
      shifts: new Map(),
      decimals: 2,
      simplifyEpsilon: 0,
      axisSnap: 0,
      dropNoise: false,
      noiseAreaRatio: 0,
      tagSegments: true,
    });
    svg = wrapSegmentGroups(next, paths);
    svg = injectTypographyHint(svg, typography, options.logoText || "", mode);
    svg = svg.replace(/(\d+\.\d{3,})/g, (m) => Number(m).toFixed(2));
  } else if (mode === "refine") {
    const kernAmount = Math.min(1, 0.35 + simplification / 200);
    const symStrength = Math.min(1, 0.4 + simplification / 180);
    const kernShifts = opticalKernWordmark(paths, kernAmount);
    const symShifts = symmetryAlignMark(paths, symStrength);
    const shifts = mergeShifts(kernShifts, symShifts);
    operations.push(
      "optical kerning",
      "baseline correction",
      "symmetry / geometric alignment",
      "stroke & curve cleanup",
      "preserve small enclosed details",
      "separate mark / wordmark groups",
    );
    if (kernShifts.size) operations.push("wordmark cluster spacing");
    const { svg: next } = rewriteSvgPaths(svg, paths, {
      shifts,
      decimals: 2,
      simplifyEpsilon: 0.35 + simplification / 120,
      axisSnap: 0.6,
      dropNoise: false,
      noiseAreaRatio: 0,
      tagSegments: true,
    });
    svg = wrapSegmentGroups(next, paths);
    svg = injectTypographyHint(svg, typography, options.logoText || "", mode);
    // Unify residual transform noise on outer group only
    svg = svg.replace(/(\d+\.\d{3,})/g, (m) => Number(m).toFixed(2));
    if (!/data-evolved=/.test(svg)) {
      svg = svg.replace(
        /(<g\b[^>]*transform="translate\([^"]*\)[^"]*")/,
        `$1 data-evolved="refine"`,
      );
    }
  } else if (mode === "advance") {
    // Start from refine-strength optical cleanup, then evolve geometry.
    const kernAmount = Math.min(1, 0.55 + modernisation / 160);
    const symStrength = Math.min(1, 0.65 + modernisation / 140);
    const kernShifts = opticalKernWordmark(paths, kernAmount);
    const symShifts = symmetryAlignMark(paths, symStrength);

    // Lockup rebalance: pull wordmark toward mark, grow mark presence (premium presence).
    const lockup = new Map<number, { dx: number; dy: number }>();
    if (markBox.width > 0 && wordBox.width > 0) {
      const pull = Math.min(28, 10 + modernisation / 8);
      for (const p of paths) {
        if (p.segment === "wordmark") {
          lockup.set(p.index, { dx: -pull, dy: (markBox.cy - p.bbox.cy) * 0.4 });
        } else if (p.segment === "mark" || p.segment === "detail") {
          lockup.set(p.index, { dx: pull * 0.15, dy: 0 });
        }
      }
      operations.push("lockup rebalance (mark ↔ wordmark)");
    }
    const shifts = mergeShifts(kernShifts, symShifts, lockup);

    const markScale =
      markBox.width > 0
        ? {
            cx: markBox.cx,
            cy: markBox.cy,
            scale: 1 + Math.min(0.18, 0.06 + modernisation / 550 + simplification / 1000),
          }
        : undefined;
    const wordScale =
      wordBox.width > 0
        ? {
            cx: wordBox.cx,
            cy: wordBox.cy,
            // Tighter tracking = contemporary wordmark presence
            scale: 1 - Math.min(0.1, 0.035 + modernisation / 1200),
          }
        : undefined;

    operations.push(
      "controlled symbol simplification",
      "premium geometry variation from original mark",
      "optical kerning & baseline",
      "preserve enclosed details",
      "separate mark / wordmark editing",
      "typography substitute suggestion",
    );

    const { svg: next, dropped } = rewriteSvgPaths(svg, paths, {
      shifts,
      decimals: 1,
      simplifyEpsilon: 0.9 + simplification / 70 + modernisation / 100,
      axisSnap: 1.1,
      dropNoise: simplification >= 40,
      noiseAreaRatio: 0.00035,
      markScale,
      wordScale,
      tagSegments: true,
    });
    if (dropped) operations.push(`removed ${dropped} micro-noise paths`);
    svg = wrapSegmentGroups(next, paths);
    svg = injectTypographyHint(svg, typography, options.logoText || "", mode);
    const fill =
      options.palette?.[0] ||
      paths.find((p) => p.segment === "wordmark")?.fill ||
      "#111111";
    if (!options.preserveTypography || modernisation >= 60) {
      svg = injectAdvanceWordmarkOverlay(svg, options.logoText || "", typography, fill);
      operations.push(`wordmark typesetting hint → ${typography.matched}`);
    }
    svg = svg.replace(
      /(<g\b[^>]*transform="translate\([^"]*\)[^"]*")/,
      `$1 data-evolved="advance"`,
    );
  } else {
    // Explore — broader reinterpretation of the same DNA (never claims fidelity).
    const exploreStrength = Math.max(0.55, creativity / 100);
    const kernShifts = opticalKernWordmark(paths, 0.85);
    const symShifts = symmetryAlignMark(paths, 0.35);
    const creative = new Map<number, { dx: number; dy: number }>();
    if (markBox.width > 0 && wordBox.width > 0) {
      // Stacked / centred lockup in source coordinates (never assume a 512 artboard).
      const contentCx = (markBox.cx + wordBox.cx) / 2;
      const gap = Math.max(18, markBox.height * 0.12);
      const markDx = (contentCx - markBox.cx) * (0.85 + exploreStrength * 0.1);
      const wordDx = (contentCx - wordBox.cx) * (0.85 + exploreStrength * 0.1);
      const markTargetBottom = markBox.cy - markBox.height * 0.15;
      const markDy = markTargetBottom - markBox.cy;
      const wordTargetTop = markBox.y + markBox.height + gap + markDy;
      const wordDy = wordTargetTop - wordBox.y;
      for (const p of paths) {
        if (p.segment === "wordmark") {
          creative.set(p.index, { dx: wordDx, dy: wordDy });
        } else if (p.segment === "mark" || p.segment === "detail") {
          creative.set(p.index, { dx: markDx, dy: markDy });
        }
      }
      operations.push("explore layout reinterpretation (stacked / centred bias)");
    }
    const shifts = mergeShifts(kernShifts, symShifts, creative);
    operations.push(
      "broader path reinterpretation",
      "typography mood echo",
      "not a faithful claim",
    );
    const { svg: next } = rewriteSvgPaths(svg, paths, {
      shifts,
      decimals: 1,
      simplifyEpsilon: 1.4 + exploreStrength * 1.2,
      axisSnap: 0.9,
      dropNoise: true,
      noiseAreaRatio: 0.0006,
      markScale:
        markBox.width > 0
          ? {
              cx: markBox.cx,
              cy: markBox.cy,
              scale: 1 + Math.min(0.12, 0.04 + exploreStrength * 0.08),
            }
          : undefined,
      wordScale:
        wordBox.width > 0
          ? {
              cx: wordBox.cx,
              cy: wordBox.cy,
              scale: 1 - Math.min(0.05, 0.02 + exploreStrength * 0.03),
            }
          : undefined,
      tagSegments: true,
    });
    svg = wrapSegmentGroups(next, paths);
    svg = injectTypographyHint(svg, typography, options.logoText || "", mode);
    svg = svg.replace(
      /(<g\b[^>]*transform="translate\([^"]*\)[^"]*")/,
      `$1 data-evolved="explore"`,
    );
  }

  // Preserve reconstruction marker
  if (!/data-reconstruction=/.test(svg)) {
    svg = svg.replace(/<svg\b/i, `<svg data-reconstruction="true"`);
  }

  const report: TransformReport = {
    mode,
    operations,
    preservedDetails,
    markPathCount,
    wordmarkPathCount,
    secondaryPathCount,
    typography,
    differentiation: modeDifferentiation(mode, operations),
  };
  return { svg, report };
}
