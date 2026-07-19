import { describe, expect, it } from "vitest";
import { summarizeReferencesForPrompt, withReferences } from "./brief";
import type { LogoBrief } from "@/types/logo";

const baseBrief: LogoBrief = {
  businessName: "Northwind",
  industry: "Design",
  personality: "refined",
  style: "modern",
  preferredColors: ["#1F4D45"],
  avoidColors: [],
  typographyDirection: "geometric-sans",
  layoutDirection: "icon-left",
};

describe("reference brief helpers", () => {
  it("attaches references to the generation brief", () => {
    const brief = withReferences(baseBrief, [
      {
        id: "11111111-1111-1111-1111-111111111111",
        filename: "logo.png",
        mimeType: "image/png",
        note: "Current mark",
        kind: "logo",
        extractedText: null,
        supportedInProvider: true,
      },
    ]);
    expect(brief.references).toHaveLength(1);
    expect(summarizeReferencesForPrompt(brief.references)).toContain("logo.png");
    expect(summarizeReferencesForPrompt(brief.references)).toContain("Current mark");
  });

  it("returns empty summary when no references", () => {
    expect(summarizeReferencesForPrompt(undefined)).toBe("");
  });
});
