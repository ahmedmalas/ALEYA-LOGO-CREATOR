"use client";

import { PasswordField } from "@/components/auth/password-field";
import { createClient } from "@/lib/supabase/client";
import { safeInternalPath } from "@/lib/security/safe-path";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const callbackError = params.get("error");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");
    const supabase = createClient();
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        setError(
          signInError.message.toLowerCase().includes("invalid")
            ? "Email or password is incorrect."
            : signInError.message,
        );
        return;
      }
      router.push(safeInternalPath(params.get("next")));
      router.refresh();
    } catch {
      setError("Could not reach authentication. Check your connection and try again.");
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
        <h1 className="mt-2 text-xl">Sign in to Logo Creator</h1>
        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <label className="field">
            <span>Email</span>
            <input name="email" type="email" autoComplete="email" required />
          </label>
          <PasswordField name="password" label="Password" autoComplete="current-password" />
          {callbackError || error ? (
            <p className="text-sm text-[var(--danger)]" role="alert">
              {error ??
                (callbackError === "auth_callback_failed"
                  ? "Sign-in link expired or was invalid. Please try again."
                  : "Could not complete sign-in.")}
            </p>
          ) : null}
          <button className="btn btn-primary w-full" disabled={loading} type="submit">
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <p className="mt-4 text-sm text-black/60">
          <Link href="/forgot-password" className="underline-offset-2 hover:underline">
            Forgot password?
          </Link>
        </p>
        <p className="mt-2 text-sm text-black/60">
          No account? <Link href="/signup">Create one</Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-black/60">Loading sign-in…</div>}>
      <LoginForm />
    </Suspense>
  );
}
