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
  waitlist?: { active: boolean; joinedAt?: string };
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
    if (searchParams.get("waitlist") === "pro" && !data?.waitlist?.active) {
      setMessage("Pro checkout is unavailable. Use Join waitlist below — no payment is taken.");
    }
  }, [searchParams, data?.waitlist?.active]);

  async function postAction(action: "join_pro_waitlist" | "leave_pro_waitlist") {
    setBusy(true);
    setError(null);
    setMessage(null);
    const res = await fetch("/api/account/plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(json.error ?? "Could not update waitlist");
      return;
    }
    setMessage(json.message);
    await load();
  }

  if (!data?.usage || !data.plan) {
    return <p className="text-black/60">{error ?? "Loading plan…"}</p>;
  }

  const { usage, plan, billing, waitlist } = data;

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
            <p className="font-medium">Exports (last hour)</p>
            <p className="mt-1 text-2xl text-[var(--forest-deep)]">{usage.exportsUsedHour}</p>
            <p className="mt-1 text-black/55">{usage.exportAllowanceLabel}</p>
          </div>
          <div className="rounded-2xl bg-[rgba(31,77,69,0.06)] p-4 text-sm">
            <p className="font-medium">Reference storage</p>
            <p className="mt-1 text-2xl text-[var(--forest-deep)]">{usage.referenceCount} files</p>
            <p className="mt-1 text-black/55">{usage.referenceBytesLabel}</p>
          </div>
          <div className="rounded-2xl bg-[rgba(31,77,69,0.06)] p-4 text-sm">
            <p className="font-medium">Refinements (last hour)</p>
            <p className="mt-1">
              {usage.refinementsUsedHour} / {usage.refinementsPerHour}
            </p>
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

      <section className="panel space-y-3 rounded-3xl p-6" data-testid="waitlist-section">
        <h2 className="text-xl">Pro waitlist</h2>
        <p className="text-sm text-black/60" data-testid="billing-status">
          {billing?.status ?? "Billing status unknown"}
        </p>
        {!billing?.connected ? (
          <>
            <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-950">
              Paid checkout is not connected. Joining the waitlist does not charge a card and does
              not grant Pro limits.
            </p>
            {waitlist?.active ? (
              <div className="space-y-3" data-testid="waitlist-confirmed">
                <p className="text-sm text-[var(--forest-deep)]" role="status">
                  You are on the Pro waitlist
                  {waitlist.joinedAt
                    ? ` (joined ${new Date(waitlist.joinedAt).toLocaleString()})`
                    : ""}
                  . Your plan remains Free.
                </p>
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={busy}
                  onClick={() => void postAction("leave_pro_waitlist")}
                >
                  {busy ? "Saving…" : "Leave waitlist"}
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="btn btn-primary"
                disabled={busy}
                data-cta-label="Join waitlist"
                onClick={() => void postAction("join_pro_waitlist")}
              >
                {busy ? "Saving…" : "Join waitlist"}
              </button>
            )}
          </>
        ) : (
          <p className="text-sm text-black/60">
            Billing keys detected — wire real checkout before claiming a paid upgrade.
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
