"use client";

import { PasswordField } from "@/components/auth/password-field";
import { BrandHomeLink } from "@/components/brand-home-link";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    let settled = false;
    void supabase.auth.getSession().then(({ data }) => {
      settled = true;
      setReady(Boolean(data.session));
      if (!data.session) {
        setError("Open the reset link from your email to continue.");
      }
    });
    // Wait for auth hydration (INITIAL_SESSION) before treating missing session as failure.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "INITIAL_SESSION" || event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        settled = true;
        setReady(Boolean(session));
        if (session) setError(null);
      }
    });
    const timeout = window.setTimeout(() => {
      if (!settled) {
        setReady(false);
        setError("Open the reset link from your email to continue.");
      }
    }, 2500);
    return () => {
      subscription.unsubscribe();
      window.clearTimeout(timeout);
    };
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    const confirm = String(form.get("confirm") ?? "");
    if (password !== confirm) {
      setError("Passwords do not match.");
      setLoading(false);
      return;
    }
    const supabase = createClient();
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(updateError.message);
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Could not update password. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10">
      <div className="panel animate-rise rounded-3xl p-8 shadow-sm">
        <BrandHomeLink className="brand text-3xl text-[var(--forest-deep)]">
          ALEYA
        </BrandHomeLink>
        <h1 className="mt-2 text-xl">Choose a new password</h1>
        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <PasswordField
            name="password"
            label="New password"
            autoComplete="new-password"
            minLength={8}
            helpText="At least 8 characters."
          />
          <PasswordField
            name="confirm"
            label="Confirm password"
            autoComplete="new-password"
            minLength={8}
          />
          {error ? (
            <p className="text-sm text-[var(--danger)]" role="alert">
              {error}
            </p>
          ) : null}
          <button className="btn btn-primary w-full" disabled={loading || !ready} type="submit">
            {loading ? "Updating…" : "Update password"}
          </button>
        </form>
        <p className="mt-4 text-sm text-black/60">
          <Link href="/login">Back to sign in</Link>
        </p>
      </div>
    </div>
  );
}
