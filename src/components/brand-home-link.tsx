"use client";

import { brandHomePath } from "@/lib/auth/brand-home";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useEffect, useState } from "react";

type BrandHomeLinkProps = {
  className?: string;
  children: React.ReactNode;
  /** Server-known auth hint so the first paint uses the correct href. */
  initialSignedIn?: boolean;
};

/**
 * ALEYA brand control: signed-in → /dashboard, signed-out → /.
 * Uses the Next.js router (Link). Never signs out or clears auth storage.
 */
export function BrandHomeLink({
  className,
  children,
  initialSignedIn = false,
}: BrandHomeLinkProps) {
  const [signedIn, setSignedIn] = useState(initialSignedIn);

  useEffect(() => {
    const supabase = createClient();
    let mounted = true;

    void supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      // Prefer an existing session; do not treat a slow read as signed-out
      // when the server already told us the user is authenticated.
      if (data.session) {
        setSignedIn(true);
      } else if (!initialSignedIn) {
        setSignedIn(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (event === "SIGNED_OUT") {
        setSignedIn(false);
        return;
      }
      if (session) {
        setSignedIn(true);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [initialSignedIn]);

  const href = brandHomePath(signedIn);

  return (
    <Link
      href={href}
      className={className}
      data-testid="brand-home-link"
      data-brand-home={href}
      prefetch
    >
      {children}
    </Link>
  );
}
