"use client";

import { PasswordField } from "@/components/auth/password-field";
import { useEmailActionCooldown } from "@/hooks/use-email-action-cooldown";
import {
  getCooldownRemainingMs,
  isAuthEmailRateLimitError,
  mapAuthEmailError,
} from "@/lib/auth/email-action-guard";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";

function SignupForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [email, setEmail] = useState("");
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);
  const proWaitlist = params.get("plan") === "pro";

  const signupCooldown = useEmailActionCooldown("signup", email);
  const resendCooldown = useEmailActionCooldown("resend_confirmation", email);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setInfo(null);

    const form = new FormData(event.currentTarget);
    const nextEmail = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");
    setEmail(nextEmail);

    const remainingMs = getCooldownRemainingMs("signup", nextEmail);
    if (remainingMs > 0) {
      setError(mapAuthEmailError("email rate limit exceeded", {
        remainingSeconds: Math.ceil(remainingMs / 1000),
      }));
      return;
    }

    setLoading(true);
    const supabase = createClient();
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: nextEmail,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
        },
      });
      if (signUpError) {
        if (isAuthEmailRateLimitError(signUpError.message)) {
          signupCooldown.markSent(nextEmail);
        }
        const remainingSeconds = isAuthEmailRateLimitError(signUpError.message)
          ? Math.max(Math.ceil(getCooldownRemainingMs("signup", nextEmail) / 1000), 60)
          : undefined;
        setError(mapAuthEmailError(signUpError.message, { remainingSeconds }));
        return;
      }
      signupCooldown.markSent(nextEmail);
      if (!data.session) {
        setAwaitingConfirmation(true);
        setInfo("Check your email to confirm your account, then sign in.");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Could not create your account. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  async function onResendConfirmation() {
    setError(null);
    if (!email.trim()) {
      setError("Enter your email above, then request another confirmation email.");
      return;
    }
    const remainingMs = getCooldownRemainingMs("resend_confirmation", email);
    if (remainingMs > 0) {
      setError(
        mapAuthEmailError("email rate limit exceeded", {
          remainingSeconds: Math.ceil(remainingMs / 1000),
        }),
      );
      return;
    }

    setResending(true);
    const supabase = createClient();
    try {
      const { error: resendError } = await supabase.auth.resend({
        type: "signup",
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
        },
      });
      if (resendError) {
        const remainingSeconds = isAuthEmailRateLimitError(resendError.message)
          ? Math.max(Math.ceil(getCooldownRemainingMs("resend_confirmation", email) / 1000), 60)
          : undefined;
        if (isAuthEmailRateLimitError(resendError.message)) {
          resendCooldown.markSent();
        }
        setError(mapAuthEmailError(resendError.message, { remainingSeconds }));
        return;
      }
      resendCooldown.markSent();
      setInfo("Another confirmation email is on the way. Check your inbox and spam folder.");
    } catch {
      setError("Could not resend confirmation. Check your connection and try again.");
    } finally {
      setResending(false);
    }
  }

  const signupBlocked = loading || signupCooldown.active;
  const resendBlocked = resending || resendCooldown.active;

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10">
      <div className="panel animate-rise rounded-3xl p-8 shadow-sm">
        <Link href="/" className="brand text-3xl text-[var(--forest-deep)]">
          ALEYA
        </Link>
        <h1 className="mt-2 text-xl">Create your Logo Creator account</h1>
        {proWaitlist ? (
          <p className="mt-2 text-sm text-black/60" role="status">
            Pro is on the waitlist. Creating a Free account now keeps your projects ready when Pro
            launches.
          </p>
        ) : null}
        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <label className="field">
            <span>Email</span>
            <input
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          <PasswordField
            name="password"
            label="Password"
            autoComplete="new-password"
            minLength={8}
            helpText="At least 8 characters."
          />
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
          {signupCooldown.active ? (
            <p className="text-sm text-black/60" role="status">
              {signupCooldown.message}
            </p>
          ) : null}
          <button className="btn btn-primary w-full" disabled={signupBlocked} type="submit">
            {loading
              ? "Creating…"
              : signupCooldown.active
                ? `Wait ${signupCooldown.remainingSeconds}s`
                : "Create account"}
          </button>
        </form>
        {awaitingConfirmation ? (
          <div className="mt-4 space-y-2">
            {resendCooldown.active ? (
              <p className="text-sm text-black/60" role="status">
                {resendCooldown.message}
              </p>
            ) : null}
            <button
              type="button"
              className="btn w-full"
              disabled={resendBlocked}
              onClick={onResendConfirmation}
            >
              {resending
                ? "Sending…"
                : resendCooldown.active
                  ? `Resend available in ${resendCooldown.remainingSeconds}s`
                  : "Resend confirmation email"}
            </button>
          </div>
        ) : null}
        <p className="mt-4 text-sm text-black/60">
          Already registered? <Link href="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-black/60">Loading…</div>}>
      <SignupForm />
    </Suspense>
  );
}
