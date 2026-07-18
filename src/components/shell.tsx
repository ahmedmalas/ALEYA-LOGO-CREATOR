import Link from "next/link";

export function AppShell({
  children,
  email,
}: {
  children: React.ReactNode;
  email?: string | null;
}) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-6 md:px-8">
      <header className="mb-8 flex items-center justify-between gap-4 animate-rise">
        <Link href="/dashboard" className="brand text-2xl tracking-tight text-[var(--forest-deep)]">
          ALEYA
          <span className="ml-2 text-base font-normal tracking-normal text-black/55">Logo Creator</span>
        </Link>
        <nav className="flex items-center gap-3 text-sm">
          <Link href="/dashboard" className="hover:text-[var(--forest)]">
            Projects
          </Link>
          <Link href="/brand-kits" className="hover:text-[var(--forest)]">
            Brand Kits
          </Link>
          <Link href="/gallery" className="hidden hover:text-[var(--forest)] sm:inline">
            Gallery
          </Link>
          <Link href="/pricing" className="hidden hover:text-[var(--forest)] md:inline">
            Pricing
          </Link>
          {email ? <span className="hidden text-black/45 md:inline">{email}</span> : null}
          <form action="/auth/signout" method="post">
            <button className="btn btn-secondary px-3 py-2 text-xs" type="submit">
              Sign out
            </button>
          </form>
        </nav>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
