import { composeSvgConcepts } from "@/lib/logo/svg-composer";
import type { GeneratedConcept } from "@/types/logo";
import { ProviderError, type GenerateRequest, type ImageProvider, type RefineRequest } from "./types";

const DEFAULT_TIMEOUT_MS = 55_000;

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new ProviderError("timeout", "Image generation timed out. Please try again.", true);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export class OpenAIImageProvider implements ImageProvider {
  readonly name = "openai";
  private apiKey: string;
  private baseUrl: string;
  private model: string;

  constructor(options?: { apiKey?: string; baseUrl?: string; model?: string }) {
    const key = options?.apiKey ?? process.env.OPENAI_API_KEY ?? process.env.AI_GATEWAY_API_KEY;
    if (!key) {
      throw new ProviderError(
        "missing_credentials",
        "Missing OPENAI_API_KEY (or AI_GATEWAY_API_KEY). Raster AI generation is unavailable until this credential is configured.",
      );
    }
    this.apiKey = key;
    this.baseUrl =
      options?.baseUrl ??
      process.env.OPENAI_BASE_URL ??
      (process.env.AI_GATEWAY_API_KEY ? "https://ai-gateway.vercel.sh/v1" : "https://api.openai.com/v1");
    this.model = options?.model ?? process.env.OPENAI_IMAGE_MODEL ?? "dall-e-3";
  }

  async generateConcepts(request: GenerateRequest): Promise<GeneratedConcept[]> {
    const count = Math.min(Math.max(request.count, 1), 4);
    // Vector scaffolds remain the editable source; AI produces concept art references when available.
    const scaffolds = composeSvgConcepts(request.brief, count, request.seed ?? crypto.randomUUID());
    const results: GeneratedConcept[] = [];

    for (const scaffold of scaffolds) {
      try {
        const image = await this.generateImage(scaffold.prompt);
        results.push({
          ...scaffold,
          provider: this.name,
          providerMetadata: {
            ...scaffold.providerMetadata,
            model: this.model,
            imageBase64: image.b64,
            revisedPrompt: image.revisedPrompt,
          },
          pngBuffer: Buffer.from(image.b64, "base64"),
        });
      } catch (error) {
        if (error instanceof ProviderError && error.code === "missing_credentials") throw error;
        // Surface provider failure rather than silently faking AI output.
        throw error;
      }
    }

    return results;
  }

  async refineConcept(request: RefineRequest): Promise<GeneratedConcept> {
    const [scaffold] = composeSvgConcepts(
      {
        ...request.brief,
        iconIdeas: `${request.concept.iconConcept}; ${request.instruction}`,
      },
      1,
      `refine:${request.instruction}`,
    );
    if (!scaffold) {
      throw new ProviderError("invalid_request", "Unable to refine concept");
    }
    const prompt = `${request.concept.prompt}. Refinement: ${request.instruction}`;
    const image = await this.generateImage(prompt);
    return {
      ...scaffold,
      title: `${request.concept.title} (refined)`,
      prompt,
      provider: this.name,
      providerMetadata: {
        model: this.model,
        imageBase64: image.b64,
        revisedPrompt: image.revisedPrompt,
        refinement: request.instruction,
      },
      pngBuffer: Buffer.from(image.b64, "base64"),
    };
  }

  private async generateImage(prompt: string): Promise<{ b64: string; revisedPrompt?: string }> {
    const response = await fetchWithTimeout(`${this.baseUrl}/images/generations`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        prompt: `Professional logo design, flat vector-friendly composition, transparent-feeling background, no mockups, no watermarks. ${prompt}`,
        n: 1,
        size: "1024x1024",
        response_format: "b64_json",
      }),
    });

    if (response.status === 429) {
      throw new ProviderError("rate_limited", "Image provider rate limit reached. Please wait and retry.", true);
    }

    if (!response.ok) {
      const body = await response.text();
      throw new ProviderError(
        "provider_error",
        `Image provider failed (${response.status}): ${body.slice(0, 280)}`,
        response.status >= 500,
      );
    }

    const json = (await response.json()) as {
      data?: Array<{ b64_json?: string; revised_prompt?: string }>;
    };
    const b64 = json.data?.[0]?.b64_json;
    if (!b64) {
      throw new ProviderError("provider_error", "Image provider returned no image data");
    }
    return { b64, revisedPrompt: json.data?.[0]?.revised_prompt };
  }
}
