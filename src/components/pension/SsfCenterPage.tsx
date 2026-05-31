"use client";

import Link from "next/link";
import { Bell, Sparkles } from "lucide-react";
import { useFireTheme } from "@/contexts/FireThemeContext";
import { useWealthPortfolio } from "@/contexts/WealthPortfolioContext";
import { analyzeRetireInNepal } from "@/lib/ssf-pension/nepal-retire";
import { SSF_NOTIFICATIONS, SSF_SUMMARY } from "@/lib/ssf-pension/demo-data";
import { SsfPensionChartsBlock } from "@/components/ssf-pension/SsfPensionChartsBlock";
import { PensionChrome } from "@/components/pension/PensionChrome";
import { SsfSummaryCards } from "@/components/ssf-pension/SsfSummaryCards";
import { useSsfPension } from "@/contexts/SsfPensionContext";
import { PENSION_BASE } from "@/lib/pension/nav";

function verdictStyles(v: string, light: boolean) {
  if (v === "SAFE")
    return light ? "border-emerald-300/80 bg-emerald-50 text-emerald-950" : "border-emerald-400/30 bg-emerald-500/15 text-emerald-50";
  if (v === "MODERATE RISK")
    return light ? "border-amber-300/80 bg-amber-50 text-amber-950" : "border-amber-400/25 bg-amber-500/10 text-amber-50";
  return light ? "border-rose-300/80 bg-rose-50 text-rose-950" : "border-rose-400/25 bg-rose-500/10 text-rose-50";
}

export function SsfCenterPage() {
  const { resolvedTheme } = useFireTheme();
  const light = resolvedTheme === "light";
  const { totals, fireScore, passiveMonthly, hydrated } = useWealthPortfolio();
  const { workspace } = useSsfPension();
  const savingsIncomeProxy = Math.round(totals.liquidNpr / 180);
  const investIncomeProxy = Math.round((totals.investmentsLiveNpr + totals.retirementNpr) / 420);
  const nepal = analyzeRetireInNepal({
    monthlyFamilySpendNpr: workspace.retireNepal.monthlyFamilySpendNpr,
    assumedInflationPct: workspace.retireNepal.assumedInflationPct,
    otherMonthlyIncomeNpr: workspace.retireNepal.otherMonthlyIncomeNpr,
    ssfMonthlyPensionNpr: SSF_SUMMARY.estimatedMonthlyPensionNpr,
    savingsMonthlyNpr: savingsIncomeProxy,
    investmentsIncomeMonthlyNpr: investIncomeProxy + passiveMonthly * 0.35,
    fireReadinessPct: fireScore,
  });

  return (
    <PensionChrome
      title="SSF Center"
      subtitle="Government Social Security Fund tools inside Pension — contributions, annuity estimates, and Nepal retirement context aligned with your wealth desk."
    >
      <SsfSummaryCards />

      <div className="grid gap-4 lg:grid-cols-3">
        <section
          className={`wealth-glass lg:col-span-2 flex flex-col gap-3 p-4 sm:p-5 ${
            light ? "ring-1 ring-slate-900/[0.04]" : ""
          }`}
        >
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-teal-600 dark:text-teal-300" />
            <h2 className="text-lg font-black text-slate-900 dark:text-white">Wealth ecosystem signals</h2>
          </div>
          <p className="text-sm font-semibold leading-relaxed text-slate-600 dark:text-zinc-400">
            Public-tier modeling sits next to your portfolio retirement sleeve, savings rhythm, and FIRE desk score — sync
            employer slips when you connect payroll.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/portfolio/retirement"
              className="rounded-full border border-teal-500/30 bg-teal-500/10 px-3 py-1.5 text-[11px] font-bold text-teal-900 hover:bg-teal-500/15 dark:text-teal-100"
            >
              Global retirement assets →
            </Link>
            <Link
              href={`${PENSION_BASE}/retirement-projection`}
              className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-bold text-slate-700 hover:border-teal-400/30 dark:text-zinc-200"
            >
              Retirement projection →
            </Link>
          </div>
        </section>

        <section className={`wealth-glass flex flex-col gap-3 p-4 sm:p-5 ${light ? "ring-1 ring-slate-900/[0.04]" : ""}`}>
          <h2 className="text-sm font-black uppercase tracking-[0.14em] text-slate-500 dark:text-zinc-400">Can I retire in Nepal?</h2>
          <p className={`inline-flex w-fit rounded-full border px-3 py-1 text-xs font-black ${verdictStyles(nepal.verdict, light)}`}>
            {nepal.verdict}
          </p>
          <p className="text-sm font-semibold leading-relaxed text-slate-600 dark:text-zinc-400">{nepal.headline}</p>
          <p className="text-[11px] font-bold text-slate-500 dark:text-zinc-500">
            Coverage ratio {nepal.coverageRatio.toFixed(2)}× · Gap NPR {Math.max(0, nepal.monthlyGapNpr).toLocaleString("en-IN")}
            /mo (model)
          </p>
          <Link
            href={`${PENSION_BASE}/retirement-projection`}
            className="mt-auto inline-flex text-xs font-black text-teal-700 underline-offset-4 hover:underline dark:text-teal-300"
          >
            Deeper projection & inputs →
          </Link>
        </section>
      </div>

      <SsfPensionChartsBlock />

      <section className={`wealth-glass p-4 sm:p-5 ${light ? "ring-1 ring-slate-900/[0.04]" : ""}`}>
        <div className="mb-4 flex items-center gap-2">
          <Bell size={18} className="text-teal-600 dark:text-teal-300" />
          <h2 className="text-lg font-black text-slate-900 dark:text-white">Notification center</h2>
        </div>
        <ul className="flex flex-col gap-2">
          {SSF_NOTIFICATIONS.map((n) => (
            <li
              key={n.id}
              className={`flex flex-col gap-1 rounded-xl border px-3 py-3 sm:flex-row sm:items-center sm:justify-between ${
                light ? "border-slate-200/80 bg-white/70" : "border-white/10 bg-white/[0.03]"
              }`}
            >
              <div>
                <p className="text-sm font-black text-slate-900 dark:text-white">{n.title}</p>
                <p className="text-xs font-semibold text-slate-600 dark:text-zinc-400">{n.body}</p>
              </div>
              <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-zinc-500">
                {new Date(n.createdAt).toLocaleDateString()}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[11px] font-semibold text-slate-500 dark:text-zinc-500">
          Email digest hooks to <code className="rounded bg-black/5 px-1 py-0.5 dark:bg-white/10">/api/cron/ssf-reminders</code> — set{" "}
          <code className="rounded bg-black/5 px-1 py-0.5 dark:bg-white/10">CRON_SECRET</code> in production.
        </p>
      </section>

      <section className={`wealth-glass p-4 sm:p-5 ${light ? "ring-1 ring-slate-900/[0.04]" : ""}`}>
        <h2 className="text-lg font-black text-slate-900 dark:text-white">FIRE progress (portfolio-linked)</h2>
        <p className="mt-1 text-sm font-semibold text-slate-600 dark:text-zinc-400">
          Desk FIRE readiness {hydrated ? `${Math.round(fireScore)}%` : "—"} — lift savings rate or contribution continuity to
          pull FI age earlier.
        </p>
        <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-slate-200/80 dark:bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-teal-500 to-emerald-400 motion-safe:transition-all motion-safe:duration-700"
            style={{ width: `${Math.min(100, Math.max(8, fireScore))}%` }}
          />
        </div>
      </section>
    </PensionChrome>
  );
}
