import type { Plan } from "@/lib/pricing";

export type MarketingCta = { label: string; href: string };

export function signedOutPrimaryCtas(): MarketingCta[] {
  return [
    { label: "Get Started", href: "/signup" },
    { label: "Sign In", href: "/login" },
  ];
}

export function signedInPrimaryCtas(): MarketingCta[] {
  return [
    { label: "Go to Dashboard", href: "/dashboard" },
    { label: "Create New Logo", href: "/projects/new" },
    { label: "View My Projects", href: "/dashboard#projects" },
  ];
}

export function primaryMarketingCtas(signedIn: boolean): MarketingCta[] {
  return signedIn ? signedInPrimaryCtas() : signedOutPrimaryCtas();
}

/** Final-band secondary CTA (browse gallery) is always available. */
export function finalBandCtas(signedIn: boolean): MarketingCta[] {
  if (signedIn) {
    return [
      { label: "Go to Dashboard", href: "/dashboard" },
      { label: "Create New Logo", href: "/projects/new" },
      { label: "Browse examples", href: "/gallery" },
    ];
  }
  return [
    { label: "Get Started", href: "/signup" },
    { label: "Browse examples", href: "/gallery" },
  ];
}

export function galleryBandCtas(signedIn: boolean): MarketingCta[] {
  if (signedIn) {
    return [
      { label: "Create New Logo", href: "/projects/new" },
      { label: "View My Projects", href: "/dashboard#projects" },
      { label: "View pricing", href: "/pricing" },
    ];
  }
  return [
    { label: "Get Started", href: "/signup" },
    { label: "View pricing", href: "/pricing" },
  ];
}

export function footerAuthCtas(signedIn: boolean): MarketingCta[] {
  if (signedIn) {
    return [
      { label: "Dashboard", href: "/dashboard" },
      { label: "Create New Logo", href: "/projects/new" },
      { label: "My Projects", href: "/dashboard#projects" },
    ];
  }
  return [
    { label: "Get Started", href: "/signup" },
    { label: "Sign In", href: "/login" },
  ];
}

export function planCtaForAuth(
  plan: Plan,
  signedIn: boolean,
  currentPlanId: Plan["id"] = "free",
): MarketingCta {
  if (!signedIn) return plan.cta;
  if (plan.id === currentPlanId) {
    return { label: "Current plan", href: "/account/plan" };
  }
  // Signed-in users never enter signup. While billing is disconnected, Pro is waitlist-only.
  if (plan.id === "pro") {
    return {
      label: plan.definition.paidCheckoutAvailable ? "Notify me" : "Join waitlist",
      href: "/account/plan?waitlist=pro",
    };
  }
  return { label: "View plan usage", href: "/account/plan" };
}

/** Labels that must never appear for authenticated marketing surfaces. */
export const FORBIDDEN_SIGNED_IN_CTA_LABELS = [
  "Get Started",
  "Sign In",
  "Buy",
  "Subscribe",
  "Upgrade Now",
  "Start Pro",
  "Checkout",
] as const;

/** Labels forbidden on Pro CTAs while billing is disconnected. */
export const FORBIDDEN_UNBILLED_PRO_LABELS = [
  "Buy",
  "Subscribe",
  "Upgrade Now",
  "Upgrade to Pro",
  "Start Pro",
  "Checkout",
] as const;
