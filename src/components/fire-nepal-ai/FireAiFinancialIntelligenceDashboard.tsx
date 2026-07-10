"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Banknote, BarChart3, ChevronDown, Flame, MessageCircle, PiggyBank, TrendingUp } from "lucide-react";
import { formatNprInteger } from "@/components/savings-tracker/savings-currency";
import { useFireTheme } from "@/contexts/FireThemeContext";
import type {
  FireAiExpenseMetric,
  FireAiGuidanceItem,
  FireAiHealthScore,
  FireAiTodayInsight,
} from "@/lib/fire-nepal-ai/types";
import type { UnifiedFireSummary } from "@/lib/fire-nepal/unified-fire-summary";

type FireAiFinancialIntelligenceDashboardProps = {
  hydrated: boolean;
  summary: UnifiedFireSummary;
  expenseInsights: { metrics: FireAiExpenseMetric[]; hasData: boolean };
  fireGuidance: { items: FireAiGuidanceItem[]; hasData: boolean; missingDataHint: string | null };
  healthScore: FireAiHealthScore;
  todayInsight: FireAiTodayInsight;
};

function formatPercent(value: number | null): string {
  return value == null ? "—" : `${Math.round(value)}%`;
}

function formatSignedNpr(value: number): string {
  if (!Number.isFinite(value)) return "—";
  const prefix = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${prefix}NPR ${formatNprInteger(Math.abs(value))}`;
}

function valueOrDash(value: number): string {
  return value === 0 ? "—" : `NPR ${formatNprInteger(value)}`;
}

function SkeletonCard() {
  return <div className="h-24 animate-pulse rounded-3xl bg-emerald-100/25 dark:bg-emerald-900/25" />;
}

function InsightCard({
  title,
  icon: Icon,
  value,
  subtitle,
  children,
  defaultOpen,
}: {
  title: string;
  icon: typeof BarChart3;
  value: string;
  subtitle: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const light = useFireTheme().resolvedTheme === "light";

  return (
    <details
      open={defaultOpen}
      className={`group rounded-3xl border p-3 shadow-sm transition sm:p-4 lg:open:min-h-[260px] ${
        light ? "border-emerald-100 bg-white/90" : "border-emerald-400/15 bg-emerald-950/35"
      }`}
    >
      <summary className="flex cursor-pointer list-none items-start gap-3">
        <div
          className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl ${
            light ? "bg-emerald-50 text-emerald-700" : "bg-emerald-500/15 text-emerald-300"
          }`}
        >
          <Icon size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <p className={`text-[11px] font-black uppercase tracking-[0.14em] ${light ? "text-emerald-700" : "text-emerald-300/80"}`}>
            {title}
          </p>
          <p className={`mt-1 truncate text-xl font-black tracking-tight ${light ? "text-slate-900" : "text-white"}`}>
            {value}
          </p>
          <p className={`mt-0.5 line-clamp-2 text-xs font-semibold ${light ? "text-slate-500" : "text-emerald-200/60"}`}>
            {subtitle}
          </p>
        </div>
        <ChevronDown
          size={18}
          className={`mt-2 shrink-0 transition group-open:rotate-180 ${light ? "text-slate-400" : "text-emerald-300/55"}`}
        />
      </summary>
      <div className={`mt-3 border-t pt-3 ${light ? "border-emerald-100" : "border-emerald-400/10"}`}>
        {children}
      </div>
    </details>
  );
}

function DetailList({ children }: { children: ReactNode }) {
  return <div className="grid gap-2 text-xs font-semibold sm:text-sm">{children}</div>;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  const light = useFireTheme().resolvedTheme === "light";
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl bg-emerald-500/5 px-3 py-2">
      <span className={light ? "text-slate-500" : "text-emerald-200/60"}>{label}</span>
      <span className={`text-right font-black ${light ? "text-slate-900" : "text-white"}`}>{value}</span>
    </div>
  );
}

