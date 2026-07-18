import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-black/8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10 md:flex-row md:items-end md:justify-between md:px-8">
        <div>
          <p className="brand text-2xl text-[var(--forest-deep)]">ALEYA</p>
          <p className="mt-2 max-w-sm text-sm text-black/55">
            Standalone logo creation for brands that need editable exports and reusable Brand Kits.
          </p>
        </div>
        <nav className="flex flex-wrap gap-4 text-sm text-black/65" aria-label="Footer">
          <Link href="/gallery">Gallery</Link>
          <Link href="/pricing">Pricing</Link>
          <Link href="/signup">Get Started</Link>
          <Link href="/login">Sign In</Link>
        </nav>
      </div>
      <div className="border-t border-black/6 py-4 text-center text-xs text-black/40">
        © {new Date().getFullYear()} ALEYA Logo Creator · v1.0
      </div>
    </footer>
  );
}
