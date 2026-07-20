import { InvoiceStudio } from "@/components/invoice/invoice-studio";
import { SiteHeader } from "@/components/marketing/site-header";
import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Invoice templates · ALEYA",
  description:
    "Analyse invoices, recreate full pages as editable templates, and export packages for Aleya Invoicing.",
};

export default async function InvoicesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/invoices");

  return (
    <div className="min-h-screen bg-[var(--paper)]">
      <SiteHeader solid />
      <InvoiceStudio />
    </div>
  );
}
