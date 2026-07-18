import { describe, expect, it } from "vitest";
import { PLANS } from "./pricing";

describe("pricing plans", () => {
  it("defines free and pro with generation and export limits", () => {
    expect(PLANS.map((p) => p.id)).toEqual(["free", "pro"]);
    for (const plan of PLANS) {
      expect(plan.generationLimit.length).toBeGreaterThan(0);
      expect(plan.exportLimit.length).toBeGreaterThan(0);
      expect(plan.features.length).toBeGreaterThan(3);
      expect(plan.cta.href).toMatch(/^\//);
    }
  });
});
