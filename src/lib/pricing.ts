export type PlanId = "free" | "pro";

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
};

export const PLANS: Plan[] = [
  {
    id: "free",
    name: "Free",
    priceLabel: "$0",
    priceNote: "forever",
    description: "Explore ALEYA Logo Creator and ship your first Brand Kit.",
    generationLimit: "20 logo generations per hour (enforced)",
    exportLimit: "ZIP export packs with SVG + PNG variants",
    features: [
      "Unlimited logo projects",
      "Up to 4 concepts per generation",
      "Refine and regenerate",
      "SVG + PNG export pack",
      "Light and dark previews",
      "Editable Brand Kits",
    ],
    cta: { label: "Get Started", href: "/signup" },
  },
  {
    id: "pro",
    name: "Pro",
    priceLabel: "$29",
    priceNote: "per month · coming soon",
    description: "For growing brands that iterate often and export often.",
    generationLimit: "200 logo generations per hour (planned)",
    exportLimit: "Higher export throughput (planned)",
    features: [
      "Everything in Free",
      "Priority generation queue",
      "Higher refinement throughput",
      "Commercial export license",
      "Early access to AI raster concepts",
      "Waitlist — no payment today",
    ],
    cta: { label: "Join waitlist", href: "/signup?plan=pro" },
    highlighted: true,
  },
];
