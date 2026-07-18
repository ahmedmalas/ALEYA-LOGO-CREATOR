import { SampleLogo } from "@/components/marketing/sample-logo";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import { GALLERY_SAMPLES } from "@/lib/gallery-samples";
import { PLANS } from "@/lib/pricing";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "ALEYA Logo Creator",
  description:
    "Generate distinct brand marks, refine concepts, and export reusable Brand Kits with SVG and PNG assets.",
  alternates: { canonical: "/" },
};

const showcase = GALLERY_SAMPLES.slice(0, 4);

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <div className="relative min-h-[100svh] overflow-hidden">
        <div
          className="absolute inset-0 -z-10"
          style={{
            backgroundImage:
              "radial-gradient(circle at 18% 20%, rgba(176,138,79,0.35), transparent 36%), radial-gradient(circle at 82% 10%, rgba(246,240,228,0.16), transparent 32%), linear-gradient(135deg, #0f2a25 0%, #1f4d45 48%, #1a2420 100%)",
          }}
        />
        <div
          className="pointer-events-none absolute inset-0 -z-10 opacity-30"
          style={{
            backgroundImage:
              "linear-gradient(rgba(246,240,228,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(246,240,228,0.08) 1px, transparent 1px)",
            backgroundSize: "72px 72px",
            maskImage: "linear-gradient(180deg, black, transparent 85%)",
          }}
          aria-hidden
        />
        <SiteHeader tone="dark" />
        <section className="mx-auto flex min-h-[calc(100svh-5rem)] w-full max-w-6xl flex-col justify-end px-4 pb-16 pt-10 md:px-8">
          <p className="brand animate-rise text-5xl text-[#f6f0e4] md:text-7xl">ALEYA</p>
          <h1
            className="mt-3 max-w-xl animate-rise text-2xl font-medium text-[#f6f0e4] md:text-3xl"
            style={{ animationDelay: "80ms" }}
          >
            Logo Creator
          </h1>
          <p
            className="mt-3 max-w-lg animate-rise text-[#efe7d8]"
            style={{ animationDelay: "140ms" }}
          >
            Generate distinct brand marks, refine concepts, and export a reusable Brand Kit.
          </p>
          <div
            className="mt-8 flex flex-wrap gap-3 animate-rise"
            style={{ animationDelay: "200ms" }}
          >
            <Link href="/signup" className="btn btn-primary">
              Get Started
            </Link>
            <Link href="/login" className="btn btn-secondary border-[#f6f0e4] text-[#f6f0e4]">
              Sign In
            </Link>
          </div>
        </section>
      </div>

      <main>
        <section className="mx-auto max-w-6xl px-4 py-20 md:px-8">
          <h2 className="animate-rise text-3xl md:text-4xl">Built for real brand work</h2>
          <p className="mt-3 max-w-2xl animate-rise text-black/60">
            From first brief to downloadable assets — without starting over in another tool.
          </p>
          <div className="mt-10 grid gap-8 md:grid-cols-3">
            {[
              {
                title: "Multiple concepts",
                body: "Generate distinct directions across style, layout, and personality — then compare side by side.",
              },
              {
                title: "Editable Brand Kits",
                body: "Select a final mark and keep palette, typography, prompts, and history in one reusable kit.",
              },
              {
                title: "Usable exports",
                body: "Download SVG, transparent PNG, hi-res, icon, horizontal, stacked, and mono variants together.",
              },
            ].map((item, index) => (
              <article
                key={item.title}
                className="animate-rise border-t border-black/10 pt-5"
                style={{ animationDelay: `${index * 70}ms` }}
              >
                <h3 className="text-xl">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-black/60">{item.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="bg-[rgba(18,54,47,0.04)] py-20">
          <div className="mx-auto max-w-6xl px-4 md:px-8">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="text-3xl md:text-4xl">Example logos</h2>
                <p className="mt-3 max-w-xl text-black/60">
                  Sample marks across industries and styles — browse the full gallery without signing in.
                </p>
              </div>
              <Link href="/gallery" className="btn btn-secondary">
                View gallery
              </Link>
            </div>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {showcase.map((sample, index) => (
                <figure
                  key={sample.id}
                  className="animate-rise overflow-hidden rounded-2xl border border-black/8 bg-white/50"
                  style={{ animationDelay: `${index * 60}ms` }}
                >
                  <SampleLogo sample={sample} />
                  <figcaption className="space-y-1 p-4">
                    <p className="font-medium">{sample.businessName}</p>
                    <p className="text-xs uppercase tracking-wide text-black/45">
                      {sample.industry} · {sample.style}
                    </p>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-20 md:px-8">
          <h2 className="text-3xl md:text-4xl">Brand Kits that stay editable</h2>
          <p className="mt-3 max-w-2xl text-black/60">
            When you select a final logo, ALEYA packages primary and secondary marks, colour systems,
            typography choices, and usage previews you can reopen later.
          </p>
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            <div className="panel rounded-3xl p-6">
              <p className="text-sm uppercase tracking-wide text-black/45">Included</p>
              <ul className="mt-4 space-y-3 text-sm text-black/70">
                <li>Primary, secondary, and icon marks</li>
                <li>Primary and secondary colour palettes</li>
                <li>Typography selections and logo prompt history</li>
                <li>Light and dark usage previews</li>
              </ul>
            </div>
            <div className="overflow-hidden rounded-3xl border border-black/8">
              <SampleLogo sample={GALLERY_SAMPLES[0]!} background="#F7F4EF" className="min-h-48" />
              <div className="bg-[#121212] p-4">
                <SampleLogo sample={GALLERY_SAMPLES[0]!} background="#121212" className="min-h-40" />
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[rgba(176,138,79,0.08)] py-20">
          <div className="mx-auto max-w-6xl px-4 md:px-8">
            <h2 className="text-3xl md:text-4xl">Export what you need</h2>
            <p className="mt-3 max-w-2xl text-black/60">
              One download includes the formats teams actually use across websites, invoices, and social.
            </p>
            <div className="mt-8 flex flex-wrap gap-3 text-sm">
              {[
                "SVG",
                "Transparent PNG",
                "Hi-res PNG",
                "Icon",
                "Horizontal",
                "Stacked",
                "Monochrome",
                "Light / dark previews",
              ].map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-black/10 bg-white/60 px-4 py-2 text-black/70"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-20 md:px-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-3xl md:text-4xl">Simple pricing</h2>
              <p className="mt-3 max-w-xl text-black/60">
                Start free. Pro raises generation and export limits when you need more volume.
              </p>
            </div>
            <Link href="/pricing" className="btn btn-secondary">
              Compare plans
            </Link>
          </div>
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            {PLANS.map((plan) => (
              <article
                key={plan.id}
                className={`panel rounded-3xl p-6 ${plan.highlighted ? "ring-2 ring-[var(--forest)]" : ""}`}
              >
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="text-2xl">{plan.name}</h3>
                  <p className="text-2xl font-semibold text-[var(--forest-deep)]">
                    {plan.priceLabel}
                    <span className="ml-2 text-sm font-normal text-black/45">{plan.priceNote}</span>
                  </p>
                </div>
                <p className="mt-3 text-sm text-black/60">{plan.description}</p>
                <p className="mt-4 text-sm">
                  <span className="font-medium">Generations:</span> {plan.generationLimit}
                </p>
                <p className="mt-1 text-sm">
                  <span className="font-medium">Exports:</span> {plan.exportLimit}
                </p>
                <Link href={plan.cta.href} className="btn btn-primary mt-6">
                  {plan.cta.label}
                </Link>
              </article>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-8 md:px-8">
          <div className="rounded-[2rem] bg-[var(--forest-deep)] px-6 py-12 text-[#f6f0e4] md:px-12">
            <h2 className="text-3xl md:text-4xl">Ready to create your brand mark?</h2>
            <p
              className="mt-3 max-w-xl text-[#efe7d8]"
              style={{ opacity: 0.9 }}
            >
              Open a project, generate concepts, and leave with a Brand Kit you can reopen anytime.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/signup" className="btn bg-[#f6f0e4] text-[var(--forest-deep)]">
                Get Started
              </Link>
              <Link href="/gallery" className="btn btn-secondary border-[#f6f0e4] text-[#f6f0e4]">
                Browse examples
              </Link>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
