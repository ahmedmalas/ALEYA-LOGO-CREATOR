"use client";

import { BrandHomeLink } from "@/components/brand-home-link";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/projects/new", label: "Create New Logo", cta: true },
  { href: "/dashboard#projects", label: "My Projects" },
  { href: "/brand-kits", label: "Brand Kits" },
  { href: "/references", label: "Uploaded References" },
  { href: "/account/plan", label: "Plan" },
  { href: "/account/profile", label: "Profile" },
  { href: "/account/security", label: "Account Settings" },
  { href: "/help", label: "Help" },
];

export function AppShell({
  children,
  email,
}: {
  children: React.ReactNode;
  email?: string | null;
}) {
  const pathname = usePathname() ?? "";
  const [open, setOpen] = useState(false);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-6 md:px-8">
      <header className="mb-8 animate-rise" data-testid="app-shell-header">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <BrandHomeLink
            initialSignedIn
            className="brand text-2xl tracking-tight text-[var(--forest-deep)]"
          >
            ALEYA
            <span className="ml-2 text-base font-normal tracking-normal text-black/55">
              Logo Creator
            </span>
          </BrandHomeLink>
          <div className="flex items-center gap-2">
            {email ? (
              <span className="hidden max-w-[12rem] truncate text-sm text-black/55 md:inline" title={email}>
                {email}
              </span>
            ) : null}
            <button
              type="button"
              className="btn btn-secondary min-h-10 px-3 py-2 text-sm md:hidden"
              aria-expanded={open}
              aria-controls="app-nav"
              onClick={() => setOpen((value) => !value)}
            >
              {open ? "Close" : "Menu"}
            </button>
            <form action="/auth/signout" method="post" className="hidden md:block">
              <button className="btn btn-secondary min-h-10 px-4 py-2 text-sm" type="submit">
                Sign out
              </button>
            </form>
          </div>
        </div>
        <nav
          id="app-nav"
          className={`${open ? "mt-4 flex" : "hidden"} flex-col gap-1 text-sm md:mt-4 md:flex md:flex-row md:flex-wrap md:items-center md:gap-x-3 md:gap-y-2`}
          aria-label="App"
          data-testid="app-primary-nav"
        >
          {NAV.map((item) => {
            const active =
              item.href === pathname ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href.split("#")[0]));
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`min-h-10 inline-flex items-center rounded-lg px-2 ${
                  active ? "bg-[rgba(31,77,69,0.1)] text-[var(--forest-deep)]" : "hover:text-[var(--forest)]"
                }`}
                data-cta-label={item.cta ? item.label : undefined}
                onClick={() => setOpen(false)}
              >
                {item.label}
              </Link>
            );
          })}
          <Link
            href="/pricing"
            className="min-h-10 inline-flex items-center px-2 hover:text-[var(--forest)]"
            onClick={() => setOpen(false)}
          >
            Pricing
          </Link>
          <form action="/auth/signout" method="post" className="md:hidden">
            <button className="btn btn-secondary mt-2 min-h-10 w-full px-4 py-2 text-sm" type="submit">
              Sign out
            </button>
          </form>
        </nav>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
