import { describe, expect, it } from "vitest";
import { BILLING_PROVIDER_CONNECTED, PLAN_CATALOG } from "./catalog";
import { FORBIDDEN_UNBILLED_PRO_LABELS } from "@/lib/auth/marketing-ctas";

describe("waitlist / pricing language", () => {
  it("keeps Pro CTAs on waitlist/notify language while billing is disconnected", () => {
    if (BILLING_PROVIDER_CONNECTED) return;
    expect(PLAN_CATALOG.pro.signedOutCta.label).toMatch(/waitlist|Notify me/i);
    expect(PLAN_CATALOG.pro.signedInCta.label).toMatch(/waitlist|Notify me/i);
    for (const forbidden of FORBIDDEN_UNBILLED_PRO_LABELS) {
      expect(PLAN_CATALOG.pro.signedOutCta.label).not.toBe(forbidden);
      expect(PLAN_CATALOG.pro.signedInCta.label).not.toBe(forbidden);
    }
  });
});
