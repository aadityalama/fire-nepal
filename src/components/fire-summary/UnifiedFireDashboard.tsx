"use client";

import {
  ArrowLeft,
  Banknote,
  Briefcase,
  Gem,
  LayoutDashboard,
  PiggyBank,
  Scale,
  ShieldHalf,
  TrendingUp,
  Wallet2,
} from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { DashboardSectionHeader } from "@/components/DashboardSectionHeader";
import { CashflowInsetCard } from "@/components/cashflow/CashflowGlassCard";
import { FinancialGuidancePanel } from "@/components/fire-summary/FinancialGuidancePanel";
import { WealthDashboardShell } from "@/components/portfolio/WealthDashboardShell";
import { WealthMetricGrid } from "@/components/portfolio/WealthMetricGrid";
import { useUnifiedFireSummary } from "@/lib/fire-nepal/use-unified-fire-summary";
import { formatMoney } from "@/lib/expense-utils";

const pill =
  "rounded-full border border-emerald-400/15 bg-black/25 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-emerald-200/70";

export function UnifiedFireDashboard() {
  const { summary, ratesLoading } = useUnifiedFireSummary();

  const tiles = useMemo(
    () => [
      {
        label: "Total net worth",
        value: formatMoney(summary.totalNetWorthNpr, "NPR"),
        hint: "Portfolio assets − liabilities",
        accent: "lime" as const,
      },
      {
        label: "Investable assets",
        value: formatMoney(summary.totalInvestableAssetsNpr, "NPR"),
        hint: "Liquid + investments (live)",
        accent: "default" as const,
      },
      {
        label: "Retirement wealth",
        value: formatMoney(summary.retirementWealthNpr, "NPR"),
        hint: "Global retirement balances",
        accent: "lime" as const,
      },
      {
        label: "Monthly income",
        value: formatMoney(summary.monthlyIncome, "NPR"),
        hint: "Cashflow module (all sources)",
        accent: "amber" as const,
      },
      {
        label: "Monthly expenses",
        value: formatMoney(summary.monthlyExpenses, "NPR"),
        hint: "Burn incl. override rules",
        accent: "rose" as const,
      },
      {
        label: "Savings rate",
        value: summary.savingsRatePct === null ? "—" : `${summary.savingsRatePct.toFixed(1)}%`,
        hint: "Cashflow surplus ÷ income",
        accent: "lime" as const,
      },
      {
        label: "Emergency coverage",
        value: summary.emergencyFundCoverageMonths === null ? "—" : `${summary.emergencyFundCoverageMonths.toFixed(1)} mo`,
        hint:
          summary.emergencyFundSixMoProgressPct === null
            ? "Reserve ÷ monthly burn"
            : `${summary.emergencyFundSixMoProgressPct.toFixed(0)}% of 6‑mo buffer`,
        accent: "amber" as const,
      },
      {
        label: "FIRE progress",
        value: summary.fireProgressPct === null ? "—" : `${summary.fireProgressPct.toFixed(1)}%`,
        hint:
          summary.fireNumber25xAnnualSpendNpr > 0
            ? `vs 25× spend (${formatMoney(summary.fireNumber25xAnnualSpendNpr, "NPR")})`
            : "Add monthly expenses in cashflow",
        accent: "default" as const,
      },
    ],
    [summary],
  );

  return (
    <WealthDashboardShell
      brand={{ tagline: "Unified summary", iconGradient: "from-emerald-400 to-cyan-400" }}
      footerNote={
        <>
          Engine reads portfolio + cashflow local data.{ratesLoading ? " FX…" : " Live FX for NPR stack."}
        </>
      }
    >
      <div className="mb-6 flex flex-col gap-3 sm:mb-7 sm:flex-row sm:items-center sm:justify-between lg:mb-8">
        <Link
          href="/"
          className="inline-flex min-h-[44px] w-fit items-center gap-2 rounded-full border border-emerald-400/18 bg-white/[0.06] px-3.5 py-2.5 text-xs font-black text-emerald-50/95 shadow-[0_8px_28px_-12px_rgba(0,0,0,0.45)] backdrop-blur-md transition duration-300 active:scale-[0.98] hover:border-cyan-300/35 hover:bg-white/10 hover:shadow-[0_12px_36px_-10px_rgba(34,211,238,0.15)] sm:text-sm"
        >
          <ArrowLeft size={15} /> Back to FIRE Nepal
        </Link>
        <div className="flex items-center gap-2 text-[11px] font-bold text-emerald-200/70 sm:text-xs">
          <LayoutDashboard size={14} className="text-cyan-300" />
          Unified FIRE summary
        </div>
      </div>

      <div className="wealth-dash-flow flex flex-col gap-5 lg:gap-6">
        <DashboardSectionHeader
          accent="cyan"
          title="Your Financial Snapshot"
          subtitle="See your complete wealth picture instantly."
        />

        <section className="wealth-glass mb-5 rounded-[1.35rem] p-3.5 sm:p-4">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-cyan-400/15 text-cyan-100 ring-1 ring-white/10">
                <Gem size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-black text-emerald-50">Summary engine</p>
                <p className="text-[11px] font-semibold text-emerald-200/60">
                  Auto-updates when you edit Portfolio or Cashflow (same tab navigation or another tab).
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className={`${pill} inline-flex items-center gap-1`}>
                <Wallet2 size={12} /> Portfolio
              </span>
              <span className={`${pill} inline-flex items-center gap-1`}>
                <Banknote size={12} /> Cashflow
              </span>
              <span className={`${pill} inline-flex items-center gap-1`}>
                <PiggyBank size={12} /> Retirement
              </span>
              <span className={`${pill} inline-flex items-center gap-1`}>
                <TrendingUp size={12} /> Investments
              </span>
              <span className={`${pill} inline-flex items-center gap-1`}>
                <Scale size={12} /> Liabilities
              </span>
              <span className={`${pill} inline-flex items-center gap-1`}>
                <ShieldHalf size={12} /> Emergency
              </span>
            </div>
        </section>

        <CashflowInsetCard className="mb-5 border-cyan-400/15">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-cyan-200/55">Global metrics</p>
            <p className="mt-1 text-[11px] font-semibold text-emerald-200/55">
              Investments (live): {formatMoney(summary.investmentsLiveNpr, "NPR")} · Liabilities:{" "}
              {formatMoney(summary.liabilitiesNpr, "NPR")}
            </p>
            <div className="mt-3">
              <WealthMetricGrid tiles={tiles} />
            </div>
          </CashflowInsetCard>

          <div className="mb-5">
            <FinancialGuidancePanel summary={summary} />
          </div>

        <div className="grid min-w-0 gap-3 sm:grid-cols-2">
            <div className="wealth-row-card rounded-2xl border border-emerald-400/12 p-3 sm:p-4">
              <div className="flex items-center gap-2">
                <Briefcase size={16} className="text-emerald-300" />
                <p className="text-[10px] font-black uppercase tracking-wide text-emerald-200/55">FIRE number</p>
              </div>
              <p className="mt-2 text-xl font-black tabular-nums text-emerald-50 sm:text-2xl">
                {summary.fireNumber25xAnnualSpendNpr > 0
                  ? formatMoney(summary.fireNumber25xAnnualSpendNpr, "NPR")
                  : "—"}
              </p>
              <p className="mt-1 text-[11px] font-semibold leading-relaxed text-emerald-200/50">
                25 × annual expenses from cashflow burn ({formatMoney(summary.annualExpensesFromCashflowNpr, "NPR")}{" "}
                / yr implied).
              </p>
            </div>
            <div className="wealth-row-card rounded-2xl border border-emerald-400/12 p-3 sm:p-4">
              <div className="flex items-center gap-2">
                <ShieldHalf size={16} className="text-teal-300" />
                <p className="text-[10px] font-black uppercase tracking-wide text-emerald-200/55">Emergency math</p>
              </div>
              <p className="mt-2 text-sm font-bold leading-relaxed text-emerald-100/90">
                Coverage uses cashflow reserve ÷ monthly burn. FIRE progress compares portfolio net worth to the 25×
                target above (classic rule-of-thumb, not tax or withdrawal optimized).
              </p>
            </div>
          </div>
      </div>
    </WealthDashboardShell>
  );
}
