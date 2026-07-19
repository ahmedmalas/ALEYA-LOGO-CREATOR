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

  const { data: projects } = await supabase
    .from("logo_projects")
    .select("*")
    .eq("owner_id", user.id)
    .order("updated_at", { ascending: false });

  const isEmpty = (projects ?? []).length === 0;

  return (
    <AppShell email={user.email}>
      {isEmpty ? <FirstRunOnboarding /> : null}

      <div className="mb-6 flex flex-wrap items-end justify-between gap-4 animate-rise">
        <div>
          <h1 className="text-3xl">{isEmpty ? "Welcome" : "Your logo projects"}</h1>
          <p className="mt-1 text-black/60">
            {isEmpty
              ? "Start with a brief, then generate and refine concepts."
              : "Create, generate, compare, and save Brand Kits."}
          </p>
        </div>
        {!isEmpty ? (
          <Link href="/projects/new" className="btn btn-primary">
            New project
          </Link>
        ) : null}
      </div>

      {isEmpty ? null : (
        <div className="grid gap-4 md:grid-cols-2">
          {(projects ?? []).map((project, index) => (
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
            </Link>
          ))}
        </div>
      )}
    </AppShell>
  );
}
