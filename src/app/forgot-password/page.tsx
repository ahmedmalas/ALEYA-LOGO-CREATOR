"use client";

import { useEmailActionCooldown } from "@/hooks/use-email-action-cooldown";
import {
  getCooldownRemainingMs,
  isAuthEmailRateLimitError,
  mapAuthEmailError,
} from "@/lib/auth/email-action-guard";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { FormEvent, useState } from "react";

const GENERIC_RESET_INFO =
  "If an account exists for that email, a reset link is on the way. Check your inbox and spam folder.";

export default function ForgotPasswordPage() {
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const cooldown = useEmailActionCooldown("forgot_password", email);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setInfo(null);

    const form = new FormData(event.currentTarget);
    const nextEmail = String(form.get("email") ?? "");
    setEmail(nextEmail);

    const remainingMs = getCooldownRemainingMs("forgot_password", nextEmail);
    if (remainingMs > 0) {
      setError(
        mapAuthEmailError("email rate limit exceeded", {
          remainingSeconds: Math.ceil(remainingMs / 1000),
        }),
      );
      return;
    }

    setLoading(true);
    const supabase = createClient();
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(nextEmail, {
        redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
      });

      // Always start the cooldown after an attempt so repeated clicks are blocked.
      cooldown.markSent(nextEmail);

      if (resetError) {
        if (isAuthEmailRateLimitError(resetError.message)) {
          setError(
            mapAuthEmailError(resetError.message, {
              remainingSeconds: Math.max(
                Math.ceil(getCooldownRemainingMs("forgot_password", nextEmail) / 1000),
                60,
              ),
            }),
          );
          setInfo(null);
          return;
        }
        // Do not reveal whether the address has an account (or other provider details).
        setInfo(GENERIC_RESET_INFO);
        return;
      }

      setInfo(GENERIC_RESET_INFO);
    } catch {
      setError("Could not send a reset email. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  const blocked = loading || cooldown.active;

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
            <input
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
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
          {cooldown.active && !error ? (
            <p className="text-sm text-black/60" role="status">
              {cooldown.message}
            </p>
          ) : null}
          <button className="btn btn-primary w-full" disabled={blocked} type="submit">
            {loading
              ? "Sending…"
              : cooldown.active
                ? `Wait ${cooldown.remainingSeconds}s`
                : "Send reset link"}
          </button>
        </form>
        <p className="mt-4 text-sm text-black/60">
          <Link href="/login">Back to sign in</Link>
        </p>
      </div>
    </div>
  );
}
