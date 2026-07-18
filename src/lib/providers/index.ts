import { OpenAIImageProvider } from "./openai-provider";
import { SvgCompositionProvider } from "./svg-provider";
import { ProviderError, type ImageProvider } from "./types";

export function getImageProvider(): ImageProvider {
  const forced = process.env.IMAGE_PROVIDER?.toLowerCase();
  if (forced === "svg") return new SvgCompositionProvider();

  const hasKey = Boolean(process.env.OPENAI_API_KEY || process.env.AI_GATEWAY_API_KEY);
  if (forced === "openai" || (!forced && hasKey)) {
    try {
      return new OpenAIImageProvider();
    } catch (error) {
      if (error instanceof ProviderError && error.code === "missing_credentials") {
        if (forced === "openai") throw error;
        return new SvgCompositionProvider();
      }
      throw error;
    }
  }

  return new SvgCompositionProvider();
}

export function getProviderStatus() {
  const hasOpenAI = Boolean(process.env.OPENAI_API_KEY || process.env.AI_GATEWAY_API_KEY);
  const active = getImageProvider().name;
  return {
    activeProvider: active,
    openaiConfigured: hasOpenAI,
    requiredCredentialForAiRaster: "OPENAI_API_KEY (preferred) or AI_GATEWAY_API_KEY",
    note:
      active === "svg"
        ? "SVG composition provider is active. Set OPENAI_API_KEY to enable OpenAI raster concept generation."
        : "OpenAI image provider is active for raster concepts; SVG variants are still produced for editable exports.",
  };
}

export * from "./types";
