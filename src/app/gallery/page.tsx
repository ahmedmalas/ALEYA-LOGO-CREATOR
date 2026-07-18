import { SampleLogo } from "@/components/marketing/sample-logo";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import { GALLERY_SAMPLES } from "@/lib/gallery-samples";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Example Gallery",
  description:
    "Browse sample ALEYA logos across industries and styles. No account required.",
  alternates: { canonical: "/gallery" },
};

const industries = Array.from(new Set(GALLERY_SAMPLES.map((s) => s.industry)));

export default function GalleryPage() {
  return (
    <div className="min-h-screen">
      <SiteHeader solid />
      <main className="mx-auto max-w-6xl px-4 py-14 md:px-8">
        <h1 className="animate-rise text-4xl md:text-5xl">Example gallery</h1>
        <p className="mt-3 max-w-2xl animate-rise text-black/60">
          Sample marks spanning design, logistics, interiors, technology, healthcare, retail,
          finance, and hospitality. Browse freely — no authentication required.
        </p>

        <div className="mt-6 flex flex-wrap gap-2">
          {industries.map((industry) => (
            <span
              key={industry}
              className="rounded-full border border-black/10 bg-white/50 px-3 py-1 text-xs uppercase tracking-wide text-black/55"
            >
              {industry}
            </span>
          ))}
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {GALLERY_SAMPLES.map((sample, index) => (
            <article
              key={sample.id}
              className="animate-rise overflow-hidden rounded-3xl border border-black/8 bg-white/45"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <SampleLogo sample={sample} />
              <div className="space-y-2 p-5">
                <h2 className="text-xl">{sample.businessName}</h2>
                <p className="text-sm text-black/55">{sample.tagline}</p>
                <p className="text-xs uppercase tracking-wide text-black/40">
                  {sample.industry} · {sample.style} · {sample.layout}
                </p>
                <div className="flex gap-2 pt-1">
                  {[sample.primary, sample.secondary].map((color) => (
                    <span
                      key={color}
                      className="h-5 w-5 rounded-full border border-black/10"
                      style={{ background: color }}
                      title={color}
                    />
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-14 rounded-[2rem] border border-black/8 bg-[rgba(31,77,69,0.06)] px-6 py-10 md:px-10">
          <h2 className="text-2xl">Create your own direction</h2>
          <p className="mt-2 max-w-xl text-black/60">
            Start a project with your business name, style, and colours — then generate concepts you
            can refine and export.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/signup" className="btn btn-primary">
              Get Started
            </Link>
            <Link href="/pricing" className="btn btn-secondary">
              View pricing
            </Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
