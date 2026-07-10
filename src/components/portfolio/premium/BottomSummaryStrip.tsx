"use client";

import { TrendingUp } from "lucide-react";
import { formatNpr } from "@/data/fire-premium-dashboard";
import { useWealthPortfolio } from "@/contexts/WealthPortfolioContext";
import { useUnifiedFireSummary } from "@/lib/fire-nepal/use-unified-fire-summary";

export function BottomSummaryStrip() {
  const { totals, passiveMonthly, hydrated } = useWealthPortfolio();
  const { summary } = useUnifiedFireSummary();

  const savingsRate = summary.savingsRatePct;
  const items = [
    { label: "Total assets", value: formatNpr(hydrated ? totals.totalAssetsNpr : 0) },
    { label: "Total investment", value: formatNpr(hydrated ? totals.totalInvestmentNpr : 0), hint: "Listed holdings" },
    { label: "Liabilities", value: formatNpr(hydrated ? totals.liabilitiesNpr : 0), accent: "rose" as const },
    { label: "Net worth", value: formatNpr(hydrated ? totals.netWorthNpr : 0), hint: "After debt" },
    {
      label: "Savings rate",
      value: savingsRate != null ? `${savingsRate.toFixed(1)}%` : "—",
      hint: savingsRate != null ? "From cashflow" : "Add income & expenses",
      good: savingsRate != null && savingsRate >= 20,
    },
    { label: "Passive income", value: formatNpr(hydrated ? passiveMonthly : 0), hint: "/ mo" },
    { label: "Active income", value: formatNpr(hydrated ? summary.monthlyIncome : 0), hint: "/ mo" },
  ];

  return (
    <div className="sticky bottom-0 z-20 mt-4 border-t border-emerald-500/[0.12] bg-zinc-950/75 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom,0px))] pt-2 shadow-[0_-20px_72px_-32px_rgba(0,0,0,0.88),0_0_0_1px_rgba(255,255,255,0.04)_inset] backdrop-blur-2xl backdrop-saturate-[1.08] supports-[backdrop-filter]:bg-zinc-950/60 sm:mt-5 sm:px-2.5 sm:pt-2 xl:mt-4">
      <div className="mx-auto grid w-full max-w-none grid-cols-2 gap-1.5 px-0.5 sm:grid-cols-3 sm:gap-2 sm:px-1 lg:grid-cols-6 lg:gap-1.5 lg:px-0">
        {items.map((it) => (
          <div
            key={it.label}
            className="flex min-h-[4.25rem] min-w-0 flex-col justify-center rounded-lg border border-white/[0.07] bg-gradient-to-b from-white/[0.06] to-white/[0.02] px-2 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition motion-safe:duration-300 motion-safe:ease-out hover:border-emerald-400/25 hover:shadow-[0_0_24px_-14px_rgba(52,211,153,0.18)] motion-safe:hover:-translate-y-px sm:min-h-[4.5rem] sm:rounded-xl sm:px-2.5 sm:py-2 lg:min-h-0 lg:rounded-lg lg:px-2 lg:py-1.5"
          >
            <p className="truncate text-[8px] font-bold uppercase tracking-[0.12em] text-zinc-500 sm:text-[9px] sm:tracking-[0.14em]">{it.label}</p>
            <p
              className={`mt-0.5 truncate text-[11px] font-bold leading-tight tracking-tight tabular-nums sm:text-xs ${
                it.accent === "rose" ? "text-rose-300" : "text-white"
              }`}
            >
              {it.value}
              {it.hint ? <span className="text-[8px] font-semibold text-zinc-500 sm:text-[9px]"> {it.hint}</span> : null}
            </p>
            {it.good ? (
              <p className="mt-0.5 inline-flex items-center gap-0.5 text-[8px] font-semibold text-emerald-400/95 sm:text-[9px]">
                <TrendingUp className="h-2 w-2 shrink-0 sm:h-2.5 sm:w-2.5" strokeWidth={2.25} />
                On track
              </p>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
