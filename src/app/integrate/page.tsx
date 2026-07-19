"use client";

import { verifyClientLaunchParams } from "@/lib/integration/client-launch";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

function IntegrateInner() {
  const params = useSearchParams();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const payload = {
      return_url: params.get("return_url") ?? "",
      business_id: params.get("business_id") ?? "",
      workspace_id: params.get("workspace_id") ?? "",
      state: params.get("state") ?? "",
      exp: params.get("exp") ?? "",
      sig: params.get("sig") ?? "",
    };

    let cancelled = false;

    async function run() {
      if (!verifyClientLaunchParams(payload)) {
        if (!cancelled) setError("Missing integration parameters");
        return;
      }

      try {
        const res = await fetch("/api/integrate/validate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          if (!cancelled) setError(json.error ?? "Invalid integration link");
          return;
        }
        const qs = new URLSearchParams({
          business_id: payload.business_id,
          return_url: payload.return_url,
          state: payload.state,
        });
        router.replace(`/projects/new?${qs.toString()}`);
      } catch {
        if (!cancelled) setError("Could not validate integration link. Check your connection.");
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [params, router]);

  return (
    <div className="mx-auto flex min-h-screen max-w-lg items-center px-4">
      <div className="panel w-full rounded-3xl p-8">
        <Link href="/" className="brand text-3xl text-[var(--forest-deep)]">
          ALEYA
        </Link>
        <h1 className="mt-2 text-xl">Opening Logo Creator…</h1>
        {error ? (
          <div className="mt-4 space-y-3">
            <p className="text-[var(--danger)]" role="alert">
              {error}
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/login" className="btn btn-primary">
                Sign in
              </Link>
              <Link href="/" className="btn btn-secondary">
                Go home
              </Link>
            </div>
          </div>
        ) : (
          <p className="mt-4 animate-pulse-soft text-black/60" role="status">
            Validating secure handoff from Aleya Invoicing.
          </p>
        )}
      </div>
    </div>
  );
}

export default function IntegratePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-black/60">Opening Logo Creator…</div>}>
      <IntegrateInner />
    </Suspense>
  );
}
