import {
  emptyAnalysis,
  referenceAnalysisSchema,
  VISUAL_ANALYSIS_UNAVAILABLE_MESSAGE,
  type ReferenceAnalysis,
} from "@/lib/references/analysis-types";

export type VisionConfig = {
  available: boolean;
  provider: string | null;
  model: string | null;
  reason?: string;
};

function usingAiGateway() {
  return Boolean(process.env.AI_GATEWAY_API_KEY && !process.env.OPENAI_API_KEY);
}

/** Exact vision model used when credentials are present. */
export function getDefaultVisionModel() {
  if (process.env.OPENAI_VISION_MODEL) return process.env.OPENAI_VISION_MODEL;
  // AI Gateway requires provider/model slugs.
  return usingAiGateway() ? "openai/gpt-4o-mini" : "gpt-4o-mini";
}

export function getVisionConfig(): VisionConfig {
  const key = process.env.OPENAI_API_KEY || process.env.AI_GATEWAY_API_KEY;
  if (!key) {
    return {
      available: false,
      provider: null,
      model: null,
      reason: VISUAL_ANALYSIS_UNAVAILABLE_MESSAGE,
    };
  }
  return {
    available: true,
    provider: usingAiGateway() ? "vercel-ai-gateway" : "openai",
    model: getDefaultVisionModel(),
  };
}

function openaiBaseUrl() {
  return (
    process.env.OPENAI_BASE_URL ||
    (usingAiGateway() ? "https://ai-gateway.vercel.sh/v1" : "https://api.openai.com/v1")
  );
}

function apiKey() {
  return process.env.OPENAI_API_KEY || process.env.AI_GATEWAY_API_KEY || "";
}

const SYSTEM_PROMPT = `You analyse brand reference logo images for a professional logo evolution tool.
Return ONLY valid JSON matching this shape:
{
  "existingLogoText": string,
  "symbolsAndShapes": string[],
  "layout": string,
  "colourPalette": string[],
  "typographyCharacteristics": string,
  "visualStyle": string,
  "packagingContext": string,
  "elementsToPreserve": string[],
  "elementsToAvoid": string[],
  "summary": string,
  "pdfPagesProcessed": number[],
  "logoMark": string,
  "symbolGeometry": string,
  "composition": string,
  "layoutStructure": "horizontal" | "stacked" | "emblem" | "wordmark" | "monogram" | "unknown",
  "proportions": string,
  "alignment": string,
  "spacing": string,
  "typographyCategory": string,
  "letterCasing": string,
  "letterSpacing": string,
  "strokeWeight": string,
  "primaryColours": string[],
  "secondaryColours": string[],
  "gradients": string,
  "outlines": string,
  "shadows": string,
  "backgrounds": string,
  "borders": string,
  "visualEraStyle": string,
  "brandMood": string,
  "distinctiveElements": string[],
  "weakAreasToImprove": string[],
  "similarityConstraints": string,
  "fontGuess": string,
  "fontCategoryMatch": string
}
Rules:
- existingLogoText must be the exact visible logo wording (correct spelling/casing).
- Describe symbol geometry precisely (circle, shield, letterform, etc.).
- colourPalette/primaryColours/secondaryColours should use hex when possible.
- distinctiveElements = traits that must be retained for recognisability.
- weakAreasToImprove = production flaws (kerning, alignment, inconsistent strokes).
- similarityConstraints = what a faithful recreation must keep.
- fontGuess = closest known font family if identifiable; fontCategoryMatch = serif/sans/display/script/mono.
- Do not invent trademarks that are not visible.`;

function sanitizeProviderError(detail: string) {
  return detail
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, "Bearer [redacted]")
    .replace(/vck_[A-Za-z0-9_-]+/g, "[redacted]")
    .replace(/sk-[A-Za-z0-9_-]+/g, "[redacted]")
    .slice(0, 240);
}

async function callVision(body: Record<string, unknown>) {
  return fetch(`${openaiBaseUrl()}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

export async function analyseImageWithVision(input: {
  mimeType: string;
  base64: string;
  filename: string;
  kind: string;
  note?: string | null;
  extractedText?: string | null;
  pdfPagesProcessed?: number[];
}): Promise<{ analysis: ReferenceAnalysis; provider: string; model: string }> {
  const config = getVisionConfig();
  if (!config.available || !config.provider || !config.model) {
    throw new Error(VISUAL_ANALYSIS_UNAVAILABLE_MESSAGE);
  }

  const userText = [
    `Filename: ${input.filename}`,
    `Reference kind: ${input.kind}`,
    input.note ? `User note: ${input.note}` : null,
    input.extractedText ? `Extracted text hint: ${input.extractedText.slice(0, 1200)}` : null,
    input.pdfPagesProcessed?.length
      ? `PDF pages represented in this preview: ${input.pdfPagesProcessed.join(", ")}`
      : null,
    "Describe the visual content for logo generation guidance.",
  ]
    .filter(Boolean)
    .join("\n");

  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content: [
        { type: "text", text: userText },
        {
          type: "image_url",
          image_url: {
            url: `data:${input.mimeType};base64,${input.base64}`,
            detail: "high",
          },
        },
      ],
    },
  ];

  const baseBody = {
    model: config.model,
    temperature: 0.2,
    messages,
  };

  let response = await callVision({
    ...baseBody,
    response_format: { type: "json_object" },
  });

  // Some gateway routes reject response_format; retry once without it.
  if (!response.ok && response.status === 400) {
    const detail = await response.text().catch(() => "");
    if (/response_format/i.test(detail)) {
      response = await callVision(baseBody);
    } else {
      throw new Error(`Vision analysis failed (400): ${sanitizeProviderError(detail)}`);
    }
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Vision analysis failed (${response.status}): ${sanitizeProviderError(detail)}`);
  }

  const json = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = json.choices?.[0]?.message?.content;
  if (!content) throw new Error("Vision provider returned empty analysis.");

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    const fenced = content.match(/\{[\s\S]*\}/);
    if (!fenced) throw new Error("Vision provider returned non-JSON analysis.");
    parsed = JSON.parse(fenced[0]);
  }

  const analysis = referenceAnalysisSchema.parse({
    ...emptyAnalysis(),
    ...(parsed as object),
    pdfPagesProcessed: input.pdfPagesProcessed ?? [],
  });

  return {
    analysis,
    provider: config.provider,
    model: config.model,
  };
}

/** Heuristic PDF page list when only text extraction is available. */
export function inferPdfPagesFromText(text: string | null | undefined): number[] {
  if (!text?.trim()) return [1];
  // Prefer form-feed markers when present; otherwise treat as a single analysed page.
  const pages = text.split("\f").length;
  return Array.from({ length: Math.max(1, Math.min(pages, 5)) }, (_, i) => i + 1);
}
