/**
 * @deprecated Prefer importing from `@/lib/plans/catalog`.
 * Kept as a thin adapter so existing imports keep working.
 */
import {
  PLAN_LIST,
  type PlanDefinition,
  type PlanId,
  BILLING_PROVIDER_CONNECTED,
} from "@/lib/plans/catalog";

export type { PlanId };
export { BILLING_PROVIDER_CONNECTED };

export type Plan = {
  id: PlanId;
  name: string;
  priceLabel: string;
  priceNote: string;
  description: string;
  generationLimit: string;
  exportLimit: string;
  features: string[];
  cta: { label: string; href: string };
  highlighted?: boolean;
  definition: PlanDefinition;
};

export const PLANS: Plan[] = PLAN_LIST.map((plan) => ({
  id: plan.id,
  name: plan.name,
  priceLabel: plan.priceLabel,
  priceNote: plan.billingPeriodLabel,
  description: plan.description,
  generationLimit: `${plan.generationsPerHour} logo generations per hour (enforced)`,
  exportLimit:
    plan.exportsPerHour == null
      ? "Unlimited ZIP export packs (SVG + PNG variants)"
      : `${plan.exportsPerHour} ZIP exports per hour (enforced)`,
  features: plan.marketingFeatures,
  cta: plan.signedOutCta,
  highlighted: plan.highlighted,
  definition: plan,
}));
