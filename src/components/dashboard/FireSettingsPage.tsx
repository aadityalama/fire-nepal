"use client";

import Link from "next/link";
import { useState } from "react";

export function FireSettingsPage() {
  const [digest, setDigest] = useState(false);
  const [alerts, setAlerts] = useState(true);

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

        <div className="mt-6 rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-4">
          <p className="text-sm font-bold text-white">Permanent data preservation</p>
          <p className="mt-2 text-xs font-semibold leading-relaxed text-zinc-400">
            FIRE Nepal no longer offers global workspace reset controls. User-entered records stay in local storage or
            Supabase until you delete a specific record from its module. Cloud outages, refreshes, logouts, deployments,
            and migrations must preserve existing data and sync safely when storage becomes available again.
          </p>
        </div>
      </div>
    </div>
  );
}
