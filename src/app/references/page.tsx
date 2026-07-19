import { AppShell } from "@/components/shell";
import { createSignedReferenceUrls, type ProjectReferenceRow } from "@/lib/references/service";
import { formatBytes } from "@/lib/references/limits";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function ReferencesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/references");

  const { data: rows } = await supabase
    .from("project_references")
    .select("*")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  const references = (rows ?? []) as ProjectReferenceRow[];
  const urls = await createSignedReferenceUrls(supabase, references);

  const { data: usageLinks } = await supabase
    .from("generation_references")
    .select("reference_id")
    .eq("owner_id", user.id);
  const usedIds = new Set((usageLinks ?? []).map((row) => row.reference_id));

  return (
    <AppShell email={user.email}>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl">Uploaded References</h1>
          <p className="mt-1 text-black/60">
            Real files attached to your projects. Notes are optional — uploads are required.
          </p>
        </div>
        <Link href="/projects/new" className="btn btn-primary">
          Create New Logo
        </Link>
      </div>

      {references.length === 0 ? (
        <div className="panel rounded-3xl p-8 text-center">
          <p className="text-black/70">No reference files yet.</p>
          <p className="mt-2 text-sm text-black/55">
            Upload logos, sketches, packaging photos, screenshots, inspiration, receipts, or PDFs
            when creating or editing a project.
          </p>
          <Link href="/projects/new" className="btn btn-secondary mt-6 inline-flex">
            Start a project
          </Link>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2" data-testid="references-library">
          {references.map((ref) => {
            const preview = urls[ref.id]?.previewUrl;
            const used = usedIds.has(ref.id);
            return (
              <li key={ref.id} className="panel rounded-2xl p-4">
                <div className="flex gap-3">
                  {preview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={preview} alt="" className="h-16 w-16 rounded-lg object-cover" />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-black/5 text-xs uppercase">
                      {ref.mime_type.includes("pdf") ? "PDF" : "FILE"}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{ref.title || ref.original_filename}</p>
                    <p className="text-xs text-black/55">
                      {ref.kind} · {formatBytes(ref.size_bytes)} ·{" "}
                      {ref.is_active ? "Active" : "Inactive"}
                    </p>
                    {ref.note ? (
                      <p className="mt-1 line-clamp-2 text-sm text-black/60">{ref.note}</p>
                    ) : null}
                    {used ? (
                      <p className="mt-2 text-xs font-medium text-[var(--forest)]">
                        Used in a generation
                      </p>
                    ) : null}
                    <Link
                      href={`/projects/${ref.project_id}`}
                      className="mt-2 inline-flex text-sm text-[var(--forest)] hover:underline"
                    >
                      Open project →
                    </Link>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </AppShell>
  );
}