export function FireAiFinancialIntelligenceDashboard({
  hydrated,
  summary,
  expenseInsights,
  fireGuidance,
  healthScore,
  todayInsight,
}: FireAiFinancialIntelligenceDashboardProps) {
  const light = useFireTheme().resolvedTheme === "light";
  const topExpenseMetric = expenseInsights.metrics[0];
  const topGuidance = fireGuidance.items[0];
  const hasWealth =
    summary.totalNetWorthNpr !== 0 ||
    summary.totalInvestableAssetsNpr > 0 ||
    summary.liabilitiesNpr > 0 ||
    summary.monthlyIncome > 0;
  const hasCashflow = summary.monthlyIncome > 0 || summary.monthlyExpenses > 0;
  const monthlySavings = summary.monthlyIncome - summary.monthlyExpenses;
  const expenseRatio = summary.monthlyIncome > 0 ? (summary.monthlyExpenses / summary.monthlyIncome) * 100 : null;

  if (!hydrated) {
    return (
      <section className="grid gap-3 lg:grid-cols-3">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </section>
    );
  }

  return (
    <section className="space-y-3 lg:space-y-5">
      <div className="grid gap-3 lg:grid-cols-[1.1fr_0.9fr] lg:items-stretch">
        <div
          className={`rounded-3xl border p-4 shadow-sm sm:p-5 ${
            light ? "border-emerald-100 bg-white/90" : "border-emerald-400/15 bg-emerald-950/35"
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className={`text-[11px] font-black uppercase tracking-[0.16em] ${light ? "text-emerald-700" : "text-emerald-300/80"}`}>
                AI Financial Intelligence
              </p>
              <h2 className={`mt-1 text-xl font-black tracking-tight sm:text-2xl ${light ? "text-slate-900" : "text-white"}`}>
                Unified money snapshot
              </h2>
              <p className={`mt-1 line-clamp-2 text-xs font-semibold leading-relaxed sm:text-sm ${light ? "text-slate-500" : "text-emerald-200/60"}`}>
                {todayInsight.available ? todayInsight.text : "Track expenses, portfolio, and cashflow to unlock sharper AI insights."}
              </p>
            </div>
            <div className={`rounded-2xl px-3 py-2 text-right ${light ? "bg-emerald-50" : "bg-emerald-500/10"}`}>
              <p className={`text-[10px] font-black uppercase ${light ? "text-emerald-700" : "text-emerald-300"}`}>Score</p>
              <p className={`font-mono text-2xl font-black ${light ? "text-slate-900" : "text-white"}`}>
                {healthScore.score ?? "—"}
              </p>
            </div>
          </div>
          <Link
            href="/fire-ai/chat"
            className="mt-4 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-4 text-sm font-black text-white transition hover:bg-emerald-600 active:scale-[0.99] sm:w-auto"
          >
            <MessageCircle size={17} />
            Ask FIRE AI
          </Link>
        </div>

        <div className="grid grid-cols-3 gap-2 lg:grid-cols-1">
          <div className={`rounded-2xl border p-3 ${light ? "border-emerald-100 bg-white/80" : "border-emerald-400/15 bg-emerald-950/25"}`}>
            <p className={`text-[10px] font-black uppercase ${light ? "text-slate-500" : "text-emerald-200/55"}`}>Surplus</p>
            <p className={`mt-1 truncate text-sm font-black sm:text-lg ${light ? "text-slate-900" : "text-white"}`}>
              {hasCashflow ? formatSignedNpr(monthlySavings) : "—"}
            </p>
          </div>
          <div className={`rounded-2xl border p-3 ${light ? "border-emerald-100 bg-white/80" : "border-emerald-400/15 bg-emerald-950/25"}`}>
            <p className={`text-[10px] font-black uppercase ${light ? "text-slate-500" : "text-emerald-200/55"}`}>Savings</p>
            <p className={`mt-1 text-sm font-black sm:text-lg ${light ? "text-slate-900" : "text-white"}`}>
              {formatPercent(summary.savingsRatePct)}
            </p>
          </div>
          <div className={`rounded-2xl border p-3 ${light ? "border-emerald-100 bg-white/80" : "border-emerald-400/15 bg-emerald-950/25"}`}>
            <p className={`text-[10px] font-black uppercase ${light ? "text-slate-500" : "text-emerald-200/55"}`}>FIRE</p>
            <p className={`mt-1 text-sm font-black sm:text-lg ${light ? "text-slate-900" : "text-white"}`}>
              {formatPercent(summary.fireProgressPct)}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-4">
        <InsightCard
          title="Cashflow"
          icon={Banknote}
          value={hasCashflow ? formatSignedNpr(monthlySavings) : "No data"}
          subtitle={hasCashflow ? "Monthly surplus / deficit" : "Add income and expenses"}
          defaultOpen
        >
          {hasCashflow ? (
            <DetailList>
              <DetailRow label="Monthly income" value={valueOrDash(summary.monthlyIncome)} />
              <DetailRow label="Monthly expenses" value={valueOrDash(summary.monthlyExpenses)} />
              <DetailRow label="Savings rate" value={formatPercent(summary.savingsRatePct)} />
              <DetailRow label="Expense ratio" value={formatPercent(expenseRatio)} />
              <Link href="/cashflow-dashboard" className="mt-1 text-xs font-black text-emerald-600 hover:underline">
                Open Cashflow
              </Link>
            </DetailList>
          ) : (
            <p className={`text-sm font-semibold leading-relaxed ${light ? "text-slate-500" : "text-emerald-200/65"}`}>
              Add recurring income and expenses in Cashflow to unlock savings rate, expense ratio, surplus/deficit, and FIRE timeline.
            </p>
          )}
        </InsightCard>

        <InsightCard
          title="Expense Insights"
          icon={BarChart3}
          value={expenseInsights.hasData ? (topExpenseMetric?.value ?? "Tracked") : "No data"}
          subtitle={expenseInsights.hasData ? (topExpenseMetric?.label ?? "Spending analysis ready") : "Start tracking expenses"}
          defaultOpen
        >
          {expenseInsights.hasData ? (
            <DetailList>
              {expenseInsights.metrics.slice(0, 4).map((metric) => (
                <DetailRow key={metric.id} label={metric.label} value={metric.value} />
              ))}
              <Link href="/expense-dashboard" className="mt-1 text-xs font-black text-emerald-600 hover:underline">
                Open Expense Tracker
              </Link>
            </DetailList>
          ) : (
            <p className={`text-sm font-semibold leading-relaxed ${light ? "text-slate-500" : "text-emerald-200/65"}`}>
              Add expenses in Expense Tracker to unlock monthly summaries, category breakdowns, trends, and savings opportunities.
            </p>
          )}
        </InsightCard>

        <InsightCard
          title="Wealth Summary"
          icon={TrendingUp}
          value={hasWealth ? valueOrDash(summary.totalNetWorthNpr) : "No data"}
          subtitle={hasWealth ? "Net worth and allocation" : "Add assets and liabilities"}
          defaultOpen
        >
          {hasWealth ? (
            <DetailList>
              <DetailRow label="Investable assets" value={valueOrDash(summary.totalInvestableAssetsNpr)} />
              <DetailRow label="Total investment" value={valueOrDash(summary.totalInvestmentNpr)} />
              <DetailRow label="Investments (listed)" value={valueOrDash(summary.investmentsLiveNpr)} />
              <DetailRow label="Retirement" value={valueOrDash(summary.retirementWealthNpr)} />
              <DetailRow label="Liabilities" value={valueOrDash(summary.liabilitiesNpr)} />
              <Link href="/portfolio" className="mt-1 text-xs font-black text-emerald-600 hover:underline">
                Open Portfolio
              </Link>
            </DetailList>
          ) : (
            <p className={`text-sm font-semibold leading-relaxed ${light ? "text-slate-500" : "text-emerald-200/65"}`}>
              Add cash, investments, assets, and debt to see your wealth score and allocation insights.
            </p>
          )}
        </InsightCard>

        <InsightCard
          title="FIRE Guidance"
          icon={Flame}
          value={fireGuidance.hasData ? (topGuidance?.priority.toUpperCase() ?? "READY") : "Missing"}
          subtitle={fireGuidance.hasData ? (topGuidance?.title ?? "Personalized guidance") : "Needs financial inputs"}
          defaultOpen
        >
          {fireGuidance.hasData ? (
            <div className="space-y-2">
              {fireGuidance.items.slice(0, 3).map((item) => (
                <div key={item.id} className={`rounded-2xl px-3 py-2 ${light ? "bg-emerald-50/70" : "bg-emerald-500/10"}`}>
                  <p className={`text-sm font-black ${light ? "text-slate-900" : "text-white"}`}>{item.title}</p>
                  <p className={`mt-0.5 line-clamp-3 text-xs font-semibold leading-relaxed ${light ? "text-slate-500" : "text-emerald-200/65"}`}>
                    {item.body}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className={`text-sm font-semibold leading-relaxed ${light ? "text-slate-500" : "text-emerald-200/65"}`}>
              {fireGuidance.missingDataHint ?? "Add cashflow and portfolio data to receive personalized FIRE next steps."}
            </p>
          )}
        </InsightCard>
      </div>

      <div
        className={`rounded-3xl border p-3 sm:p-4 ${
          light ? "border-emerald-100 bg-white/75" : "border-emerald-400/10 bg-emerald-950/25"
        }`}
      >
        <div className="flex items-center gap-2">
          <PiggyBank size={17} className={light ? "text-emerald-700" : "text-emerald-300"} />
          <p className={`text-sm font-black ${light ? "text-slate-900" : "text-white"}`}>Data safety</p>
        </div>
        <p className={`mt-1 text-xs font-semibold leading-relaxed ${light ? "text-slate-500" : "text-emerald-200/60"}`}>
          FIRE AI uses available dashboard data only. If a number is missing, it will explain what to add instead of guessing.
        </p>
      </div>
    </section>
  );
}
