import Link from "next/link";

export function SiteHeader({ solid = false }: { solid?: boolean }) {
  return (
    <header
      className={`sticky top-0 z-40 border-b ${
        solid
          ? "border-black/8 bg-[rgba(247,243,234,0.92)] backdrop-blur-md"
          : "border-transparent bg-transparent"
      }`}
    >
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-4 md:px-8">
        <Link href="/" className="brand text-2xl tracking-tight text-[var(--forest-deep)]">
          ALEYA
          <span className="ml-2 text-sm font-normal tracking-normal text-black/50">Logo Creator</span>
        </Link>
        <nav className="flex items-center gap-2 text-sm md:gap-4" aria-label="Primary">
          <Link href="/gallery" className="hidden hover:text-[var(--forest)] sm:inline">
            Gallery
          </Link>
          <Link href="/pricing" className="hidden hover:text-[var(--forest)] sm:inline">
            Pricing
          </Link>
          <Link href="/login" className="btn btn-secondary px-3 py-2 text-xs md:px-4">
            Sign In
          </Link>
          <Link href="/signup" className="btn btn-primary px-3 py-2 text-xs md:px-4">
            Get Started
          </Link>
        </nav>
      </div>
    </header>
  );
}
