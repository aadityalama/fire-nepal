"use client";

import { ArrowLeft, Briefcase, Sparkles } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { loadCashflowState } from "@/components/cashflow/cashflow-storage";
import { DashboardSectionHeader } from "@/components/DashboardSectionHeader";
import { NepseDashboardTerminalSection } from "@/components/market/NepseDashboardTerminalSection";
import { FireFeatureGate } from "@/components/membership/FireFeatureGate";
import {
  allocationPercents,
  computeRetirementDashboardSnapshot,
  financialHealthFromScore,
  fireReadinessScore,
  passiveIncomeMonthlyNpr,
} from "@/components/portfolio/calculations";
import { PortfolioOverviewAnalytics } from "@/components/portfolio/PortfolioOverviewAnalytics";
import { WealthChartsPanel } from "@/components/portfolio/WealthChartsPanel";
import { useWealthPortfolio } from "@/contexts/WealthPortfolioContext";
import { useProductAuth } from "@/contexts/ProductAuthContext";
import { useFireTheme } from "@/contexts/FireThemeContext";
import { formatMoney } from "@/lib/expense-utils";
import { useRealtimeMarket } from "@/providers/realtime-provider";

export function SmartWealthDashboard() {
  const { user } = useProductAuth();
  const {
    hydrated,
    state,
    totals,
    passiveMonthly,
    monthDelta,
    ratesLoading,
    krwPerNpr,
    usdPerNpr,
  } = useWealthPortfolio();

  const { resolvedTheme } = useFireTheme();
  const light = resolvedTheme === "light";

  const { overlay } = useRealtimeMarket();
  const deltaNw = overlay?.deltaNetWorthNpr;

  const displayTotals = overlay?.totalsLive ?? totals;
  const displayAllocation = useMemo(() => allocationPercents(displayTotals), [displayTotals]);
  const displayFireScore = useMemo(() => fireReadinessScore(displayTotals), [displayTotals]);
  const displayRetirementSnap = useMemo(
    () => computeRetirementDashboardSnapshot(displayTotals),
    [displayTotals],
  );
  const displayPassiveMonthly = useMemo(() => {
    if (!overlay) return passiveMonthly;
    const div = loadCashflowState(user?.id).income.dividendIncome ?? 0;
    return passiveIncomeMonthlyNpr(overlay.totalsLive.investableNpr, {
      monthlyCashDividendNpr: div,
      monthlyFixedDepositInterestNpr: overlay.totalsLive.fixedDepositsEstimatedMonthlyIncomeNpr,
    });
  }, [overlay, passiveMonthly, user?.id]);

  const displayHealth = useMemo(
    () => financialHealthFromScore(displayFireScore),
    [displayFireScore],
  );

  const topAllocDisplay = useMemo(() => {
    const sorted = [...displayAllocation].sort((a, b) => b.value - a.value);
    return sorted[0] ?? { label: "—", value: 0, npr: 0 };
  }, [displayAllocation]);

  const metricTiles = useMemo(
    () => [
      { label: "Total net worth", value: formatMoney(displayTotals.netWorthNpr, "NPR"), hint: "Assets − liabilities" },
      {
        label: "Total assets",
        value: formatMoney(displayTotals.totalAssetsNpr, "NPR"),
        hint: "All buckets",
        accent: "lime" as const,
      },
      {
        label: "Total liabilities",
        value: formatMoney(displayTotals.liabilitiesNpr, "NPR"),
        hint: "Debt stack",
        accent: "rose" as const,
      },
      {
        label: "Investable wealth",
        value: formatMoney(displayTotals.investableNpr, "NPR"),
        hint: overlay ? "Liquid + listed book (live quotes when mapped)" : "Liquid + investments",
      },
      ...(overlay
        ? [
            {
              label: "Investments P/L (live)",
              value: `${displayTotals.investmentsPnlNpr >= 0 ? "+" : ""}${formatMoney(displayTotals.investmentsPnlNpr, "NPR")}`,
              hint: "Mark-to-market vs cost basis",
              accent: displayTotals.investmentsPnlNpr >= 0 ? ("lime" as const) : ("rose" as const),
            },
          ]
        : []),
      {
        label: "Monthly wealth growth",
        value: monthDelta === null ? "—" : `${monthDelta >= 0 ? "+" : ""}${formatMoney(monthDelta, "NPR")}`,
        hint: "vs last snapshot",
        accent: "amber" as const,
      },
      {
        label: "Asset allocation (top)",
        value: `${topAllocDisplay.label}`,
        hint: `${topAllocDisplay.value.toFixed(1)}% of assets`,
      },
      { label: "FIRE readiness score", value: String(displayFireScore), hint: "/ 100 composite" },
      {
        label: "Passive income (est.)",
        value: formatMoney(displayPassiveMonthly, "NPR"),
        hint: "4% / 12 + dividends + FD (est.)",
      },
      {
        label: "Retirement wealth",
        value: formatMoney(displayTotals.retirementNpr, "NPR"),
        hint: "Global retirement balances",
        accent: "lime" as const,
      },
      {
        label: "Retirement allocation",
        value: `${displayRetirementSnap.allocationOfAssetsPct.toFixed(1)}%`,
        hint: "Share of total assets",
      },
      {
        label: "Retirement income (proj.)",
        value: formatMoney(displayRetirementSnap.estimatedMonthlyIncomeNpr, "NPR"),
        hint: "4% / yr on projected pots ÷ 12",
        accent: "amber" as const,
      },
      {
        label: "FIRE impact (ret.)",
        value: `${displayRetirementSnap.fireNwContributionPct.toFixed(1)}%`,
        hint: "Retirement ÷ net worth",
      },
    ],
    [
      displayTotals,
      displayFireScore,
      displayPassiveMonthly,
      displayRetirementSnap,
      topAllocDisplay,
      monthDelta,
      overlay,
    ],
  );

  return (
    <>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-wrap gap-2">
          <Link
            href="/portfolio/ai-insights"
            className={`inline-flex min-h-[44px] items-center gap-2 rounded-xl border px-3.5 py-2.5 text-xs font-semibold transition-colors sm:text-sm ${
              light
                ? "border-violet-200/80 bg-white/95 text-violet-900 shadow-sm hover:border-violet-400/50 hover:bg-violet-50/90"
                : "border-white/[0.1] bg-white/[0.04] text-violet-100 hover:border-violet-400/25 hover:bg-white/[0.07]"
            }`}
          >
            <Sparkles size={15} className="opacity-90" /> AI insights
          </Link>
          <Link
            href="/portfolio/simulation"
            className={`inline-flex min-h-[44px] items-center gap-2 rounded-xl border px-3.5 py-2.5 text-xs font-semibold transition-colors sm:text-sm ${
              light
                ? "border-cyan-200/80 bg-white/95 text-cyan-900 shadow-sm hover:border-cyan-400/45 hover:bg-cyan-50/90"
                : "border-white/[0.1] bg-white/[0.04] text-cyan-100 hover:border-cyan-400/25 hover:bg-white/[0.07]"
            }`}
          >
            FIRE simulation
          </Link>
          <Link
            href="/"
            className={`inline-flex min-h-[44px] items-center gap-2 rounded-xl border px-3.5 py-2.5 text-xs font-semibold transition-colors sm:text-sm ${
              light
                ? "border-slate-200/90 bg-white/90 text-slate-800 font-semibold hover:border-slate-300 hover:bg-slate-50"
                : "border-white/[0.08] text-gray-100 font-semibold hover:border-white/15 hover:text-white"
            }`}
          >
            <ArrowLeft size={15} /> Home
          </Link>
        </div>
        <div className={`flex min-w-0 flex-col gap-1 text-xs sm:items-end sm:text-right ${light ? "text-slate-800" : "text-gray-100"}`}>
          <div
            className={`flex items-center gap-2 font-semibold ${light ? "text-black" : "text-white"}`}
          >
            <Briefcase size={14} className={`shrink-0 ${light ? "text-emerald-600" : "text-emerald-400/90"}`} />
            <span>Portfolio overview</span>
            {ratesLoading ? <span className={light ? "text-slate-600" : "text-gray-200"}>· rates…</span> : null}
          </div>
          {overlay && deltaNw != null && Number.isFinite(deltaNw) ? (
            <p className={`tabular-nums font-medium ${light ? "text-slate-800" : "text-gray-100"}`}>
              Live vs baseline NW{" "}
              <span
                className={
                  deltaNw >= 0
                    ? `font-semibold ${light ? "text-emerald-700" : "text-lime-300/90"}`
                    : `font-semibold ${light ? "text-rose-700" : "text-rose-300/90"}`
                }
              >
                {deltaNw >= 0 ? "+" : ""}
                {formatMoney(deltaNw, "NPR")}
              </span>
            </p>
          ) : null}
        </div>
      </div>

      <div className="wealth-dash-flow flex min-w-0 max-w-full flex-col gap-6 lg:gap-7">
        <NepseDashboardTerminalSection />

        <DashboardSectionHeader
          accent="emerald"
          title="Your Wealth Dashboard"
          subtitle="High-level health, allocation, and history — edit details in each module from the sidebar."
        />

        <FireFeatureGate
          feature="portfolio_analytics"
          title="Advanced wealth analytics"
          description="Premium unlocks the hero analytics grid — FIRE health, passive income stack, allocation drill-down, and history-aware tiles."
        >
          <PortfolioOverviewAnalytics
            hydrated={hydrated}
            metricTiles={metricTiles}
            netWorthNpr={displayTotals.netWorthNpr}
            totalAssetsNpr={displayTotals.totalAssetsNpr}
            liabilitiesNpr={displayTotals.liabilitiesNpr}
            investableNpr={displayTotals.investableNpr}
            allocation={displayAllocation}
            history={state.netWorthHistory}
            netWorthCurrent={displayTotals.netWorthNpr}
            fireScore={displayFireScore}
            passiveMonthlyNpr={displayPassiveMonthly}
            monthDelta={monthDelta}
            healthLabel={displayHealth.label}
            healthGradient={displayHealth.color}
            topAllocationLabel={topAllocDisplay.label}
            topAllocationPct={topAllocDisplay.value}
            liveDeltaNetWorthNpr={overlay && deltaNw != null && Number.isFinite(deltaNw) ? deltaNw : null}
          />
        </FireFeatureGate>

        <WealthChartsPanel
          allocation={displayAllocation}
          investmentByKindNpr={displayTotals.investmentByKindNpr}
          history={state.netWorthHistory}
          netWorthCurrent={displayTotals.netWorthNpr}
          passiveMonthlyNpr={displayPassiveMonthly}
          fireScore={displayFireScore}
          investableNpr={displayTotals.investableNpr}
          realEstateRows={state.realEstate}
          krwPerNpr={krwPerNpr}
          usdPerNpr={usdPerNpr}
          hydrated={hydrated}
        />
      </div>
    </>
  );
}
