"use client";

import Link from "next/link";
import { Percent, Scale, Vault } from "lucide-react";
import { useFireTheme } from "@/contexts/FireThemeContext";
import { PensionChrome } from "@/components/pension/PensionChrome";
import { formatMoney } from "@/lib/expense-utils";
import { CIT_DEMO } from "@/lib/pension/epf-cit-demo";
import { PENSION_BASE } from "@/lib/pension/nav";

export function CitCenterPage() {
  const { resolvedTheme } = useFireTheme();
  const light = resolvedTheme === "light";
  const glass = light ? "ring-1 ring-slate-900/[0.04]" : "";

  return (
    <PensionChrome
      title="CIT Center"
      subtitle="Citizen Investment Trust and tax-advantaged retirement sleeves — lock-ins, scheme mix, and FY contribution headroom."
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <div className={`wealth-glass p-4 sm:p-5 ${glass}`}>
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-teal-700 dark:text-teal-300">Total CIT sleeves</p>
          <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{formatMoney(CIT_DEMO.totalUnitsNpr, "NPR")}</p>
          <p className="mt-1 text-[11px] font-semibold text-slate-500 dark:text-zinc-400">FY {CIT_DEMO.fyLabel}</p>
        </div>
        <div className={`wealth-glass p-4 sm:p-5 ${glass}`}>
          <div className="flex items-center gap-2 text-teal-700 dark:text-teal-300">
            <Percent size={16} />
            <p className="text-[10px] font-black uppercase tracking-[0.14em]">Annual ceiling</p>
          </div>
          <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{formatMoney(CIT_DEMO.annualCeilingNpr, "NPR")}</p>
          <p className="mt-1 text-[11px] font-semibold text-slate-500 dark:text-zinc-400">Tax-advantaged contribution room</p>
        </div>
        <div className={`wealth-glass p-4 sm:p-5 ${glass}`}>
          <div className="flex items-center gap-2 text-teal-700 dark:text-teal-300">
            <Scale size={16} />
            <p className="text-[10px] font-black uppercase tracking-[0.14em]">Tax alpha (FY)</p>
          </div>
          <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
            {formatMoney(CIT_DEMO.schemes.reduce((s, x) => s + x.taxSavedNpr, 0), "NPR")}
          </p>
          <p className="mt-1 text-[11px] font-semibold text-slate-500 dark:text-zinc-400">Illustrative savings vs ordinary sleeve</p>
        </div>
      </div>

      <section className={`wealth-glass p-4 sm:p-5 ${glass}`}>
        <div className="mb-4 flex items-center gap-2">
          <Vault size={18} className="text-teal-600 dark:text-teal-300" />
          <h2 className="text-lg font-black text-slate-900 dark:text-white">Schemes</h2>
        </div>
        <ul className="flex flex-col gap-3">
          {CIT_DEMO.schemes.map((s) => (
            <li
              key={s.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200/80 px-3 py-3 dark:border-white/10"
            >
              <div>
                <p className="text-sm font-black text-slate-900 dark:text-white">{s.name}</p>
                <p className="text-xs font-semibold text-slate-600 dark:text-zinc-400">
                  Lock {s.lockYears} yrs · Tax saved {formatMoney(s.taxSavedNpr, "NPR")}
                </p>
              </div>
              <span className="text-sm font-black text-teal-700 dark:text-teal-200">{formatMoney(s.balanceNpr, "NPR")}</span>
            </li>
          ))}
        </ul>
      </section>

      <div className="flex flex-wrap gap-2">
        <Link
          href={`${PENSION_BASE}/benefits-center`}
          className="rounded-full border border-teal-500/30 bg-teal-500/10 px-4 py-2 text-xs font-black text-teal-900 hover:bg-teal-500/15 dark:text-teal-50"
        >
          Benefits center →
        </Link>
        <Link
          href={`${PENSION_BASE}/retirement-projection`}
          className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-black text-zinc-200 hover:border-teal-400/30"
        >
          Retirement projection →
        </Link>
      </div>
    </PensionChrome>
  );
}
