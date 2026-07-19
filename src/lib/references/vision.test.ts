import { afterEach, describe, expect, it, vi } from "vitest";
import { VISUAL_ANALYSIS_UNAVAILABLE_MESSAGE } from "./analysis-types";
import { analyseImageWithVision, getVisionConfig } from "./vision";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("vision provider", () => {
  it("reports visual analysis unavailable without credentials", () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    vi.stubEnv("AI_GATEWAY_API_KEY", "");
    const config = getVisionConfig();
    expect(config.available).toBe(false);
    expect(config.reason).toBe(VISUAL_ANALYSIS_UNAVAILABLE_MESSAGE);
  });

  it("uses openai gpt-4o-mini by default when key present", () => {
    vi.stubEnv("OPENAI_API_KEY", "sk-test");
    vi.stubEnv("AI_GATEWAY_API_KEY", "");
    vi.stubEnv("OPENAI_VISION_MODEL", "");
    const config = getVisionConfig();
    expect(config.available).toBe(true);
    expect(config.provider).toBe("openai");
    expect(config.model).toBe("gpt-4o-mini");
  });

  it("throws the explicit unavailable message when analysing without keys", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    vi.stubEnv("AI_GATEWAY_API_KEY", "");
    await expect(
      analyseImageWithVision({
        mimeType: "image/png",
        base64: "abc",
        filename: "mark.png",
        kind: "logo",
      }),
    ).rejects.toThrow(VISUAL_ANALYSIS_UNAVAILABLE_MESSAGE);
  });
});
