import { BrandKitEditor } from "@/components/brand-kit/brand-kit-editor";
import { AppShell } from "@/components/shell";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

type Props = { params: Promise<{ id: string }> };

export default async function BrandKitPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: kit } = await supabase
    .from("brand_kits")
    .select("*")
    .eq("id", id)
    .eq("owner_id", user.id)
    .single();

  if (!kit) redirect("/brand-kits");

  const { data: concept } = await supabase
    .from("logo_concepts")
    .select("svg_markup")
    .eq("id", kit.concept_id)
    .eq("owner_id", user.id)
    .maybeSingle();

  return (
    <AppShell email={user.email}>
      <BrandKitEditor kit={kit} svgMarkup={concept?.svg_markup} />
    </AppShell>
  );
}
