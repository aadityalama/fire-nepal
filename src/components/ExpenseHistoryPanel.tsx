"use client";

import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
} from "chart.js";
import {
  BarChart3,
  Download,
  FileSpreadsheet,
  Filter,
  Search,
  TrendingUp,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Bar, Line } from "react-chartjs-2";
import { DualCurrencyAmount } from "@/components/DualCurrencyAmount";
import { ExpenseTimeline } from "@/components/ExpenseTimeline";
import {
  EXPENSE_CATEGORIES,
  buildAllStatements,
  buildMonthlyStatement,
  categoryTotalsForMonth,
  monthlyComparisonData,
  normalizeCategory,
} from "@/lib/expense-analytics";
import { exportStatementExcel, exportStatementPdf } from "@/lib/expense-exports";
import { memberDisplayName, resolveExpensePayerName } from "@/lib/expense-members";
import type { Currency, Expense, RoommateProfile } from "@/lib/expense-utils";
import { currencyMeta, formatMoney, formatSignedMoney } from "@/lib/expense-utils";
import { formatMonthLabel, listMonthKeys } from "@/lib/expense-storage";
import type { TimelineActivity } from "@/lib/expense-storage";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  LineElement,
  PointElement,
  Tooltip,
  Legend,
);

type ExpenseHistoryPanelProps = {
  expenses: Expense[];
  members: string[];
  profiles: Record<string, RoommateProfile>;
  currency: Currency;
  activities: TimelineActivity[];
  krwPerNpr: number;
};

function chartOptions(currency: Currency) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context: { parsed: { y: number | null } }) =>
            `${currencyMeta[currency].symbol} ${(context.parsed.y ?? 0).toLocaleString()}`,
        },
      },
    },
    scales: {
      y: {
        ticks: {
          callback: (value: string | number) =>
            `${currencyMeta[currency].symbol}${Number(value).toLocaleString()}`,
        },
        grid: { color: "rgba(0,122,61,0.08)" },
      },
      x: { grid: { display: false } },
    },
  };
}

