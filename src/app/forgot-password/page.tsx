"use client";

import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { FormEvent, useState } from "react";

export default function ForgotPasswordPage() {
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setInfo(null);
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "");
    const supabase = createClient();
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
      });
      if (resetError) {
        setError(resetError.message);
        return;
      }
      setInfo("If an account exists for that email, a reset link is on the way.");
    } catch {
      setError("Could not send a reset email. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10">
      <div className="panel animate-rise rounded-3xl p-8 shadow-sm">
        <Link href="/" className="brand text-3xl text-[var(--forest-deep)]">
          ALEYA
        </Link>
        <h1 className="mt-2 text-xl">Reset your password</h1>
        <p className="mt-2 text-sm text-black/60">
          Enter your account email and we&apos;ll send a secure reset link.
        </p>
        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <label className="field">
            <span>Email</span>
            <input name="email" type="email" autoComplete="email" required />
          </label>
          {error ? (
            <p className="text-sm text-[var(--danger)]" role="alert">
              {error}
            </p>
          ) : null}
          {info ? (
            <p className="text-sm text-[var(--forest-deep)]" role="status">
              {info}
            </p>
          ) : null}
          <button className="btn btn-primary w-full" disabled={loading} type="submit">
            {loading ? "Sending…" : "Send reset link"}
          </button>
        </form>
        <p className="mt-4 text-sm text-black/60">
          <Link href="/login">Back to sign in</Link>
        </p>
      </div>
    </div>
  );
}
