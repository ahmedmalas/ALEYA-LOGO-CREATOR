import type { MarketingCta } from "@/lib/auth/marketing-ctas";
import Link from "next/link";

type Tone = "light" | "dark" | "on-dark";

function classFor(tone: Tone, index: number, primaryFirst = true) {
  if (tone === "on-dark" || tone === "dark") {
    if (primaryFirst ? index === 0 : index === 0) {
      return index === 0 ? "btn btn-on-dark-primary" : "btn btn-on-dark";
    }
    return "btn btn-on-dark";
  }
  return index === 0 ? "btn btn-primary" : "btn btn-secondary";
}

export function MarketingCtaGroup({
  ctas,
  tone = "light",
  className = "",
  "data-testid": testId = "marketing-cta-group",
}: {
  ctas: MarketingCta[];
  tone?: Tone;
  className?: string;
  "data-testid"?: string;
}) {
  return (
    <div className={`flex flex-wrap gap-3 ${className}`} data-testid={testId} data-cta-count={ctas.length}>
      {ctas.map((cta, index) => (
        <Link
          key={`${cta.href}:${cta.label}`}
          href={cta.href}
          className={classFor(tone, index)}
          data-cta-label={cta.label}
        >
          {cta.label}
        </Link>
      ))}
    </div>
  );
}

export function MarketingTextLinks({
  ctas,
  className = "",
  "data-testid": testId = "marketing-text-links",
}: {
  ctas: MarketingCta[];
  className?: string;
  "data-testid"?: string;
}) {
  return (
    <div className={`flex flex-wrap gap-4 ${className}`} data-testid={testId}>
      {ctas.map((cta) => (
        <Link key={`${cta.href}:${cta.label}`} href={cta.href} data-cta-label={cta.label}>
          {cta.label}
        </Link>
      ))}
    </div>
  );
}