export function ExpenseHistoryPanel({
  expenses,
  members,
  profiles,
  currency,
  activities,
  krwPerNpr,
}: ExpenseHistoryPanelProps) {
  const monthKeys = useMemo(() => listMonthKeys(expenses), [expenses]);
  const [filterMonth, setFilterMonth] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const statements = useMemo(() => buildAllStatements(expenses, members), [expenses, members]);

  const filteredStatements = useMemo(() => {
    return statements.filter((statement) => {
      if (filterMonth !== "all" && statement.monthKey !== filterMonth) return false;
      if (filterCategory === "all") return true;
      return statement.expenses.some(
        (expense) => normalizeCategory(expense.category) === filterCategory,
      );
    });
  }, [statements, filterMonth, filterCategory]);

  const filteredActivities = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return activities.filter((activity) => {
      if (filterMonth !== "all" && activity.monthKey !== filterMonth) return false;
      if (filterCategory !== "all" && activity.category && activity.category !== filterCategory) {
        return false;
      }
      if (!query) return true;
      return (
        activity.message.toLowerCase().includes(query) ||
        (activity.memberId
          ? memberDisplayName(activity.memberId, profiles).toLowerCase().includes(query)
          : false)
      );
    });
  }, [activities, filterMonth, filterCategory, searchQuery, profiles]);

  const comparison = monthlyComparisonData(expenses, currency, 8, krwPerNpr);
  const overviewMonthKey = filterMonth === "all" ? monthKeys[0] : filterMonth;
  const overviewStatement = buildMonthlyStatement(overviewMonthKey, expenses, members);
  const categoryBreakdown = categoryTotalsForMonth(
    filterMonth === "all"
      ? expenses
      : expenses.filter((e) => e.date.startsWith(filterMonth)),
  );

  const comparisonChart = {
    labels: comparison.labels,
    datasets: [
      {
        label: "Monthly total",
        data: comparison.data,
        borderColor: "#007a3d",
        backgroundColor: "rgba(0, 122, 61, 0.15)",
        fill: true,
        tension: 0.35,
        pointRadius: 5,
        pointBackgroundColor: "#007a3d",
      },
    ],
  };

  const categoryChart = {
    labels: categoryBreakdown.map((item) => item.category),
    datasets: [
      {
        data: categoryBreakdown.map((item) => item.total * currencyMeta[currency].rate),
        backgroundColor: ["#007a3d", "#064e3b", "#22c55e", "#0f766e", "#d6a83e", "#94a3b8"],
        borderRadius: 12,
      },
    ],
  };

  return (
    <div className="mt-6 space-y-6">
      <section className="dark-glass-card animate-fade-in overflow-hidden rounded-[1.8rem] p-6 text-white md:p-8">
        <div className="relative">
          <p className="font-nepali text-xs font-black uppercase tracking-[0.2em] text-emerald-100">
            विवरण इतिहास · Statement History
          </p>
          <h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
            Premium expense archive
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-emerald-50/80">
            सबै महिनाको खर्च, settlement, र contribution records यहाँ स्थायी रूपमा सुरक्षित छन्।
            Data refresh पछि पनि हराउँदैन।
          </p>
        </div>
      </section>

      <section className="glass-card animate-fade-in rounded-[1.5rem] p-4 sm:p-5">
        <div className="mb-4 flex items-center gap-2">
          <Filter className="text-emerald-700" size={18} />
          <h3 className="text-sm font-black uppercase tracking-[0.14em] text-emerald-800">
            Search & Filter
          </h3>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <label className="md:col-span-1">
            <span className="mb-1 flex items-center gap-1 text-xs font-black uppercase text-slate-500">
              <Search size={12} /> Member search
            </span>
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Aashish, Bikram..."
              className="w-full rounded-2xl border border-emerald-100 bg-white px-4 py-3 text-sm font-bold outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
            />
          </label>
          <label>
            <span className="mb-1 block text-xs font-black uppercase text-slate-500">Month</span>
            <select
              value={filterMonth}
              onChange={(event) => setFilterMonth(event.target.value)}
              className="w-full rounded-2xl border border-emerald-100 bg-white px-4 py-3 text-sm font-bold outline-none focus:border-emerald-600"
            >
              <option value="all">All months</option>
              {monthKeys.map((key) => (
                <option key={key} value={key}>
                  {formatMonthLabel(key)}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="mb-1 block text-xs font-black uppercase text-slate-500">Category</span>
            <select
              value={filterCategory}
              onChange={(event) => setFilterCategory(event.target.value)}
              className="w-full rounded-2xl border border-emerald-100 bg-white px-4 py-3 text-sm font-bold outline-none focus:border-emerald-600"
            >
              <option value="all">All categories</option>
              {EXPENSE_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="glass-card animate-fade-in rounded-[1.6rem] p-5">
          <div className="mb-4 flex items-center gap-2">
            <TrendingUp className="text-emerald-700" />
            <h3 className="text-lg font-black text-emerald-950">Monthly spending comparison</h3>
          </div>
          <div className="h-64">
            <Line data={comparisonChart} options={chartOptions(currency)} />
          </div>
        </article>
        <article className="glass-card animate-fade-in rounded-[1.6rem] p-5">
          <div className="mb-4 flex items-center gap-2">
            <BarChart3 className="text-emerald-700" />
            <h3 className="text-lg font-black text-emerald-950">Category analytics</h3>
          </div>
          <div className="h-64">
            <Bar
              data={categoryChart}
              options={{
                ...chartOptions(currency),
                indexAxis: "y" as const,
                plugins: { legend: { display: false } },
              }}
            />
          </div>
        </article>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="glass-card rounded-[1.4rem] p-5">
          <p className="text-xs font-black uppercase text-slate-500">Overview total</p>
          <p className="mt-2 text-2xl font-black text-emerald-800">
            {formatMoney(overviewStatement.totalExpense, currency)}
          </p>
        </div>
        <div className="glass-card rounded-[1.4rem] p-5">
          <p className="text-xs font-black uppercase text-slate-500">Highest spender</p>
          <p className="mt-2 text-2xl font-black text-emerald-800">
            {memberDisplayName(overviewStatement.highestSpender.id, profiles)}
          </p>
          <p className="text-sm font-bold text-slate-500">
            {formatMoney(overviewStatement.highestSpender.total, currency)}
          </p>
        </div>
        <div className="glass-card rounded-[1.4rem] p-5">
          <p className="text-xs font-black uppercase text-slate-500">Settlement status</p>
          <p
            className={`mt-2 text-2xl font-black ${
              overviewStatement.settlementStatus === "Settled" ? "text-emerald-700" : "text-amber-600"
            }`}
          >
            {overviewStatement.settlementStatus}
          </p>
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="font-nepali text-xl font-black text-emerald-950">मासिक विवरण · Monthly statements</h3>
        {filteredStatements.map((statement) => (
          <article
            key={statement.monthKey}
            className="glass-card animate-fade-in overflow-hidden rounded-[1.7rem] border border-emerald-100/80"
          >
            <div className="flex flex-col gap-4 border-b border-emerald-100 bg-gradient-to-r from-emerald-50/80 to-white p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-700">
                  {statement.settlementStatus}
                </p>
                <h4 className="text-xl font-black text-emerald-950">{statement.monthLabel}</h4>
                <p className="text-sm font-bold text-slate-500">
                  {statement.expenses.length} transactions · Top:{" "}
                  {memberDisplayName(statement.highestSpender.id, profiles)}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => exportStatementPdf(statement, currency, profiles)}
                  className="inline-flex items-center gap-2 rounded-2xl bg-emerald-700 px-4 py-2.5 text-xs font-black text-white transition hover:-translate-y-0.5 hover:bg-emerald-800"
                >
                  <Download size={14} /> PDF
                </button>
                <button
                  type="button"
                  onClick={() => exportStatementExcel(statement, currency, profiles)}
                  className="inline-flex items-center gap-2 rounded-2xl border border-emerald-200 bg-white px-4 py-2.5 text-xs font-black text-emerald-800 transition hover:-translate-y-0.5 hover:bg-emerald-50"
                >
                  <FileSpreadsheet size={14} /> Excel
                </button>
              </div>
            </div>

            <div className="grid gap-4 p-5 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="overflow-x-auto rounded-2xl border border-emerald-100">
                <table className="fintech-table min-w-full text-sm">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Expense</th>
                      <th>Category</th>
                      <th>Paid by</th>
                      <th className="text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {statement.expenses.length ? (
                      statement.expenses.map((expense) => (
                        <tr key={expense.id}>
                          <td>{expense.date}</td>
                          <td className="font-bold text-emerald-950">{expense.title}</td>
                          <td>{normalizeCategory(expense.category)}</td>
                          <td>{resolveExpensePayerName(expense, profiles)}</td>
                          <td className="text-right">
                            <DualCurrencyAmount
                              amountNpr={expense.amount}
                              krwPerNpr={krwPerNpr}
                              currency={currency}
                              size="sm"
                            />
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-500">
                          No expenses recorded this month.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="space-y-3">
                <div className="rounded-2xl bg-emerald-50 p-4">
                  <p className="text-xs font-black uppercase text-emerald-700">Total expenses</p>
                  <p className="mt-1 text-2xl font-black text-emerald-900">
                    {formatMoney(statement.totalExpense, currency)}
                  </p>
                  <p className="mt-1 text-sm font-bold text-slate-600">
                    Group average: {formatMoney(statement.equalSplitAmount, currency)} per person
                  </p>
                </div>
                <div className="rounded-2xl bg-white p-4 shadow-sm">
                  <p className="mb-3 text-xs font-black uppercase text-slate-500">Per-person contribution</p>
                  <div className="space-y-2">
                    {members.map((memberId) => (
                      <div
                        key={memberId}
                        className="rounded-xl bg-emerald-50/70 px-3 py-3 sm:grid sm:grid-cols-[1fr_auto_auto_auto] sm:items-center sm:gap-3"
                      >
                        <span className="block font-bold text-emerald-950">
                          {memberDisplayName(memberId, profiles)}
                        </span>
                        <div className="mt-2 grid grid-cols-3 gap-2 text-center sm:mt-0 sm:contents sm:text-left">
                          <div className="rounded-lg bg-white/60 px-2 py-1.5 sm:bg-transparent sm:p-0">
                            <p className="text-[10px] font-black uppercase text-slate-500">Paid</p>
                            <p className="text-sm font-black text-emerald-800">
                              {formatMoney(statement.paidByMember[memberId] ?? 0, currency)}
                            </p>
                          </div>
                          <div className="rounded-lg bg-white/60 px-2 py-1.5 sm:bg-transparent sm:p-0">
                            <p className="text-[10px] font-black uppercase text-slate-500">Share</p>
                            <p className="text-sm font-bold text-slate-700">
                              {formatMoney(statement.memberExpectedShare[memberId] ?? 0, currency)}
                            </p>
                          </div>
                          <div className="rounded-lg bg-white/60 px-2 py-1.5 sm:bg-transparent sm:p-0">
                            <p className="text-[10px] font-black uppercase text-slate-500">Balance</p>
                            <p className="text-sm font-bold text-slate-600">
                              {formatSignedMoney(statement.balances[memberId] ?? 0, currency)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-2xl border border-emerald-100 p-4">
                  <p className="mb-2 text-xs font-black uppercase text-slate-500">Settlement transfers</p>
                  {statement.transfers.length ? (
                    <ul className="space-y-2 text-sm font-bold text-slate-700">
                      {statement.transfers.map((transfer) => (
                        <li key={`${transfer.from}-${transfer.to}`}>
                          {memberDisplayName(transfer.from, profiles)} → {memberDisplayName(transfer.to, profiles)}:{" "}
                          {formatMoney(transfer.amount, currency)}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm font-black text-emerald-700">सबै settled — All clear</p>
                  )}
                </div>
              </div>
            </div>
          </article>
        ))}
      </section>

      <section className="glass-card rounded-[1.7rem] p-5 sm:p-6">
        <h3 className="mb-5 text-xl font-black text-emerald-950">Transaction timeline</h3>
        <ExpenseTimeline activities={filteredActivities} profiles={profiles} />
      </section>
    </div>
  );
}
