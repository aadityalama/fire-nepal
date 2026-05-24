"use client";

import {
  AlertTriangle,
  BarChart3,
  Brain,
  Crown,
  Lightbulb,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useMemo } from "react";
import { Bar } from "react-chartjs-2";
import { DualCurrencyAmount } from "@/components/DualCurrencyAmount";
import {
  contributionLeaderboard,
  generateAiInsights,
  type AiInsight,
  type InsightTone,
} from "@/lib/expense-ai-insights";
import { categoryTotalsForMonth } from "@/lib/expense-analytics";
import type { ExchangeRateSnapshot } from "@/lib/exchange-rate";
import type { Currency, Expense } from "@/lib/expense-utils";
import { filterExpensesByMonth } from "@/lib/expense-storage";
import { currencyMeta, formatMoney } from "@/lib/expense-utils";

const toneStyles: Record<InsightTone, string> = {
  positive: "border-emerald-200 bg-emerald-50/80",
  warning: "border-amber-200 bg-amber-50/80",
  neutral: "border-slate-200 bg-white/80",
  info: "border-sky-200 bg-sky-50/80",
};

const toneIcon: Record<InsightTone, typeof Sparkles> = {
  positive: TrendingDown,
  warning: AlertTriangle,
  neutral: BarChart3,
  info: TrendingUp,
};

type ExpenseAiInsightsPanelProps = {
  expenses: Expense[];
  members: string[];
  selectedMonthKey: string;
  currency: Currency;
  krwPerNpr: number;
  exchangeRate: ExchangeRateSnapshot;
};

function InsightCard({ insight }: { insight: AiInsight }) {
  const Icon = toneIcon[insight.tone];
  return (
    <article
      className={`animate-fade-in rounded-2xl border p-4 transition hover:-translate-y-1 hover:shadow-lg ${toneStyles[insight.tone]}`}
    >
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-emerald-700 shadow-sm">
          <Icon size={18} />
        </div>
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-emerald-800">{insight.title}</p>
          <p className="mt-1 text-sm font-bold leading-6 text-slate-700">{insight.message}</p>
          {insight.metric ? (
            <p className="mt-2 text-lg font-black text-emerald-900">{insight.metric}</p>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export function ExpenseAiInsightsPanel({
  expenses,
  members,
  selectedMonthKey,
  currency,
  krwPerNpr,
}: ExpenseAiInsightsPanelProps) {
  const monthExpenses = useMemo(
    () => filterExpensesByMonth(expenses, selectedMonthKey),
    [expenses, selectedMonthKey],
  );
  const insights = useMemo(
    () => generateAiInsights(expenses, members, selectedMonthKey, currency),
    [expenses, members, selectedMonthKey, currency],
  );
  const leaderboard = useMemo(
    () => contributionLeaderboard(expenses, members, selectedMonthKey),
    [expenses, members, selectedMonthKey],
  );
  const categories = categoryTotalsForMonth(monthExpenses);
  const total = monthExpenses.reduce((sum, expense) => sum + expense.amount, 0);

  const categoryChart = {
    labels: categories.map((item) => item.category),
    datasets: [
      {
        data: categories.map((item) => item.total * currencyMeta[currency].rate),
        backgroundColor: ["#007a3d", "#064e3b", "#22c55e", "#0f766e", "#d6a83e", "#94a3b8"],
        borderRadius: 10,
      },
    ],
  };

  return (
    <div className="mt-6 space-y-6">
      <section className="dark-glass-card relative overflow-hidden rounded-[1.8rem] p-6 md:p-8">
        <div className="absolute -right-10 top-0 h-40 w-40 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-black text-emerald-100">
              <Brain size={16} /> AI-powered · स्मार्ट विश्लेषण
            </div>
            <h2 className="text-3xl font-black tracking-tight text-white sm:text-4xl">AI Insights</h2>
            <p className="mt-2 max-w-xl text-sm leading-7 text-emerald-50/85">
              Smart summaries, spending warnings, trend detection, and contribution intelligence for your
              roommate group.
            </p>
          </div>
          <div className="glass-card rounded-2xl p-4 text-emerald-950">
            <p className="text-xs font-black uppercase text-slate-500">This month total</p>
            <DualCurrencyAmount amountNpr={total} krwPerNpr={krwPerNpr} currency={currency} size="lg" />
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {insights.map((insight) => (
          <InsightCard key={insight.id} insight={insight} />
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <article className="glass-card rounded-[1.6rem] p-5">
          <div className="mb-4 flex items-center gap-2">
            <Crown className="text-amber-600" />
            <h3 className="text-lg font-black text-emerald-950">Contribution leaderboard</h3>
          </div>
          <div className="space-y-3">
            {leaderboard.map((entry, index) => (
              <div key={entry.name} className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-emerald-50">
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-black text-emerald-950">
                    #{index + 1} {entry.name}
                  </span>
                  <span className="text-xs font-black text-emerald-700">{entry.share}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-emerald-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-700"
                    style={{ width: `${entry.share}%` }}
                  />
                </div>
                <p className="mt-2 text-sm font-bold text-slate-600">
                  {formatMoney(entry.total, currency)}
                </p>
              </div>
            ))}
          </div>
        </article>

        <article className="glass-card rounded-[1.6rem] p-5">
          <div className="mb-4 flex items-center gap-2">
            <Sparkles className="text-emerald-700" />
            <h3 className="text-lg font-black text-emerald-950">Category intelligence</h3>
          </div>
          <div className="h-64">
            <Bar
              data={categoryChart}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                  y: { grid: { color: "rgba(0,122,61,0.08)" } },
                  x: { grid: { display: false } },
                },
              }}
            />
          </div>
        </article>
      </section>

      <section className="glass-card rounded-[1.6rem] border border-emerald-100 p-5">
        <div className="flex items-start gap-3">
          <Lightbulb className="shrink-0 text-amber-500" size={22} />
          <div>
            <h3 className="font-black text-emerald-950">Smart monthly summary</h3>
            <p className="mt-2 text-sm font-bold leading-7 text-slate-600">
              {insights.find((item) => item.id === "suggestions")?.message ??
                "Track receipts, settle weekly, and use the live KRW→NPR converter before adding Korean store expenses."}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
