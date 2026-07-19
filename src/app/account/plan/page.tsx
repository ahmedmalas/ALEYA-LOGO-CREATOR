"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { formatBytesLabel, type PlanDefinition } from "@/lib/plans/catalog";
import type { UsageSnapshot } from "@/lib/plans/usage";

type PlanPayload = {
  usage?: UsageSnapshot;
  plan?: PlanDefinition;
  billing?: { connected: boolean; status: string };
};

function AccountPlanInner() {
  const searchParams = useSearchParams();
  const [data, setData] = useState<PlanPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const res = await fetch("/api/account/plan");
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(json.error ?? "Could not load plan");
      return;
    }
    setData(json);
  }

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (searchParams.get("waitlist") === "pro" && data?.usage?.planStatus !== "waitlist") {
      setMessage("Pro checkout is unavailable. Use Join Pro waitlist below — no payment is taken.");
    }
  }, [searchParams, data?.usage?.planStatus]);

  async function joinWaitlist() {
    setBusy(true);
    setError(null);
    setMessage(null);
    const res = await fetch("/api/account/plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "join_pro_waitlist" }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(json.error ?? "Could not join waitlist");
      return;
    }
    setMessage(json.message);
    await load();
  }

  if (!data?.usage || !data.plan) {
    return <p className="text-black/60">{error ?? "Loading plan…"}</p>;
  }

  const { usage, plan, billing } = data;

  return (
    <div className="space-y-6" data-testid="account-plan">
      <section className="panel space-y-3 rounded-3xl p-6">
        <p className="text-xs uppercase tracking-[0.18em] text-[var(--forest)]">Current plan</p>
        <h2 className="text-2xl">
          {plan.name}{" "}
          <span className="text-base font-normal text-black/55">({usage.planStatus})</span>
        </h2>
        <p className="text-sm text-black/60">
          {plan.priceLabel} {plan.billingPeriodLabel}
        </p>
        <p className="text-sm text-black/60">{plan.description}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl bg-[rgba(31,77,69,0.06)] p-4 text-sm">
            <p className="font-medium">Generations (last hour)</p>
            <p className="mt-1 text-2xl text-[var(--forest-deep)]">
              {usage.generationsUsedHour} / {usage.generationsPerHour}
            </p>
            <p className="mt-1 text-black/55">{usage.generationsRemainingHour} remaining</p>
          </div>
          <div className="rounded-2xl bg-[rgba(31,77,69,0.06)] p-4 text-sm">
            <p className="font-medium">Reference storage</p>
            <p className="mt-1 text-2xl text-[var(--forest-deep)]">{usage.referenceCount} files</p>
            <p className="mt-1 text-black/55">{usage.referenceBytesLabel}</p>
          </div>
          <div className="rounded-2xl bg-[rgba(31,77,69,0.06)] p-4 text-sm">
            <p className="font-medium">Refinements (last hour)</p>
            <p className="mt-1">{usage.refinementsUsedHour}</p>
          </div>
          <div className="rounded-2xl bg-[rgba(31,77,69,0.06)] p-4 text-sm">
            <p className="font-medium">Exports</p>
            <p className="mt-1">{usage.exportAllowanceLabel}</p>
            <p className="mt-1 text-black/55">{usage.exportsUsedHour} recorded this hour</p>
          </div>
        </div>
        <ul className="mt-2 space-y-1 text-sm text-black/70">
          <li>Projects: {usage.projectCount}</li>
          <li>Brand Kits: {usage.brandKitCount}</li>
          <li>Export formats: {plan.exportFormats.join(", ")}</li>
          <li>
            Reference limits: {plan.referenceMaxFilesPerProject} / project ·{" "}
            {formatBytesLabel(plan.referenceMaxFileBytes)} / file
          </li>
          <li>Commercial use: {plan.commercialUse}</li>
          <li>Watermark: {plan.watermark}</li>
        </ul>
      </section>

      <section className="panel space-y-3 rounded-3xl p-6">
        <h2 className="text-xl">Billing</h2>
        <p className="text-sm text-black/60" data-testid="billing-status">
          {billing?.status ?? "Billing status unknown"}
        </p>
        {!billing?.connected ? (
          <>
            <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-950">
              Paid checkout is not connected. Joining the Pro waitlist does not charge a card and
              does not upgrade your generation limits.
            </p>
            {usage.planStatus === "waitlist" ? (
              <p className="text-sm text-[var(--forest-deep)]" role="status">
                You are already on the Pro waitlist.
              </p>
            ) : (
              <button
                type="button"
                className="btn btn-primary"
                disabled={busy}
                onClick={() => void joinWaitlist()}
              >
                {busy ? "Saving…" : "Join Pro waitlist"}
              </button>
            )}
          </>
        ) : (
          <p className="text-sm text-black/60">
            Billing keys detected — wire Stripe Checkout before claiming upgrades succeed.
          </p>
        )}
        <Link href="/pricing" className="btn btn-secondary inline-flex">
          Compare plans
        </Link>
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

export default function AccountPlanPage() {
  return (
    <Suspense fallback={<p className="text-black/60">Loading plan…</p>}>
      <AccountPlanInner />
    </Suspense>
  );
}
