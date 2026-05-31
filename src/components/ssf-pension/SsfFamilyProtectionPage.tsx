"use client";

import { Users } from "lucide-react";
import { SSF_NOMINEES } from "@/lib/ssf-pension/demo-data";
import { PensionChrome } from "@/components/pension/PensionChrome";
import { formatMoney } from "@/lib/expense-utils";

export function SsfFamilyProtectionPage() {
  return (
    <PensionChrome
      title="Family Protection"
      subtitle="Nominee split, emergency support estimates, and dependent overview — keep insurance continuity aligned with Family Hub records."
    >
      <div className="grid gap-4 lg:grid-cols-3">
        <section className="wealth-glass p-4 sm:p-5 lg:col-span-2">
          <div className="mb-3 flex items-center gap-2">
            <Users size={18} className="text-teal-600 dark:text-teal-300" />
            <h2 className="text-lg font-black text-slate-900 dark:text-white">Nominee management</h2>
          </div>
          <ul className="flex flex-col gap-2">
            {SSF_NOMINEES.map((n) => (
              <li
                key={n.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200/80 px-3 py-3 dark:border-white/10"
              >
                <div>
                  <p className="text-sm font-black text-slate-900 dark:text-white">{n.name}</p>
                  <p className="text-xs font-semibold text-slate-600 dark:text-zinc-400">{n.relation}</p>
                </div>
                <span className="rounded-full border border-teal-500/30 bg-teal-500/10 px-3 py-1 text-xs font-black text-teal-900 dark:text-teal-100">
                  {n.sharePct}% share
                </span>
              </li>
            ))}
          </ul>
        </section>
        <section className="wealth-glass space-y-3 p-4 sm:p-5">
          <h2 className="text-sm font-black uppercase tracking-[0.14em] text-slate-500 dark:text-zinc-400">Status</h2>
          <p className="text-sm font-semibold text-slate-700 dark:text-zinc-300">Family protection active while contributions are current.</p>
          <p className="text-sm font-semibold text-slate-700 dark:text-zinc-300">
            Emergency support estimate (6-mo runway): {formatMoney(640_000, "NPR")}
          </p>
          <p className="text-sm font-semibold text-slate-700 dark:text-zinc-300">Dependents on file: 2 linked from Family Hub (demo).</p>
        </section>
      </div>
    </PensionChrome>
  );
}
