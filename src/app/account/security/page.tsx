"use client";

import { FormEvent, useState } from "react";

export default function AccountSecurityPage() {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function post(body: Record<string, unknown>) {
    setBusy(String(body.action));
    setError(null);
    setMessage(null);
    const res = await fetch("/api/account/security", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) {
      setError(json.error ?? "Request failed");
      return;
    }
    setMessage(json.message ?? "Done.");
    if (body.action === "delete_account") {
      window.location.href = "/";
    }
  }

  async function onChangePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    const confirm = String(form.get("confirm") ?? "");
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    await post({ action: "change_password", password });
  }

  return (
    <div className="space-y-6">
      <form className="panel space-y-4 rounded-3xl p-6" onSubmit={onChangePassword}>
        <h2 className="text-xl">Change password</h2>
        <label className="field">
          <span>New password</span>
          <input name="password" type="password" minLength={8} required autoComplete="new-password" />
        </label>
        <label className="field">
          <span>Confirm password</span>
          <input name="confirm" type="password" minLength={8} required autoComplete="new-password" />
        </label>
        <button className="btn btn-primary" disabled={busy === "change_password"} type="submit">
          {busy === "change_password" ? "Updating…" : "Update password"}
        </button>
      </form>

      <section className="panel space-y-3 rounded-3xl p-6">
        <h2 className="text-xl">Password reset email</h2>
        <p className="text-sm text-black/60">
          Sends a reset link to your account email using Supabase Auth email delivery.
        </p>
        <button
          type="button"
          className="btn btn-secondary"
          disabled={busy === "request_reset_email"}
          onClick={() => void post({ action: "request_reset_email" })}
        >
          Request reset email
        </button>
      </section>

      <section className="panel space-y-3 rounded-3xl p-6">
        <h2 className="text-xl">Sessions</h2>
        <p className="text-sm text-black/60">
          This browser session is active. “Sign out of all sessions” uses Supabase global sign-out
          when supported by the client.
        </p>
        <div className="flex flex-wrap gap-3">
          <form action="/auth/signout" method="post">
            <button className="btn btn-secondary" type="submit">
              Sign out
            </button>
          </form>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={async () => {
              const { createClient } = await import("@/lib/supabase/client");
              await createClient().auth.signOut({ scope: "global" });
              window.location.href = "/login";
            }}
          >
            Sign out of all sessions
          </button>
        </div>
      </section>

      <section className="panel space-y-3 rounded-3xl border border-red-200 p-6">
        <h2 className="text-xl text-[var(--danger)]">Delete account</h2>
        <p className="text-sm text-black/60">
          Marks the account canceled, signs out all sessions, and stops normal use. Hard deletion of
          the auth user requires a privileged admin job and is not performed from the browser.
        </p>
        <button
          type="button"
          className="btn btn-secondary"
          disabled={busy === "delete_account"}
          onClick={() => {
            if (window.confirm("Type DELETE in the next prompt to confirm account cancellation.")) {
              const value = window.prompt('Type DELETE to confirm');
              if (value === "DELETE") void post({ action: "delete_account", confirm: "DELETE" });
            }
          }}
        >
          Cancel / delete account
        </button>
      </section>

      {error ? (
        <p className="text-sm text-[var(--danger)]" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="text-sm text-[var(--forest-deep)]" role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}
