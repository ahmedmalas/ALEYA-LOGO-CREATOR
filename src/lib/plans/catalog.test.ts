import { describe, expect, it } from "vitest";
import { BILLING_PROVIDER_CONNECTED, PLAN_CATALOG, PLAN_LIST, getPlan } from "./catalog";

describe("plan catalog", () => {
  it("is the single source for Free and Pro limits", () => {
    expect(PLAN_LIST.map((p) => p.id)).toEqual(["free", "pro"]);
    expect(getPlan("free")).toBe(PLAN_CATALOG.free);
    expect(getPlan("pro")).toBe(PLAN_CATALOG.pro);
    expect(PLAN_CATALOG.free.paymentMethodRequired).toBe(false);
    expect(PLAN_CATALOG.free.generationsPerHour).toBeGreaterThan(0);
    expect(PLAN_CATALOG.free.referenceMaxFilesPerProject).toBeGreaterThan(0);
    expect(PLAN_CATALOG.pro.referenceMaxFilesPerProject).toBeGreaterThan(
      PLAN_CATALOG.free.referenceMaxFilesPerProject,
    );
  });

  it("does not claim paid checkout when billing is disconnected", () => {
    if (!BILLING_PROVIDER_CONNECTED) {
      expect(PLAN_CATALOG.pro.paidCheckoutAvailable).toBe(false);
      expect(PLAN_CATALOG.pro.waitlistOnly).toBe(true);
      expect(PLAN_CATALOG.pro.marketingFeatures.join(" ")).toMatch(/waitlist|not connected/i);
    }
  });
});
