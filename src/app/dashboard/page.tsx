import { FirstRunOnboarding } from "@/components/onboarding/first-run";
import { AppShell } from "@/components/shell";
import { ensureProfile } from "@/lib/account/profile";
import { formatBytesLabel, getPlan } from "@/lib/plans/catalog";
import { getUsageSnapshot } from "@/lib/plans/usage";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profile = await ensureProfile(supabase, user.id, user.email);
  const usage = await getUsageSnapshot(supabase, user.id);
  const plan = getPlan(usage.planId);

  const [{ data: projects }, { data: brandKits }, { data: references }] = await Promise.all([
    supabase
      .from("logo_projects")
      .select("id, business_name, tagline, style, industry, status, updated_at")
      .eq("owner_id", user.id)
      .order("updated_at", { ascending: false }),
    supabase
      .from("brand_kits")
      .select("id, name, updated_at")
      .eq("owner_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(6),
    supabase
      .from("project_references")
      .select("id, project_id, title, original_filename, mime_type, created_at, is_active")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  const list = projects ?? [];
  const isEmpty = list.length === 0;
  const recent = list.slice(0, 4);
  const incomplete = list.filter((project) => project.status !== "ready").slice(0, 4);
  const displayName = profile.display_name || user.email?.split("@")[0] || "there";

  return (
    <AppShell email={user.email}>
      {isEmpty ? <FirstRunOnboarding /> : null}

      <div className="mb-8 animate-rise">
        <p className="text-xs uppercase tracking-[0.18em] text-[var(--forest)]">Dashboard</p>
        <h1 className="mt-2 text-3xl">Welcome, {displayName}</h1>
        <p className="mt-1 text-black/60">
          Signed in as {user.email}
          {profile.business_name ? ` · ${profile.business_name}` : ""}
        </p>
      </div>

      <section
        className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
        aria-label="Plan and usage"
        data-testid="dashboard-usage"
      >
        <div className="panel rounded-2xl p-4">
          <p className="text-xs uppercase tracking-wide text-black/55">Current plan</p>
          <p className="mt-1 text-xl font-medium">
            {plan.name}{" "}
            <span className="text-sm font-normal text-black/55">({usage.planStatus})</span>
          </p>
          <Link href="/account/plan" className="mt-2 inline-flex text-sm text-[var(--forest)]">
            Manage plan →
          </Link>
        </div>
        <div className="panel rounded-2xl p-4">
          <p className="text-xs uppercase tracking-wide text-black/55">Generations (hour)</p>
          <p className="mt-1 text-xl font-medium">
            {usage.generationsUsedHour} / {usage.generationsPerHour}
          </p>
          <p className="mt-1 text-sm text-black/55">{usage.generationsRemainingHour} remaining</p>
        </div>
        <div className="panel rounded-2xl p-4">
          <p className="text-xs uppercase tracking-wide text-black/55">Reference storage</p>
          <p className="mt-1 text-xl font-medium">{usage.referenceCount} files</p>
          <p className="mt-1 text-sm text-black/55">
            {formatBytesLabel(usage.referenceBytesUsed)} used
          </p>
        </div>
        <div className="panel rounded-2xl p-4">
          <p className="text-xs uppercase tracking-wide text-black/55">Account</p>
          <p className="mt-1 text-xl font-medium">Profile</p>
          <Link href="/account/profile" className="mt-2 inline-flex text-sm text-[var(--forest)]">
            Edit profile →
          </Link>
        </div>
      </section>

      <div
        id="projects"
        className="mb-6 flex flex-wrap items-end justify-between gap-4 animate-rise"
      >
        <div>
          <h2 className="text-2xl">{isEmpty ? "Get started" : "My Projects"}</h2>
          <p className="mt-1 text-black/60">
            {isEmpty
              ? "Create a logo project, upload reference files, generate concepts, and save a Brand Kit."
              : "Continue editing, generate new concepts, or open Brand Kits."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/projects/new" className="btn btn-primary" data-testid="create-new-logo">
            Create New Logo
          </Link>
          <Link href="/brand-kits" className="btn btn-secondary">
            Brand Kits
          </Link>
        </div>
      </div>

      {!isEmpty ? (
        <section className="mb-10" aria-labelledby="recent-heading">
          <div className="mb-3 flex items-end justify-between gap-3">
            <h2 id="recent-heading" className="text-xl">
              Recent projects
            </h2>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {recent.map((project) => (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="panel rounded-2xl p-4 transition hover:-translate-y-0.5"
              >
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-lg break-words">{project.business_name}</h3>
                  <span className="text-xs uppercase tracking-wide text-black/55">
                    Continue editing
                  </span>
                </div>
                <p className="mt-1 text-sm text-black/60">
                  {project.style} · {project.industry}
                </p>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {incomplete.length ? (
        <section className="mb-10" aria-labelledby="incomplete-heading">
          <h2 id="incomplete-heading" className="mb-3 text-xl">
            Incomplete projects
          </h2>
          <div className="grid gap-3 md:grid-cols-2">
            {incomplete.map((project) => (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="panel rounded-2xl p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-medium">{project.business_name}</h3>
                  <span className="rounded-full bg-[var(--mist)] px-3 py-1 text-xs uppercase">
                    {project.status}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {isEmpty ? null : (
        <div className="grid gap-4 md:grid-cols-2">
          {list.map((project, index) => (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              className="panel animate-rise rounded-2xl p-5 transition hover:-translate-y-0.5"
              style={{ animationDelay: `${index * 60}ms` }}
            >
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-xl break-words">{project.business_name}</h2>
                <span className="shrink-0 rounded-full bg-[var(--mist)] px-3 py-1 text-xs uppercase tracking-wide">
                  {project.status}
                </span>
              </div>
              <p className="mt-2 text-sm text-black/60">
                {project.style} · {project.industry}
                {project.tagline ? ` · ${project.tagline}` : ""}
              </p>
              <p className="mt-3 text-sm text-[var(--forest)]">Continue Editing →</p>
            </Link>
          ))}
        </div>
      )}

      <section className="mt-12" aria-labelledby="kits-heading">
        <div className="mb-3 flex items-end justify-between gap-3">
          <h2 id="kits-heading" className="text-xl">
            Recent Brand Kits
          </h2>
          <Link href="/brand-kits" className="text-sm text-[var(--forest)]">
            View all
          </Link>
        </div>
        {(brandKits ?? []).length === 0 ? (
          <p className="text-sm text-black/60">No Brand Kits yet. Save one from a project studio.</p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {(brandKits ?? []).map((kit) => (
              <li key={kit.id} className="rounded-xl border border-black/8 bg-white/50 px-4 py-3 text-sm">
                <Link href="/brand-kits" className="font-medium hover:underline">
                  {kit.name}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section id="references" className="mt-12" aria-labelledby="refs-heading">
        <div className="mb-3 flex items-end justify-between gap-3">
          <h2 id="refs-heading" className="text-xl">
            Recent uploaded references
          </h2>
          <Link href="/references" className="text-sm text-[var(--forest)]">
            View all
          </Link>
        </div>
        {(references ?? []).length === 0 ? (
          <p className="mt-2 text-sm text-black/60">
            No reference files yet. Upload logos, sketches, packaging, receipts, or PDFs when you
            create or edit a project. Notes alone are not enough.
          </p>
        ) : (
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {(references ?? []).map((ref) => (
              <li key={ref.id} className="rounded-xl border border-black/8 bg-white/50 px-4 py-3 text-sm">
                <Link href={`/projects/${ref.project_id}`} className="font-medium hover:underline">
                  {ref.title || ref.original_filename}
                </Link>
                <p className="text-xs text-black/55">
                  {ref.mime_type}
                  {ref.is_active ? " · Active for generation" : " · Inactive"}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </AppShell>
  );
}
