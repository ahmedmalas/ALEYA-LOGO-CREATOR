import { AppShell } from "@/components/shell";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function BrandKitsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: kits } = await supabase
    .from("brand_kits")
    .select("*")
    .eq("owner_id", user.id)
    .order("updated_at", { ascending: false });

  const isEmpty = (kits ?? []).length === 0;

  return (
    <AppShell email={user.email}>
      <h1 className="animate-rise text-3xl">Brand Kits</h1>
      <p className="mt-1 text-black/60">Reopen kits, edit metadata, and download export packs.</p>

      {isEmpty ? (
        <div className="panel mt-6 rounded-3xl p-8 md:p-10">
          <h2 className="text-xl">No Brand Kits yet</h2>
          <p className="mt-2 max-w-xl text-black/60">
            Brand Kits appear automatically when you select a final logo in a project. You’ll keep
            the mark, palette, typography, and prompt history in one place.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/dashboard" className="btn btn-primary">
              Go to projects
            </Link>
            <Link href="/gallery" className="btn btn-secondary">
              See example styles
            </Link>
          </div>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {(kits ?? []).map((kit, index) => (
            <Link
              key={kit.id}
              href={`/brand-kits/${kit.id}`}
              className="panel animate-rise rounded-2xl p-5"
              style={{ animationDelay: `${index * 60}ms` }}
            >
              <h2 className="text-xl">{kit.name}</h2>
              <p className="mt-2 text-sm text-black/60">
                {kit.business_name}
                {kit.tagline ? ` · ${kit.tagline}` : ""}
              </p>
              <div className="mt-3 flex gap-2">
                {(kit.primary_colors ?? []).map((color: string) => (
                  <span
                    key={color}
                    className="h-6 w-6 rounded-full border border-black/10"
                    style={{ background: color }}
                    title={color}
                  />
                ))}
              </div>
            </Link>
          ))}
        </div>
      )}
    </AppShell>
  );
}
