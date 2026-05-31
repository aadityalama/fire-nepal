"use client";

import { useMemo } from "react";
import { useFireTheme } from "@/contexts/FireThemeContext";
import { useWealthPortfolio } from "@/contexts/WealthPortfolioContext";
import { useSsfPension } from "@/contexts/SsfPensionContext";
import { computePensionProjection } from "@/lib/ssf-pension/projection";
import { analyzeRetireInNepal } from "@/lib/ssf-pension/nepal-retire";
import { SSF_SUMMARY } from "@/lib/ssf-pension/demo-data";
import { PensionChrome } from "@/components/pension/PensionChrome";
import { formatMoney } from "@/lib/expense-utils";

function verdictStyles(v: string, light: boolean) {
  if (v === "SAFE")
    return light ? "border-emerald-300/80 bg-emerald-50 text-emerald-950" : "border-emerald-400/30 bg-emerald-500/15 text-emerald-50";
  if (v === "MODERATE RISK")
    return light ? "border-amber-300/80 bg-amber-50 text-amber-950" : "border-amber-400/25 bg-amber-500/10 text-amber-50";
  return light ? "border-rose-300/80 bg-rose-50 text-rose-950" : "border-rose-400/25 bg-rose-500/10 text-rose-50";
}

export function SsfPensionProjectionPage() {
  const { resolvedTheme } = useFireTheme();
  const light = resolvedTheme === "light";
  const { fireScore, passiveMonthly, totals } = useWealthPortfolio();
  const { workspace, setProjection } = useSsfPension();
  const p = useMemo(() => computePensionProjection(workspace.projection), [workspace.projection]);
  const { projection: i } = workspace;

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
      title="Retirement Projection"
      subtitle="On-device inputs until you connect data — outputs are illustrative, not statutory fund statements."
    >
      <section className={`wealth-glass p-4 sm:p-5 ${light ? "ring-1 ring-slate-900/[0.04]" : ""}`}>
        <h2 className="text-sm font-black uppercase tracking-[0.14em] text-slate-500 dark:text-zinc-400">Nepal retirement readiness</h2>
        <p className="mt-2 text-sm font-semibold text-slate-600 dark:text-zinc-400">{nepal.headline}</p>
        <p className={`mt-3 inline-flex w-fit rounded-full border px-3 py-1 text-xs font-black ${verdictStyles(nepal.verdict, light)}`}>
          {nepal.verdict}
        </p>
        <p className="mt-2 text-[11px] font-bold text-slate-500 dark:text-zinc-500">
          Coverage {nepal.coverageRatio.toFixed(2)}× · Gap NPR {Math.max(0, nepal.monthlyGapNpr).toLocaleString("en-IN")}/mo (model)
        </p>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="wealth-glass space-y-4 p-4 sm:p-5">
          <h2 className="text-sm font-black uppercase tracking-[0.14em] text-slate-500 dark:text-zinc-400">Inputs</h2>
          <label className="block text-xs font-bold text-slate-600 dark:text-zinc-400">
            Current age
            <input
              type="number"
              className="mt-1 w-full rounded-xl border border-slate-200/90 bg-white/90 px-3 py-2 text-sm font-black text-slate-900 dark:border-white/10 dark:bg-white/[0.06] dark:text-white"
              value={i.currentAge}
              min={18}
              max={70}
              onChange={(e) => setProjection({ currentAge: Math.round(Number(e.target.value)) })}
            />
          </label>
          <label className="block text-xs font-bold text-slate-600 dark:text-zinc-400">
            Monthly salary (NPR)
            <input
              type="number"
              className="mt-1 w-full rounded-xl border border-slate-200/90 bg-white/90 px-3 py-2 text-sm font-black text-slate-900 dark:border-white/10 dark:bg-white/[0.06] dark:text-white"
              value={i.monthlySalaryNpr}
              min={25_000}
              max={2_000_000}
              step={1000}
              onChange={(e) => setProjection({ monthlySalaryNpr: Math.round(Number(e.target.value)) })}
            />
          </label>
          <label className="block text-xs font-bold text-slate-600 dark:text-zinc-400">
            Monthly SSF contribution (NPR)
            <input
              type="number"
              className="mt-1 w-full rounded-xl border border-slate-200/90 bg-white/90 px-3 py-2 text-sm font-black text-slate-900 dark:border-white/10 dark:bg-white/[0.06] dark:text-white"
              value={i.monthlySsfContributionNpr}
              min={0}
              max={200_000}
              step={250}
              onChange={(e) => setProjection({ monthlySsfContributionNpr: Math.round(Number(e.target.value)) })}
            />
          </label>
          <label className="block text-xs font-bold text-slate-600 dark:text-zinc-400">
            Retirement age
            <input
              type="number"
              className="mt-1 w-full rounded-xl border border-slate-200/90 bg-white/90 px-3 py-2 text-sm font-black text-slate-900 dark:border-white/10 dark:bg-white/[0.06] dark:text-white"
              value={i.retirementAge}
              min={40}
              max={70}
              onChange={(e) => setProjection({ retirementAge: Math.round(Number(e.target.value)) })}
            />
          </label>
          <label className="block text-xs font-bold text-slate-600 dark:text-zinc-400">
            Expected salary growth (%/yr)
            <input
              type="number"
              className="mt-1 w-full rounded-xl border border-slate-200/90 bg-white/90 px-3 py-2 text-sm font-black text-slate-900 dark:border-white/10 dark:bg-white/[0.06] dark:text-white"
              value={i.annualSalaryGrowthPct}
              min={0}
              max={20}
              step={0.25}
              onChange={(e) => setProjection({ annualSalaryGrowthPct: Number(e.target.value) })}
            />
          </label>
        </section>

        <section className="wealth-glass space-y-4 p-4 sm:p-5">
          <h2 className="text-sm font-black uppercase tracking-[0.14em] text-slate-500 dark:text-zinc-400">Outputs</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-teal-500/20 bg-teal-500/10 p-3">
              <p className="text-[10px] font-black uppercase tracking-wide text-teal-900 dark:text-teal-100/80">Monthly pension</p>
              <p className="mt-1 text-lg font-black text-slate-900 dark:text-white">{formatMoney(p.estimatedMonthlyPensionNpr, "NPR")}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
              <p className="text-[10px] font-black uppercase tracking-wide text-slate-500 dark:text-zinc-400">Lump sum (heuristic)</p>
              <p className="mt-1 text-lg font-black text-slate-900 dark:text-white">{formatMoney(p.lumpSumEstimateNpr, "NPR")}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
              <p className="text-[10px] font-black uppercase tracking-wide text-slate-500 dark:text-zinc-400">Future corpus</p>
              <p className="mt-1 text-lg font-black text-slate-900 dark:text-white">{formatMoney(p.futureCorpusNpr, "NPR")}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
              <p className="text-[10px] font-black uppercase tracking-wide text-slate-500 dark:text-zinc-400">Inflation-adjusted</p>
              <p className="mt-1 text-lg font-black text-slate-900 dark:text-white">{formatMoney(p.inflationAdjustedCorpusNpr, "NPR")}</p>
            </div>
          </div>
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm font-semibold leading-relaxed text-emerald-950 dark:text-emerald-50">
            <p className="text-[11px] font-black uppercase tracking-wide text-emerald-800/80 dark:text-emerald-200/80">Example</p>
            <p className="mt-2 text-base font-black leading-snug">{p.narrativeExample}</p>
            <p className="mt-2 text-xs opacity-90">Retirement year {p.retirementYear} · Runway {p.yearsToRetirement} years</p>
          </div>
        </section>
      </div>
    </PensionChrome>
  );
}
