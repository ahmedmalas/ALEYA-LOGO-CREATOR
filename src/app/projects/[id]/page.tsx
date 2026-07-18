import { AppShell } from "@/components/shell";
import { ProjectStudio } from "@/components/generator/project-studio";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

type Props = { params: Promise<{ id: string }> };

export default async function ProjectPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: project } = await supabase
    .from("logo_projects")
    .select("*")
    .eq("id", id)
    .eq("owner_id", user.id)
    .single();

  if (!project) redirect("/dashboard");

  const { data: concepts } = await supabase
    .from("logo_concepts")
    .select("*")
    .eq("project_id", id)
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <AppShell email={user.email}>
      <ProjectStudio project={project} initialConcepts={concepts ?? []} />
    </AppShell>
  );
}
