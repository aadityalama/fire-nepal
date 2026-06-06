"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { DataResetConfirmModal } from "@/components/fire-nepal/DataResetConfirmModal";
import { performGlobalFireNepalWorkspaceDataReset } from "@/lib/fire-nepal/workspace-data-reset";

export function FireSettingsPage() {
  const [digest, setDigest] = useState(false);
  const [alerts, setAlerts] = useState(true);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetBusy, setResetBusy] = useState(false);

  const runGlobalReset = () => {
    setResetBusy(true);
    try {
      performGlobalFireNepalWorkspaceDataReset();
      toast.success("FIRE Nepal workspace data was reset.");
      setResetOpen(false);
    } finally {
      setResetBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-black text-white sm:text-3xl">Settings</h1>
        <p className="mt-2 text-sm text-emerald-100/55">Workspace preferences — local until cloud sync ships.</p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-[#04140f]/80 p-6 backdrop-blur-xl">
        <h2 className="text-xs font-black uppercase tracking-[0.14em] text-emerald-300/70">Notifications</h2>
        <label className="mt-5 flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-white/10 bg-black/30 px-4 py-4">
          <div>
            <p className="text-sm font-bold text-white">Weekly digest</p>
            <p className="text-xs text-zinc-500">Summary of portfolio & FIRE progress (email TBD).</p>
          </div>
          <input
            type="checkbox"
            checked={digest}
            onChange={(e) => setDigest(e.target.checked)}
            className="h-5 w-5 rounded border-emerald-500/40 text-emerald-500"
          />
        </label>
        <label className="mt-3 flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-white/10 bg-black/30 px-4 py-4">
          <div>
            <p className="text-sm font-bold text-white">Market alerts</p>
            <p className="text-xs text-zinc-500">Volatility & rate-change hints for NPR/KRW/USD.</p>
          </div>
          <input
            type="checkbox"
            checked={alerts}
            onChange={(e) => setAlerts(e.target.checked)}
            className="h-5 w-5 rounded border-emerald-500/40 text-emerald-500"
          />
        </label>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl">
        <h2 className="text-xs font-black uppercase tracking-[0.14em] text-emerald-300/70">Data</h2>
        <p className="mt-3 text-sm text-zinc-400">
          Portfolio, cashflow, and profile JSON live in this browser. Use{" "}
          <Link href="/hub" className="font-bold text-emerald-300 hover:text-white">
            Product hub
          </Link>{" "}
          modules to export sheets when needed.
        </p>

        <div className="mt-6 rounded-xl border border-rose-500/20 bg-rose-500/5 p-4">
          <p className="text-sm font-bold text-white">Reset all FIRE Nepal data</p>
          <p className="mt-2 text-xs font-semibold leading-relaxed text-zinc-400">
            Clears locally stored workspace data: portfolio, cashflow, shared expense workspace, payslip import history,
            SSF pension calculator inputs (reminder toggles preserved), Korea pension / severance slips (enrollment
            profile fields preserved), return-to-Nepal planner, financial intelligence rollups, and smart reminder rows
            (reminder notification settings preserved). Does not change sign-in, membership, premium profile, theme, or
            cloud-side data — the next sync may restore data from the cloud.
          </p>
          <button
            type="button"
            onClick={() => setResetOpen(true)}
            className="mt-4 inline-flex items-center gap-2 rounded-full border border-rose-500/40 bg-rose-600/20 px-4 py-2 text-xs font-black text-rose-100 transition hover:bg-rose-600/35"
          >
            Reset all FIRE Nepal data
          </button>
        </div>
      </div>

      <DataResetConfirmModal
        open={resetOpen}
        title="Reset all FIRE Nepal data?"
        body="This clears locally stored workspace data in this browser. Reminder notification preferences and SSF reminder toggles are kept. Authentication, account, premium profile, subscriptions, and cloud-hosted records are not modified here — a later cloud sync can repopulate this device."
        confirmLabel="Reset everything"
        busy={resetBusy}
        onCancel={() => !resetBusy && setResetOpen(false)}
        onConfirm={runGlobalReset}
      />
    </div>
  );
}
