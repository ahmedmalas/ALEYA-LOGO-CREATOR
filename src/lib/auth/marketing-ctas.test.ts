import { describe, expect, it } from "vitest";
import {
  FORBIDDEN_SIGNED_IN_CTA_LABELS,
  finalBandCtas,
  footerAuthCtas,
  galleryBandCtas,
  planCtaForAuth,
  primaryMarketingCtas,
} from "./marketing-ctas";
import { PLANS } from "@/lib/pricing";

function labels(ctas: { label: string }[]) {
  return ctas.map((c) => c.label);
}

describe("marketing CTAs", () => {
  it("signed-out homepage CTAs are Get Started + Sign In", () => {
    expect(labels(primaryMarketingCtas(false))).toEqual(["Get Started", "Sign In"]);
  });

  it("signed-in homepage CTAs never include Sign In or Get Started", () => {
    const ctas = primaryMarketingCtas(true);
    expect(labels(ctas)).toEqual([
      "Go to Dashboard",
      "Create New Logo",
      "View My Projects",
    ]);
    for (const forbidden of FORBIDDEN_SIGNED_IN_CTA_LABELS) {
      expect(labels(ctas)).not.toContain(forbidden);
    }
  });

  it("keeps gallery/pricing/footer auth-aware without mixed controls", () => {
    expect(labels(galleryBandCtas(false))).toContain("Get Started");
    expect(labels(galleryBandCtas(true))).not.toContain("Get Started");
    expect(labels(galleryBandCtas(true))).not.toContain("Sign In");
    expect(labels(finalBandCtas(true))).not.toContain("Sign In");
    expect(labels(footerAuthCtas(true))).toEqual([
      "Dashboard",
      "Create New Logo",
      "My Projects",
    ]);
  });

  it("plan CTAs for signed-in users avoid signup funnel labels", () => {
    for (const plan of PLANS) {
      const cta = planCtaForAuth(plan, true);
      expect(cta.href).toBe("/projects/new");
      expect(cta.label).toBe("Create New Logo");
      expect(FORBIDDEN_SIGNED_IN_CTA_LABELS as readonly string[]).not.toContain(cta.label);
    }
  });
});
