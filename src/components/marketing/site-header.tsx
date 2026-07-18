import Link from "next/link";

export function SiteHeader({
  solid = false,
  tone = "light",
}: {
  solid?: boolean;
  tone?: "light" | "dark";
}) {
  const onDark = tone === "dark" && !solid;
  return (
    <header
      className={`sticky top-0 z-40 border-b ${
        solid
          ? "border-black/8 bg-[rgba(247,243,234,0.92)] backdrop-blur-md"
          : "border-transparent bg-transparent"
      }`}
    >
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-4 md:px-8">
        <Link
          href="/"
          className={`brand text-2xl tracking-tight ${
            onDark ? "text-[#f6f0e4]" : "text-[var(--forest-deep)]"
          }`}
        >
          ALEYA
          <span
            className={`ml-2 text-sm font-normal tracking-normal ${
              onDark ? "text-[#f6f0e4]/opacity-70" : "text-black/50"
            }`}
          >
            Logo Creator
          </span>
        </Link>
        <nav className="flex items-center gap-2 text-sm md:gap-4" aria-label="Primary">
          <Link
            href="/gallery"
            className={`hidden sm:inline ${onDark ? "text-[#f6f0e4]/hover:opacity-80" : "hover:text-[var(--forest)]"}`}
          >
            Gallery
          </Link>
          <Link
            href="/pricing"
            className={`hidden sm:inline ${onDark ? "text-[#f6f0e4]/hover:opacity-80" : "hover:text-[var(--forest)]"}`}
          >
            Pricing
          </Link>
          <Link
            href="/login"
            className={`btn px-3 py-2 text-xs md:px-4 ${
              onDark
                ? "btn-secondary border-[#f6f0e4] text-[#f6f0e4]"
                : "btn-secondary"
            }`}
          >
            Sign In
          </Link>
          <Link
            href="/signup"
            className={`btn px-3 py-2 text-xs md:px-4 ${
              onDark ? "bg-[#f6f0e4] text-[var(--forest-deep)]" : "btn-primary"
            }`}
          >
            Get Started
          </Link>
        </nav>
      </div>
    </header>
  );
}
