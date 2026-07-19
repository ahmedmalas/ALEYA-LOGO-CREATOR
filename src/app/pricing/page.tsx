import { AppShell } from "@/components/shell";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import { planCtaForAuth } from "@/lib/auth/marketing-ctas";
import { getAuthState } from "@/lib/auth/session";
import {
  BILLING_PROVIDER_CONNECTED,
  formatBytesLabel,
  PLAN_LIST,
  type PlanId,
} from "@/lib/plans/catalog";
import { getUserPlanId } from "@/lib/plans/usage";
import { PLANS } from "@/lib/pricing";
import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "ALEYA Logo Creator Free and Pro plans with clear generation, export, and reference limits.",
  alternates: { canonical: "/pricing" },
};

const COMPARISON: { label: string; free: string; pro: string }[] = (() => {
  const free = PLAN_LIST[0];
  const pro = PLAN_LIST[1];
  return [
    { label: "Price", free: `${free.priceLabel} ${free.billingPeriodLabel}`, pro: `${pro.priceLabel} ${pro.billingPeriodLabel}` },
    { label: "Included generations", free: `${free.generationsPerHour} / hour`, pro: `${pro.generationsPerHour} / hour` },
    { label: "Included refinements", free: `Shared with generation allowance (${free.refinementsPerHour}/hour)`, pro: `Shared with generation allowance (${pro.refinementsPerHour}/hour)` },
    {
      label: "Export limits",
      free: free.exportsPerHour == null ? "Unlimited ZIP packs" : `${free.exportsPerHour}/hour`,
      pro: pro.exportsPerHour == null ? "Unlimited ZIP packs (when live)" : `${pro.exportsPerHour}/hour`,
    },
    { label: "Export formats", free: free.exportFormats.join(", "), pro: pro.exportFormats.join(", ") },
    {
      label: "Projects",
      free: free.maxProjects == null ? "Unlimited" : String(free.maxProjects),
      pro: pro.maxProjects == null ? "Unlimited" : String(pro.maxProjects),
    },
    { label: "Brand Kit access", free: free.brandKitAccess ? "Yes" : "No", pro: pro.brandKitAccess ? "Yes" : "No" },
    { label: "Reference uploads / project", free: String(free.referenceMaxFilesPerProject), pro: String(pro.referenceMaxFilesPerProject) },
    { label: "Max reference file size", free: formatBytesLabel(free.referenceMaxFileBytes), pro: formatBytesLabel(pro.referenceMaxFileBytes) },
    { label: "Storage allowance", free: formatBytesLabel(free.referenceMaxTotalBytes), pro: formatBytesLabel(pro.referenceMaxTotalBytes) },
    { label: "Commercial-use rights", free: free.commercialUse, pro: pro.commercialUse },
    { label: "Watermark", free: free.watermark, pro: pro.watermark },
    { label: "Support", free: free.supportLevel, pro: pro.supportLevel },
    { label: "Cancellation", free: free.cancellationTerms, pro: pro.cancellationTerms },
    { label: "Unused allowance rollover", free: free.unusedAllowanceRollover, pro: pro.unusedAllowanceRollover },
    { label: "Payment method required", free: free.paymentMethodRequired ? "Yes" : "No", pro: pro.paymentMethodRequired ? "Yes (when billing is live)" : "No" },
    {
      label: "Checkout status",
      free: "Available now",
      pro: BILLING_PROVIDER_CONNECTED ? "Paid checkout available" : "Waitlist — billing not connected",
    },
  ];
})();

