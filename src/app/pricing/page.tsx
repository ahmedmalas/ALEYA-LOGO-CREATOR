import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import { PLANS } from "@/lib/pricing";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "ALEYA Logo Creator Free and Pro plans with clear generation and export limits. No payment required to start.",
  alternates: { canonical: "/pricing" },
};

export default function PricingPage() {
  return (
    <div className="min-h-screen">
      <SiteHeader solid />
      <main className="mx-auto max-w-6xl px-4 py-14 md:px-8">
        <h1 className="animate-rise text-4xl md:text-5xl">Pricing</h1>
        <p className="mt-3 max-w-2xl animate-rise text-black/60">
          Choose Free to launch your first Brand Kit. Pro expands generation and export capacity —
          payment integration arrives later; Pro is waitlist-only for now.
        </p>

        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          {PLANS.map((plan, index) => (
            <article
              key={plan.id}
              className={`panel animate-rise rounded-3xl p-7 ${
                plan.highlighted ? "ring-2 ring-[var(--forest)]" : ""
              }`}
              style={{ animationDelay: `${index * 80}ms` }}
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
                  <span className="font-medium">Generation limit:</span> {plan.generationLimit}
                </p>
                <p>
                  <span className="font-medium">Export limit:</span> {plan.exportLimit}
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

              <Link
                href={plan.cta.href}
                className={`btn mt-8 ${plan.highlighted ? "btn-primary" : "btn-secondary"}`}
              >
                {plan.cta.label}
              </Link>
            </article>
          ))}
        </div>

        <section className="mt-16 border-t border-black/10 pt-10">
          <h2 className="text-2xl">Limit details</h2>
          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[32rem] text-left text-sm">
              <thead>
                <tr className="border-b border-black/10 text-black/55">
                  <th scope="col" className="py-3 font-medium">
                    Capability
                  </th>
                  <th scope="col" className="py-3 font-medium">
                    Free
                  </th>
                  <th scope="col" className="py-3 font-medium">
                    Pro
                  </th>
                </tr>
              </thead>
              <tbody className="text-black/70">
                <tr className="border-b border-black/6">
                  <td className="py-3">Logo generations</td>
                  <td className="py-3">20 / hour (enforced)</td>
                  <td className="py-3">200 / hour (planned)</td>
                </tr>
                <tr className="border-b border-black/6">
                  <td className="py-3">Concepts per generation</td>
                  <td className="py-3">Up to 4</td>
                  <td className="py-3">Up to 4</td>
                </tr>
                <tr className="border-b border-black/6">
                  <td className="py-3">Brand Kit ZIP exports</td>
                  <td className="py-3">SVG + PNG pack</td>
                  <td className="py-3">Higher throughput (planned)</td>
                </tr>
                <tr className="border-b border-black/6">
                  <td className="py-3">Brand Kits</td>
                  <td className="py-3">Editable kits included</td>
                  <td className="py-3">Same + planned priority queue</td>
                </tr>
                <tr>
                  <td className="py-3">Payments</td>
                  <td className="py-3">Not required</td>
                  <td className="py-3">Coming soon (waitlist)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
