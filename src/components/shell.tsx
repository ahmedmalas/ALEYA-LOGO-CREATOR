import { BrandHomeLink } from "@/components/brand-home-link";
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
      <header className="mb-8 flex flex-wrap items-center justify-between gap-3 animate-rise">
        <BrandHomeLink
          initialSignedIn
          className="brand text-2xl tracking-tight text-[var(--forest-deep)]"
        >
          ALEYA
          <span className="ml-2 text-base font-normal tracking-normal text-black/55">
            Logo Creator
          </span>
        </BrandHomeLink>
        <nav
          className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm"
          aria-label="App"
        >
          <Link href="/dashboard" className="min-h-10 inline-flex items-center hover:text-[var(--forest)]">
            Dashboard
          </Link>
          <Link
            href="/projects/new"
            className="min-h-10 inline-flex items-center hover:text-[var(--forest)]"
            data-cta-label="Create New Logo"
          >
            Create New Logo
          </Link>
          <Link
            href="/dashboard#projects"
            className="min-h-10 inline-flex items-center hover:text-[var(--forest)]"
          >
            My Projects
          </Link>
          <Link href="/brand-kits" className="min-h-10 inline-flex items-center hover:text-[var(--forest)]">
            Brand Kits
          </Link>
          <Link href="/gallery" className="min-h-10 inline-flex items-center hover:text-[var(--forest)]">
            Gallery
          </Link>
          <Link href="/pricing" className="min-h-10 inline-flex items-center hover:text-[var(--forest)]">
            Pricing
          </Link>
          {email ? (
            <span className="hidden max-w-[12rem] truncate text-black/55 md:inline" title={email}>
              {email}
            </span>
          ) : null}
          <form action="/auth/signout" method="post">
            <button className="btn btn-secondary min-h-10 px-4 py-2 text-sm" type="submit">
              Sign out
            </button>
          </form>
        </nav>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
