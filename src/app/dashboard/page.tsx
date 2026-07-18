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

  return (
    <AppShell email={user.email}>
      <div className="mb-6 flex items-end justify-between gap-4 animate-rise">
        <div>
          <h1 className="text-3xl">Your logo projects</h1>
          <p className="mt-1 text-black/60">Create, generate, compare, and save Brand Kits.</p>
        </div>
        <Link href="/projects/new" className="btn btn-primary">
          New project
        </Link>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {(projects ?? []).map((project, index) => (
          <Link
            key={project.id}
            href={`/projects/${project.id}`}
            className="panel animate-rise rounded-2xl p-5 transition hover:-translate-y-0.5"
            style={{ animationDelay: `${index * 60}ms` }}
          >
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl">{project.business_name}</h2>
              <span className="rounded-full bg-[var(--mist)] px-3 py-1 text-xs uppercase tracking-wide">
                {project.status}
              </span>
            </div>
            <p className="mt-2 text-sm text-black/60">
              {project.style} · {project.industry}
              {project.tagline ? ` · ${project.tagline}` : ""}
            </p>
          </Link>
        ))}
        {(projects ?? []).length === 0 ? (
          <div className="panel rounded-2xl p-8 md:col-span-2">
            <p>No projects yet. Start with your business name and brand direction.</p>
            <Link href="/projects/new" className="btn btn-primary mt-4">
              Create first project
            </Link>
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}