export default async function PricingPage() {
  const { signedIn } = await getAuthState();
  let currentPlanId: PlanId = "free";
  let planStatus = "active";
  let email: string | null = null;

  if (signedIn) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    email = user?.email ?? null;
    if (user) {
      const plan = await getUserPlanId(supabase, user.id);
      currentPlanId = plan.planId;
      planStatus = plan.planStatus;
    }
  }

  const content = (
    <main className={signedIn ? "" : "mx-auto max-w-6xl px-4 py-14 md:px-8"}>
      {!signedIn ? (
        <>
          <h1 className="animate-rise text-4xl md:text-5xl">Pricing</h1>
          <p className="mt-3 max-w-2xl animate-rise text-black/60">
            One plan catalog powers this page, homepage pricing, signup CTAs, account usage, and
            generation limits. Pro checkout is waitlist-only until a billing provider is connected.
          </p>
        </>
      ) : (
        <>
          <h1 className="text-3xl md:text-4xl">Pricing & plans</h1>
          <p className="mt-2 max-w-2xl text-black/60">
            You are on <strong>{currentPlanId === "pro" ? "Pro" : "Free"}</strong> ({planStatus}).
            Paid upgrades do not succeed unless billing is connected.
          </p>
          <p className="mt-2 text-sm text-black/55" data-testid="billing-blocker">
            Billing status:{" "}
            {BILLING_PROVIDER_CONNECTED
              ? "provider keys detected"
              : "no Stripe/billing provider connected"}
          </p>
        </>
      )}

      <div className="mt-12 grid gap-6 lg:grid-cols-2">
        {PLANS.map((plan, index) => {
          const cta = planCtaForAuth(plan, signedIn, currentPlanId);
          const isCurrent = signedIn && plan.id === currentPlanId;
          const definition = plan.definition;
          return (
            <article
              key={plan.id}
              className={`panel animate-rise rounded-3xl p-7 ${
                plan.highlighted ? "ring-2 ring-[var(--forest)]" : ""
              }`}
              style={{ animationDelay: `${index * 80}ms` }}
              data-plan={plan.id}
              data-current={isCurrent ? "true" : "false"}
            >
              {plan.highlighted ? (
                <p className="mb-3 text-xs uppercase tracking-[0.18em] text-[var(--forest)]">
                  Recommended
                </p>
              ) : null}
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="text-3xl">{plan.name}</h2>
                <p className="text-3xl font-semibold text-[var(--forest-deep)]">
                  {plan.priceLabel}
                  <span className="ml-2 text-sm font-normal text-black/55">{plan.priceNote}</span>
                </p>
              </div>
              <p className="mt-3 text-black/60">{plan.description}</p>

              <div className="mt-6 space-y-2 rounded-2xl bg-[rgba(31,77,69,0.06)] p-4 text-sm">
                <p>
                  <span className="font-medium">Generations:</span> {definition.generationsPerHour} /
                  hour
                </p>
                <p>
                  <span className="font-medium">Refinements:</span> shared hourly allowance
                </p>
                <p>
                  <span className="font-medium">Exports:</span> {plan.exportLimit}
                </p>
                <p>
                  <span className="font-medium">Formats:</span> {definition.exportFormats.join(", ")}
                </p>
                <p>
                  <span className="font-medium">Projects:</span>{" "}
                  {definition.maxProjects == null ? "Unlimited" : definition.maxProjects}
                </p>
                <p>
                  <span className="font-medium">Brand Kits:</span>{" "}
                  {definition.brandKitAccess ? "Included" : "Not included"}
                </p>
                <p>
                  <span className="font-medium">References:</span>{" "}
                  {definition.referenceMaxFilesPerProject} files / project ·{" "}
                  {formatBytesLabel(definition.referenceMaxFileBytes)} each ·{" "}
                  {formatBytesLabel(definition.referenceMaxTotalBytes)} total
                </p>
                <p>
                  <span className="font-medium">Commercial use:</span> {definition.commercialUse}
                </p>
                <p>
                  <span className="font-medium">Watermark:</span> {definition.watermark}
                </p>
                <p>
                  <span className="font-medium">Support:</span> {definition.supportLevel}
                </p>
                <p>
                  <span className="font-medium">Cancellation:</span> {definition.cancellationTerms}
                </p>
                <p>
                  <span className="font-medium">Rollover:</span> {definition.unusedAllowanceRollover}
                </p>
                <p>
                  <span className="font-medium">Payment method:</span>{" "}
                  {definition.paymentMethodRequired ? "Required" : "Not required"}
                </p>
              </div>

              <ul className="mt-6 space-y-2 text-sm text-black/70">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex gap-2">
                    <span aria-hidden className="text-[var(--forest)]">
                      ✓
                    </span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              {isCurrent ? (
                <button
                  type="button"
                  className="btn btn-secondary mt-8 w-full opacity-80"
                  disabled
                  data-cta-label="Current plan"
                >
                  Current plan
                </button>
              ) : (
                <Link
                  href={cta.href}
                  className={`btn mt-8 w-full ${plan.highlighted ? "btn-primary" : "btn-secondary"}`}
                  data-cta-label={cta.label}
                >
                  {cta.label}
                </Link>
              )}
            </article>
          );
        })}
      </div>

      <section className="mt-16 border-t border-black/10 pt-10">
        <h2 className="text-2xl">Feature comparison</h2>
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[36rem] text-left text-sm">
            <thead>
              <tr className="border-b border-black/10 text-black/55">
                <th scope="col" className="py-3 pr-4 font-medium">
                  Capability
                </th>
                <th scope="col" className="py-3 pr-4 font-medium">
                  Free
                </th>
                <th scope="col" className="py-3 font-medium">
                  Pro
                </th>
              </tr>
            </thead>
            <tbody className="text-black/70">
              {COMPARISON.map((row) => (
                <tr key={row.label} className="border-b border-black/6 align-top">
                  <td className="py-3 pr-4 font-medium text-black/80">{row.label}</td>
                  <td className="py-3 pr-4">{row.free}</td>
                  <td className="py-3">{row.pro}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {signedIn ? (
        <p className="mt-10 text-sm text-black/55">
          Return to{" "}
          <Link href="/dashboard" className="text-[var(--forest)] underline">
            Dashboard
          </Link>{" "}
          or{" "}
          <Link href="/account/plan" className="text-[var(--forest)] underline">
            Plan & usage
          </Link>
          .
        </p>
      ) : null}
    </main>
  );

  if (signedIn) {
    return (
      <div data-auth="signed-in">
        <AppShell email={email}>{content}</AppShell>
      </div>
    );
  }

  return (
    <div className="min-h-screen" data-auth="signed-out">
      <SiteHeader solid />
      {content}
      <SiteFooter />
    </div>
  );
}
