export const LOGO_STYLES = [
  "minimal",
  "luxury",
  "premium",
  "corporate",
  "modern",
  "bold",
  "elegant",
] as const;

export const PERSONALITIES = [
  "trustworthy",
  "innovative",
  "playful",
  "serious",
  "warm",
  "bold",
  "refined",
] as const;

export const LAYOUTS = ["icon-left", "icon-top", "wordmark", "badge", "monogram"] as const;

export const TYPOGRAPHY_DIRECTIONS = [
  "geometric-sans",
  "humanist-sans",
  "modern-serif",
  "display",
  "mono-tech",
] as const;

export type LogoStyle = (typeof LOGO_STYLES)[number];
export type Personality = (typeof PERSONALITIES)[number];
export type LayoutDirection = (typeof LAYOUTS)[number];
export type TypographyDirection = (typeof TYPOGRAPHY_DIRECTIONS)[number];

export type LogoReferenceBrief = {
  id: string;
  filename: string;
  mimeType: string;
  note: string | null;
  kind: string;
  extractedText: string | null;
  supportedInProvider: boolean;
  unsupportedReason?: string;
  analysisStatus?: string;
  analysisMode?: string | null;
  analysis?: Record<string, unknown> | null;
  analysisConfirmed?: Record<string, unknown> | null;
  analysisProvider?: string | null;
  analysisModel?: string | null;
  analysisError?: string | null;
  pdfPagesProcessed?: number[];
  visuallyAnalysed?: boolean;
};

export type GenerationMode = "mirror" | "refine" | "advance" | "explore";

export type GenerationControls = {
  mode: GenerationMode;
  similarity: number;
  creativity: number;
  preserveSymbol: boolean;
  preserveTypography: boolean;
  preserveColours: boolean;
  preserveLayout: boolean;
  modernisation: number;
  simplification: number;
  premiumDirection: boolean;
  styleDirection: "minimal" | "clinical" | "bold" | "elegant" | "premium" | "luxury";
  exactLogoText: string;
  mustNotChange: string;
  improve: string;
};

export type LogoBrief = {
  businessName: string;
  tagline?: string;
  industry: string;
  personality: Personality;
  style: LogoStyle;
  preferredColors: string[];
  avoidColors: string[];
  iconIdeas?: string;
  typographyDirection: TypographyDirection;
  layoutDirection: LayoutDirection;
  /** Active reference materials selected for this generation. */
  references?: LogoReferenceBrief[];
  /** Reference-led evolution controls for this generation. */
  generationControls?: GenerationControls;
};

export type ConceptPalette = {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  foreground: string;
};

export type GeneratedConcept = {
  title: string;
  prompt: string;
  iconConcept: string;
  layout: LayoutDirection;
  palette: ConceptPalette;
  typography: { display: string; body: string };
  svgMarkup: string;
  provider: string;
  providerMetadata: Record<string, unknown>;
  pngBuffer?: Buffer;
  transparentPngBuffer?: Buffer;
};
