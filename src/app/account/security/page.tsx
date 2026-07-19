"use client";

import { FormEvent, useEffect, useState } from "react";

export default function AccountSecurityPage() {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [hardDeleteAvailable, setHardDeleteAvailable] = useState(false);
  const [remainsStored, setRemainsStored] = useState<string[] | null>(null);

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/account/security");
      const json = await res.json().catch(() => ({}));
      if (res.ok) setHardDeleteAvailable(Boolean(json.hardDeleteAvailable));
    })();
  }, []);

  async function post(body: Record<string, unknown>) {
    setBusy(String(body.action));
    setError(null);
    setMessage(null);
    setRemainsStored(null);
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
    if (Array.isArray(json.remainsStored)) setRemainsStored(json.remainsStored);
    if (body.action === "deactivate_account" || body.action === "hard_delete_account") {
      window.setTimeout(() => {
        window.location.href = "/";
      }, 1800);
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

      <section className="panel space-y-3 rounded-3xl border border-amber-200 p-6" data-testid="deactivate-account">
        <h2 className="text-xl">Deactivate account</h2>
        <p className="text-sm text-black/60">
          Deactivation signs you out and blocks creative actions. It is <strong>not</strong> a
          permanent wipe. Your projects, references, Brand Kits, usage history, and Auth user remain
          stored until a secure hard-delete runs.
        </p>
        <button
          type="button"
          className="btn btn-secondary"
          disabled={busy === "deactivate_account"}
          onClick={() => {
            if (
              window.confirm(
                "Deactivate this account? You will be signed out. Data remains stored until hard-delete.",
              )
            ) {
              const value = window.prompt('Type DEACTIVATE to confirm');
              if (value === "DEACTIVATE") {
                void post({ action: "deactivate_account", confirm: "DEACTIVATE" });
              }
            }
          }}
        >
          Deactivate account
        </button>
      </section>

      <section className="panel space-y-3 rounded-3xl border border-red-200 p-6" data-testid="hard-delete-account">
        <h2 className="text-xl text-[var(--danger)]">Permanent deletion</h2>
        {hardDeleteAvailable ? (
          <>
            <p className="text-sm text-black/60">
              Hard delete removes storage objects, owned database rows, and the Supabase Auth user
              using a server-only service role. This cannot be undone.
            </p>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={busy === "hard_delete_account"}
              onClick={() => {
                if (
                  window.confirm(
                    "Permanently delete this account and all owned data? This cannot be undone.",
                  )
                ) {
                  const value = window.prompt('Type DELETE FOREVER to confirm');
                  if (value === "DELETE FOREVER") {
                    void post({
                      action: "hard_delete_account",
                      confirm: "DELETE FOREVER",
                      recentAuthConfirmed: true,
                    });
                  }
                }
              }}
            >
              Permanently delete account
            </button>
          </>
        ) : (
          <p className="text-sm text-black/60">
            Permanent hard-delete is unavailable because the server does not have
            SUPABASE_SERVICE_ROLE_KEY configured. Use Deactivate account for now.
          </p>
        )}
      </section>

      {error ? (
        <p className="text-sm text-[var(--danger)]" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="text-sm text-[var(--forest-deep)]" role="status" data-testid="security-status">
          {message}
        </p>
      ) : null}
      {remainsStored ? (
        <ul className="list-disc pl-5 text-sm text-black/60">
          {remainsStored.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
