"use client";

import Link from "next/link";
import { ArrowRight, TrendingUp } from "lucide-react";
import { useFireTheme } from "@/contexts/FireThemeContext";
import { useFireAiData } from "@/lib/fire-nepal-ai/use-fire-ai-data";
import { formatNprInteger } from "@/components/savings-tracker/savings-currency";
import { FireAiGlassCard } from "@/components/fire-nepal-ai/ui/FireAiGlassCard";

export function FireAiWealthSummary() {
  const light = useFireTheme().resolvedTheme === "light";
  const { summary, hydrated } = useFireAiData();

  const hasData =
    summary.totalNetWorthNpr !== 0 ||
    summary.monthlyIncome > 0 ||
    summary.totalInvestableAssetsNpr > 0;

  if (!hydrated) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-20 animate-pulse rounded-2xl bg-emerald-100/30" />
        ))}
      </div>
    );
  }

  if (!hasData) {
    return (
      <FireAiGlassCard className="text-center">
        <div
          className={`mx-auto grid h-14 w-14 place-items-center rounded-2xl ${
            light ? "bg-emerald-50 text-emerald-700" : "bg-emerald-500/15 text-emerald-300"
          }`}
        >
          <TrendingUp size={24} />
        </div>
        <h2 className={`mt-4 text-lg font-black ${light ? "text-slate-900" : "text-white"}`}>No wealth data yet</h2>
        <p className={`mt-2 text-sm font-medium leading-relaxed ${light ? "text-slate-500" : "text-emerald-200/60"}`}>
          Add your portfolio assets and cashflow to see net worth, savings rate, and FIRE progress.
        </p>
        <Link
          href="/portfolio"
          className="mt-5 inline-flex min-h-[48px] items-center gap-2 rounded-2xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-600"
        >
          Open Portfolio
          <ArrowRight size={16} />
        </Link>
      </FireAiGlassCard>
    );
  }

  const metrics = [
    { label: "Net worth", value: `NPR ${formatNprInteger(summary.totalNetWorthNpr)}` },
    { label: "Investable assets", value: `NPR ${formatNprInteger(summary.totalInvestableAssetsNpr)}` },
    {
      label: "Savings rate",
      value: summary.savingsRatePct !== null ? `${Math.round(summary.savingsRatePct)}%` : "—",
      detail: summary.monthlyIncome > 0 ? `Income NPR ${formatNprInteger(summary.monthlyIncome)}/mo` : undefined,
    },
    {
      label: "FIRE progress",
      value: summary.fireProgressPct !== null ? `${Math.round(summary.fireProgressPct)}%` : "—",
      detail:
        summary.fireNumber25xAnnualSpendNpr > 0
          ? `Target NPR ${formatNprInteger(summary.fireNumber25xAnnualSpendNpr)}`
          : undefined,
    },
    {
      label: "Emergency fund",
      value:
        summary.emergencyFundCoverageMonths !== null
          ? `${summary.emergencyFundCoverageMonths.toFixed(1)} mo`
          : "—",
      detail: "Coverage vs monthly burn",
    },
    { label: "Liabilities", value: `NPR ${formatNprInteger(summary.liabilitiesNpr)}` },
  ];

  return (
    <div className="space-y-3">
      {metrics.map((m) => (
        <FireAiGlassCard key={m.label}>
          <p className={`text-[10px] font-black uppercase tracking-[0.16em] ${light ? "text-emerald-600" : "text-emerald-400/80"}`}>
            {m.label}
          </p>
          <p className={`mt-1 text-2xl font-black tracking-tight ${light ? "text-slate-900" : "text-white"}`}>
            {m.value}
          </p>
          {m.detail ? (
            <p className={`mt-1 text-sm font-semibold ${light ? "text-slate-500" : "text-emerald-200/60"}`}>
              {m.detail}
            </p>
          ) : null}
        </FireAiGlassCard>
      ))}
    </div>
  );
}
