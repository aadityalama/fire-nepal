"use client";

import Link from "next/link";
import { PiggyBank, TrendingUp, Wallet } from "lucide-react";
import { useFireTheme } from "@/contexts/FireThemeContext";
import { PensionChrome } from "@/components/pension/PensionChrome";
import { formatMoney } from "@/lib/expense-utils";
import { EPF_DEMO } from "@/lib/pension/epf-cit-demo";
import { PENSION_BASE } from "@/lib/pension/nav";

export function EpfCenterPage() {
  const { resolvedTheme } = useFireTheme();
  const light = resolvedTheme === "light";
  const glass = light ? "ring-1 ring-slate-900/[0.04]" : "";

  return (
    <PensionChrome
      title="EPF Center"
      subtitle="Employee Provident Fund desk — balances, employer share, interest accrual, and voluntary top-ups. Demo figures until payroll sync."
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Member balance", value: formatMoney(EPF_DEMO.memberBalanceNpr, "NPR"), hint: "Principal + interest (desk)" },
          { label: "Employer share", value: formatMoney(EPF_DEMO.employerShareNpr, "NPR"), hint: "Credited to member ledger" },
          { label: "Employee share", value: formatMoney(EPF_DEMO.employeeShareNpr, "NPR"), hint: "Salary deferrals" },
          { label: "Interest accrued", value: formatMoney(EPF_DEMO.interestAccruedNpr, "NPR"), hint: "Last FY accrual (demo)" },
        ].map((c) => (
          <div key={c.label} className={`wealth-glass flex min-h-[120px] flex-col justify-between p-4 sm:p-5 ${glass}`}>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-teal-700/90 dark:text-teal-300/80">{c.label}</p>
              <p className="mt-2 text-lg font-black text-slate-900 dark:text-white">{c.value}</p>
            </div>
            <p className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400">{c.hint}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className={`wealth-glass p-4 sm:p-5 lg:col-span-2 ${glass}`}>
          <div className="mb-3 flex items-center gap-2">
            <TrendingUp size={18} className="text-teal-600 dark:text-teal-300" />
            <h2 className="text-lg font-black text-slate-900 dark:text-white">Contribution rhythm</h2>
          </div>
          <p className="text-sm font-semibold text-slate-600 dark:text-zinc-400">
            Monthly desk contribution {formatMoney(EPF_DEMO.monthlyContributionNpr, "NPR")} · Last credit window{" "}
            {EPF_DEMO.lastCreditLabel}. Voluntary top-up runway {formatMoney(EPF_DEMO.voluntaryTopUpNpr, "NPR")}.
          </p>
          <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-slate-200/80 dark:bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400"
              style={{ width: `${EPF_DEMO.vestingPct}%` }}
            />
          </div>
          <p className="mt-2 text-[11px] font-bold text-slate-500 dark:text-zinc-500">Vesting progress (illustrative) {EPF_DEMO.vestingPct}%</p>
        </section>

        <section className={`wealth-glass flex flex-col gap-3 p-4 sm:p-5 ${glass}`}>
          <div className="flex items-center gap-2">
            <Wallet size={18} className="text-teal-600 dark:text-teal-300" />
            <h2 className="text-lg font-black text-slate-900 dark:text-white">Actions</h2>
          </div>
          <Link
            href={`${PENSION_BASE}/contribution-history`}
            className="rounded-xl border border-teal-500/30 bg-teal-500/10 px-3 py-2.5 text-center text-xs font-black text-teal-900 hover:bg-teal-500/15 dark:text-teal-50"
          >
            View contribution history →
          </Link>
          <Link
            href={`${PENSION_BASE}/retirement-projection`}
            className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-center text-xs font-black text-slate-800 hover:border-teal-400/30 dark:text-zinc-100"
          >
            Tie into retirement projection →
          </Link>
        </section>
      </div>

      <section className={`wealth-glass p-4 sm:p-5 ${glass}`}>
        <div className="flex items-center gap-2">
          <PiggyBank size={18} className="text-teal-600 dark:text-teal-300" />
          <h2 className="text-lg font-black text-slate-900 dark:text-white">Liquidity & withdrawals</h2>
        </div>
        <p className="mt-2 text-sm font-semibold text-slate-600 dark:text-zinc-400">
          Map EPF liquidity against Nepal relocation and tax events — use the withdrawal planner for phased drawdowns.
        </p>
        <Link
          href={`${PENSION_BASE}/withdrawal-planner`}
          className="mt-3 inline-flex text-xs font-black text-teal-700 underline-offset-4 hover:underline dark:text-teal-300"
        >
          Open withdrawal planner →
        </Link>
      </section>
    </PensionChrome>
  );
}
