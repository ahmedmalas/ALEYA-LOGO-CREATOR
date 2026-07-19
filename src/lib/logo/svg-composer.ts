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

function pickColor(preferred: string[], fallback: string, index: number): string {
  if (preferred.length === 0) return fallback;
  return sanitizeHexColor(preferred[index % preferred.length]!, fallback);
}

function buildPalette(brief: LogoBrief, variant: number): ConceptPalette {
  const defaults = ["#0F3D3E", "#C4A574", "#1A1A1A", "#F4F7F5", "#E8EEE9"];
  const primary = pickColor(brief.preferredColors, defaults[variant % defaults.length]!, 0);
  const secondary = pickColor(
    brief.preferredColors,
    defaults[(variant + 1) % defaults.length]!,
    1,
  );
  const accent = pickColor(brief.preferredColors, defaults[(variant + 2) % defaults.length]!, 2);
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

function iconPath(brief: LogoBrief, variant: number): string {
  const ideas = (brief.iconIdeas ?? brief.industry).toLowerCase();
  const seed = hashSeed(`${brief.businessName}:${ideas}:${variant}`);
  const shapes = [
    "M60 20 L100 40 L100 90 L60 110 L20 90 L20 40 Z",
    "M60 18 C90 18 108 40 108 68 C108 96 60 118 60 118 C60 118 12 96 12 68 C12 40 30 18 60 18 Z",
    "M20 70 Q60 10 100 70 Q60 120 20 70 Z",
    "M30 30 H90 V90 H30 Z",
    "M60 22 L92 95 H28 Z",
  ];
  return shapes[seed % shapes.length]!;
}

function renderMark(palette: ConceptPalette, path: string, mono: string): string {
  return `
    <g transform="translate(40,40)">
      <path d="${path}" fill="${escapeXml(palette.primary)}" opacity="0.92"/>
      <circle cx="60" cy="65" r="28" fill="${escapeXml(palette.secondary)}" opacity="0.95"/>
      <text x="60" y="74" text-anchor="middle" font-size="22" font-family="Georgia, serif" font-weight="700" fill="${escapeXml(palette.background)}">${escapeXml(mono)}</text>
    </g>`;
}

function renderLayout(
  brief: LogoBrief,
  palette: ConceptPalette,
  layout: LayoutDirection,
  mark: string,
): string {
  const name = brief.businessName;
  const tag = brief.tagline ?? "";
  const fonts = STYLE_FONTS[brief.style];

  if (layout === "icon-top") {
    return `${mark}
      <text x="256" y="220" text-anchor="middle" font-size="42" font-family="${fonts.display}, Georgia, serif" font-weight="700" fill="${escapeXml(palette.foreground)}">${escapeXml(name)}</text>
      ${tag ? `<text x="256" y="255" text-anchor="middle" font-size="16" font-family="${fonts.body}, sans-serif" fill="${escapeXml(palette.accent)}">${escapeXml(tag)}</text>` : ""}`;
  }

  if (layout === "wordmark") {
    return `
      <text x="256" y="200" text-anchor="middle" font-size="48" font-family="${fonts.display}, Georgia, serif" font-weight="700" fill="${escapeXml(palette.primary)}">${escapeXml(name)}</text>
      ${tag ? `<text x="256" y="235" text-anchor="middle" font-size="16" letter-spacing="4" font-family="${fonts.body}, sans-serif" fill="${escapeXml(palette.accent)}">${escapeXml(tag.toUpperCase())}</text>` : ""}`;
  }

  if (layout === "badge") {
    return `
      <rect x="96" y="90" width="320" height="220" rx="24" fill="${escapeXml(palette.primary)}"/>
      <g transform="translate(116,-10) scale(0.7)">${mark}</g>
      <text x="256" y="250" text-anchor="middle" font-size="28" font-family="${fonts.display}, Georgia, serif" font-weight="700" fill="${escapeXml(palette.background)}">${escapeXml(name)}</text>
      ${tag ? `<text x="256" y="278" text-anchor="middle" font-size="13" font-family="${fonts.body}, sans-serif" fill="${escapeXml(palette.secondary)}">${escapeXml(tag)}</text>` : ""}`;
  }

  if (layout === "monogram") {
    return `
      <circle cx="256" cy="180" r="110" fill="${escapeXml(palette.primary)}"/>
      <text x="256" y="198" text-anchor="middle" font-size="72" font-family="${fonts.display}, Georgia, serif" font-weight="700" fill="${escapeXml(palette.background)}">${escapeXml(monogram(name))}</text>
      <text x="256" y="330" text-anchor="middle" font-size="22" font-family="${fonts.body}, sans-serif" fill="${escapeXml(palette.foreground)}">${escapeXml(name)}</text>`;
  }

  // icon-left
  return `
    <g transform="translate(20,70) scale(0.85)">${mark}</g>
    <text x="220" y="175" font-size="40" font-family="${fonts.display}, Georgia, serif" font-weight="700" fill="${escapeXml(palette.foreground)}">${escapeXml(name)}</text>
    ${tag ? `<text x="220" y="210" font-size="16" font-family="${fonts.body}, sans-serif" fill="${escapeXml(palette.accent)}">${escapeXml(tag)}</text>` : ""}`;
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

const LAYOUT_CYCLE: LayoutDirection[] = [
  "icon-left",
  "icon-top",
  "wordmark",
  "badge",
  "monogram",
];

export function composeSvgConcepts(brief: LogoBrief, count: number, seed = "seed"): GeneratedConcept[] {
  const concepts: GeneratedConcept[] = [];
  for (let i = 0; i < count; i += 1) {
    const palette = buildPalette(brief, i);
    const layout =
      i === 0 ? brief.layoutDirection : LAYOUT_CYCLE[(LAYOUT_CYCLE.indexOf(brief.layoutDirection) + i) % LAYOUT_CYCLE.length]!;
    const path = iconPath(brief, i);
    const mono = monogram(brief.businessName);
    const mark = renderMark(palette, path, mono);
    const body = renderLayout(brief, palette, layout, mark);
    const svgMarkup = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512" role="img" aria-label="${escapeXml(brief.businessName)} logo">
  <rect width="512" height="512" fill="transparent"/>
  ${body}
</svg>`;

    const fonts = STYLE_FONTS[brief.style];
    const iconConcept =
      brief.iconIdeas?.trim() ||
      `${brief.industry} mark with ${brief.personality} geometry (variant ${i + 1})`;
    const prompt = [
      `Logo for ${brief.businessName}`,
      brief.tagline ? `tagline "${brief.tagline}"` : null,
      `industry ${brief.industry}`,
      `style ${brief.style}`,
      `personality ${brief.personality}`,
      `layout ${layout}`,
      `typography ${brief.typographyDirection}`,
      `palette ${palette.primary}, ${palette.secondary}, ${palette.accent}`,
      brief.avoidColors.length ? `avoid ${brief.avoidColors.join(", ")}` : null,
      `icon: ${iconConcept}`,
      `seed ${seed}:${i}`,
    ]
      .filter(Boolean)
      .join("; ");

    concepts.push({
      title: `${brief.style} ${layout.replace("-", " ")} ${i + 1}`,
      prompt,
      iconConcept,
      layout,
      palette,
      typography: fonts,
      svgMarkup,
      provider: "svg-composer",
      providerMetadata: { seed, variant: i, algorithm: "aleya-svg-v1" },
    });
  }
  return concepts;
}

export function composeRefinedConcept(
  brief: LogoBrief,
  base: GeneratedConcept,
  instruction: string,
): GeneratedConcept {
  const next = composeSvgConcepts(
    {
      ...brief,
      iconIdeas: `${brief.iconIdeas ?? base.iconConcept}; refine: ${instruction}`,
      layoutDirection: base.layout,
    },
    1,
    `${base.title}:${instruction}`,
  )[0]!;

  return {
    ...next,
    title: `${base.title} (refined)`,
    prompt: `${base.prompt} | refine: ${instruction}`,
    providerMetadata: {
      ...next.providerMetadata,
      parentTitle: base.title,
      refinement: instruction,
    },
  };
}

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
