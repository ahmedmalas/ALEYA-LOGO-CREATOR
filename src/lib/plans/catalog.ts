/**
 * Single authoritative plan catalog for marketing, account UI, and enforcement.
 * Do not duplicate numeric limits elsewhere — import from here.
 */

export type PlanId = "free" | "pro";

export type PlanDefinition = {
  id: PlanId;
  name: string;
  description: string;
  /** Exact display price */
  priceLabel: string;
  /** Numeric cents for future billing; Free = 0 */
  priceCents: number;
  currency: "USD";
  billingPeriod: "forever" | "month";
  billingPeriodLabel: string;
  highlighted?: boolean;
  /** Runtime enforcement values */
  generationsPerHour: number;
  refinementsPerHour: number;
  conceptsPerGeneration: number;
  exportsPerHour: number | null;
  exportFormats: string[];
  maxProjects: number | null;
  brandKitAccess: boolean;
  referenceMaxFilesPerProject: number;
  referenceMaxFileBytes: number;
  referenceMaxTotalBytes: number;
  commercialUse: string;
  watermark: string;
  supportLevel: string;
  cancellationTerms: string;
  unusedAllowanceRollover: string;
  paymentMethodRequired: boolean;
  /** Honest billing flag — false until Stripe (or similar) is connected */
  paidCheckoutAvailable: boolean;
  waitlistOnly?: boolean;
  marketingFeatures: string[];
  signedOutCta: { label: string; href: string };
  signedInCta: { label: string; href: string };
};

const envNumber = (key: string, fallback: number) => {
  const raw = process.env[key];
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
};

export const BILLING_PROVIDER_CONNECTED = Boolean(
  process.env.STRIPE_SECRET_KEY || process.env.BILLING_PROVIDER === "stripe",
);

export const PLAN_CATALOG: Record<PlanId, PlanDefinition> = {
  free: {
    id: "free",
    name: "Free",
    description: "Explore ALEYA Logo Creator and ship your first Brand Kit.",
    priceLabel: "$0",
    priceCents: 0,
    currency: "USD",
    billingPeriod: "forever",
    billingPeriodLabel: "forever",
    generationsPerHour: envNumber("GENERATION_RATE_LIMIT_PER_HOUR", 20),
    refinementsPerHour: envNumber("GENERATION_RATE_LIMIT_PER_HOUR", 20),
    conceptsPerGeneration: 4,
    exportsPerHour: null,
    exportFormats: ["SVG", "Transparent PNG", "Hi-res PNG", "Icon", "Horizontal", "Stacked", "Monochrome"],
    maxProjects: null,
    brandKitAccess: true,
    referenceMaxFilesPerProject: envNumber("REFERENCE_MAX_FILES_PER_PROJECT", 10),
    referenceMaxFileBytes: envNumber("REFERENCE_MAX_FILE_BYTES", 5 * 1024 * 1024),
    referenceMaxTotalBytes: envNumber("REFERENCE_MAX_TOTAL_BYTES_PER_USER", 50 * 1024 * 1024),
    commercialUse: "Personal and internal business use included",
    watermark: "No watermark on Free exports",
    supportLevel: "Documentation and in-app help",
    cancellationTerms: "Free plan has no subscription to cancel",
    unusedAllowanceRollover: "Hourly generation allowance does not roll over",
    paymentMethodRequired: false,
    paidCheckoutAvailable: false,
    marketingFeatures: [
      "Unlimited logo projects",
      "Up to 4 concepts per generation",
      "Refine and regenerate (shared hourly allowance)",
      "SVG + PNG export pack",
      "Editable Brand Kits",
      "Real reference file uploads (PNG, JPG, WEBP, SVG, PDF)",
    ],
    signedOutCta: { label: "Get Started", href: "/signup" },
    signedInCta: { label: "Create New Logo", href: "/projects/new" },
  },
  pro: {
    id: "pro",
    name: "Pro",
    description: "For growing brands that iterate often and export often.",
    priceLabel: "$29",
    priceCents: 2900,
    currency: "USD",
    billingPeriod: "month",
    billingPeriodLabel: "per month",
    highlighted: true,
    generationsPerHour: envNumber("REFERENCE_PRO_GENERATIONS_PER_HOUR", 200),
    refinementsPerHour: envNumber("REFERENCE_PRO_GENERATIONS_PER_HOUR", 200),
    conceptsPerGeneration: 4,
    exportsPerHour: null,
    exportFormats: ["SVG", "Transparent PNG", "Hi-res PNG", "Icon", "Horizontal", "Stacked", "Monochrome"],
    maxProjects: null,
    brandKitAccess: true,
    referenceMaxFilesPerProject: envNumber("REFERENCE_PRO_MAX_FILES_PER_PROJECT", 40),
    referenceMaxFileBytes: envNumber("REFERENCE_PRO_MAX_FILE_BYTES", 10 * 1024 * 1024),
    referenceMaxTotalBytes: envNumber("REFERENCE_PRO_MAX_TOTAL_BYTES_PER_USER", 250 * 1024 * 1024),
    commercialUse: "Commercial export license (when Pro billing is live)",
    watermark: "No watermark",
    supportLevel: "Priority support (when Pro billing is live)",
    cancellationTerms: "Cancel anytime once billing is connected — not available yet",
    unusedAllowanceRollover: "Hourly generation allowance does not roll over",
    paymentMethodRequired: true,
    paidCheckoutAvailable: BILLING_PROVIDER_CONNECTED,
    waitlistOnly: !BILLING_PROVIDER_CONNECTED,
    marketingFeatures: [
      "Everything in Free",
      "Higher hourly generation allowance",
      "Higher reference file counts and storage",
      "Priority generation queue (planned with billing)",
      "Commercial export license (planned with billing)",
      BILLING_PROVIDER_CONNECTED
        ? "Paid checkout available"
        : "Waitlist — paid checkout is not connected yet",
    ],
    signedOutCta: {
      label: BILLING_PROVIDER_CONNECTED ? "Start Pro" : "Join waitlist",
      href: BILLING_PROVIDER_CONNECTED ? "/signup?plan=pro" : "/signup?plan=pro",
    },
    signedInCta: {
      label: BILLING_PROVIDER_CONNECTED ? "Upgrade to Pro" : "Join Pro waitlist",
      href: BILLING_PROVIDER_CONNECTED ? "/account/plan" : "/account/plan?waitlist=pro",
    },
  },
};

export const PLAN_LIST: PlanDefinition[] = [PLAN_CATALOG.free, PLAN_CATALOG.pro];

export function getPlan(planId: PlanId | string | null | undefined): PlanDefinition {
  if (planId === "pro") return PLAN_CATALOG.pro;
  return PLAN_CATALOG.free;
}

export function formatBytesLabel(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(bytes % (1024 * 1024) === 0 ? 0 : 1)} MB`;
}
