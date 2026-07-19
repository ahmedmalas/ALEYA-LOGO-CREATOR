import { FirstRunOnboarding } from "@/components/onboarding/first-run";
import { AppShell } from "@/components/shell";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

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
      .select("id, project_id, original_filename, mime_type, created_at")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  const list = projects ?? [];
  const isEmpty = list.length === 0;
  const recent = list.slice(0, 4);

  return (
    <AppShell email={user.email}>
      {isEmpty ? <FirstRunOnboarding /> : null}

      <div
        id="projects"
        className="mb-6 flex flex-wrap items-end justify-between gap-4 animate-rise"
      >
        <div>
          <h1 className="text-3xl">{isEmpty ? "Welcome" : "My Projects"}</h1>
          <p className="mt-1 text-black/60">
            {isEmpty
              ? "Create a logo project, upload references, generate concepts, and save a Brand Kit."
              : "Continue editing, generate new concepts, or open Brand Kits — without leaving the app."}
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

      <section className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Quick links">
        {[
          { href: "/projects/new", label: "Create New Logo", hint: "Start a brief + references" },
          { href: "/dashboard#projects", label: "My Projects", hint: `${list.length} project(s)` },
          { href: "/brand-kits", label: "Brand Kits", hint: `${(brandKits ?? []).length} recent` },
          {
            href: "/dashboard#references",
            label: "Uploaded References",
            hint: `${(references ?? []).length} recent`,
          },
        ].map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className="panel rounded-2xl p-4 transition hover:-translate-y-0.5"
          >
            <p className="font-medium">{item.label}</p>
            <p className="mt-1 text-sm text-black/55">{item.hint}</p>
          </Link>
        ))}
      </section>

      {!isEmpty ? (
        <section className="mb-10" aria-labelledby="recent-heading">
          <div className="mb-3 flex items-end justify-between gap-3">
            <h2 id="recent-heading" className="text-xl">
              Recent Projects
            </h2>
            <Link href="/dashboard#projects" className="text-sm text-[var(--forest)]">
              View all
            </Link>
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
                    Continue Editing
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

      <section id="references" className="mt-12" aria-labelledby="refs-heading">
        <h2 id="refs-heading" className="text-xl">
          Uploaded References
        </h2>
        {(references ?? []).length === 0 ? (
          <p className="mt-2 text-sm text-black/60">
            No references yet. Add logos, sketches, packaging, receipts, or PDFs when you create or
            edit a project.
          </p>
        ) : (
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {(references ?? []).map((ref) => (
              <li key={ref.id} className="rounded-xl border border-black/8 bg-white/50 px-4 py-3 text-sm">
                <Link href={`/projects/${ref.project_id}`} className="font-medium hover:underline">
                  {ref.original_filename}
                </Link>
                <p className="text-xs text-black/55">{ref.mime_type}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-10 panel rounded-2xl p-5" aria-labelledby="account-heading">
        <h2 id="account-heading" className="text-lg">
          Account
        </h2>
        <p className="mt-1 text-sm text-black/60">
          Signed in as <span className="font-medium text-black/80">{user.email}</span>
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/brand-kits" className="btn btn-secondary">
            Open Brand Kits
          </Link>
          <form action="/auth/signout" method="post">
            <button className="btn btn-secondary" type="submit">
              Sign out
            </button>
          </form>
        </div>
      </section>
    </AppShell>
  );
}
