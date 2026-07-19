import { AccountNav } from "@/components/account/account-nav";
import { AppShell } from "@/components/shell";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/account/profile");

  return (
    <AppShell email={user.email}>
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--forest)]">Account</p>
          <h1 className="mt-2 text-3xl">Profile & settings</h1>
          <p className="mt-1 text-black/60">
            Manage your profile, security, plan usage, and preferences. Billing checkout is only
            available when a payment provider is connected.
          </p>
        </div>
        <AccountNav />
        {children}
      </div>
    </AppShell>
  );
}
