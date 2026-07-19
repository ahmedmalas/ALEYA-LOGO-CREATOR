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

/** Exact vision model used when OpenAI credentials are present. */
export const DEFAULT_VISION_MODEL = process.env.OPENAI_VISION_MODEL || "gpt-4o-mini";

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
    provider: process.env.AI_GATEWAY_API_KEY && !process.env.OPENAI_API_KEY ? "vercel-ai-gateway" : "openai",
    model: DEFAULT_VISION_MODEL,
  };
}

function openaiBaseUrl() {
  return (
    process.env.OPENAI_BASE_URL ||
    (process.env.AI_GATEWAY_API_KEY && !process.env.OPENAI_API_KEY
      ? "https://ai-gateway.vercel.sh/v1"
      : "https://api.openai.com/v1")
  );
}

function apiKey() {
  return process.env.OPENAI_API_KEY || process.env.AI_GATEWAY_API_KEY || "";
}

const SYSTEM_PROMPT = `You analyse brand reference images for a logo designer.
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
  "pdfPagesProcessed": number[]
}
Do not invent trademarks to copy. Describe what is visible. colourPalette should use hex when possible.`;

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

  const response = await fetch(`${openaiBaseUrl()}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: config.model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
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
      ],
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Vision analysis failed (${response.status}): ${detail.slice(0, 240)}`);
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
    throw new Error("Vision provider returned non-JSON analysis.");
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
  // pdf-parse does not always expose page breaks; treat as page 1 unless form-feed markers exist.
  const pages = text.split("\f").length;
  return Array.from({ length: Math.max(1, Math.min(pages, 5)) }, (_, i) => i + 1);
}
