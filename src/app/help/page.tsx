import { AppShell } from "@/components/shell";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function HelpPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/help");

  return (
    <AppShell email={user.email}>
      <div className="mx-auto max-w-3xl space-y-8">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--forest)]">Help</p>
          <h1 className="mt-2 text-3xl">Using ALEYA Logo Creator</h1>
          <p className="mt-2 text-black/60">
            Short answers for the signed-in product. Support is documentation-first on Free.
          </p>
        </div>

        <section className="panel space-y-3 rounded-3xl p-6">
          <h2 className="text-xl">Create a logo</h2>
          <ol className="list-decimal space-y-2 pl-5 text-sm text-black/70">
            <li>
              Open <Link className="underline" href="/projects/new">Create New Logo</Link> and fill
              the brief.
            </li>
            <li>
              Upload real reference files (logos, sketches, packaging, receipts, PDFs). Notes alone
              are not enough.
            </li>
            <li>Generate concepts, refine favourites, then save a Brand Kit.</li>
          </ol>
        </section>

        <section className="panel space-y-3 rounded-3xl p-6">
          <h2 className="text-xl">Account & plan</h2>
          <ul className="list-disc space-y-2 pl-5 text-sm text-black/70">
            <li>
              <Link className="underline" href="/account/profile">
                Profile
              </Link>{" "}
              stores display name, organisation, and avatar.
            </li>
            <li>
              <Link className="underline" href="/account/plan">
                Plan & usage
              </Link>{" "}
              shows Free-plan generation and storage allowances.
            </li>
            <li>
              Paid Pro checkout is not connected yet — waitlist only. No fake upgrade success.
            </li>
          </ul>
        </section>

        <section className="panel space-y-3 rounded-3xl p-6">
          <h2 className="text-xl">References</h2>
          <p className="text-sm text-black/70">
            Manage uploads per project, or browse all of yours from{" "}
            <Link className="underline" href="/references">
              Uploaded References
            </Link>
            . Active references are used on the next generation.
          </p>
        </section>
      </div>
    </AppShell>
  );
}
