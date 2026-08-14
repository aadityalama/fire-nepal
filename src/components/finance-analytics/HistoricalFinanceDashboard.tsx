"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, CalendarRange, RefreshCw, X } from "lucide-react";
import Link from "next/link";
import { useProductAuth } from "@/contexts/ProductAuthContext";
import { formatNpr } from "@/components/expense-workspace/expense-workspace-utils";
import { useHistoricalFinanceData } from "@/hooks/useHistoricalFinanceData";
import {
  buildHistoricalSummary,
  buildMonthlySeries,
  buildPeriodDetail,
  buildYearlySeries,
  expenseCategoryBreakdownForMonths,
  historicalIncomeBySourceForMonth,
  resolveHistoricalRange,
  yearOverYearComparison,
  type HistoricalMonthPoint,
  type HistoricalPeriodPreset,
  type PeriodDetail,
} from "@/lib/finance/historical-analytics";
import {
  ExpenseCategoriesChart,
  ExpenseTrendChart,
  IncomeSourcesChart,
  IncomeTrendChart,
  IncomeVsExpenseChart,
  NetCashflowTrendChart,
  YearOverYearChart,
} from "@/components/finance-analytics/HistoricalAnalyticsCharts";

const PRIMARY_PRESETS: { id: HistoricalPeriodPreset; label: string }[] = [
  { id: "monthly", label: "Monthly" },
  { id: "yearly", label: "Yearly" },
  { id: "1y", label: "1Y" },
  { id: "2y", label: "2Y" },
  { id: "5y", label: "5Y" },
];

const QUICK_PRESETS: { id: HistoricalPeriodPreset; label: string }[] = [
  { id: "current_month", label: "Current Month" },
  { id: "previous_month", label: "Previous Month" },
  { id: "current_year", label: "Current Year" },
  { id: "previous_year", label: "Previous Year" },
  { id: "custom", label: "Custom" },
];

function glassCard(extra = "") {
  return `rounded-[1.5rem] border border-white/10 bg-white/[0.055] backdrop-blur-xl ${extra}`;
}

function SummaryTile({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "lime" | "rose" | "emerald" | "amber";
}) {
  const toneClass =
    tone === "lime"
      ? "text-lime-300"
      : tone === "rose"
        ? "text-rose-300"
        : tone === "emerald"
          ? "text-emerald-300"
          : tone === "amber"
            ? "text-amber-300"
            : "text-white";
  return (
    <div className={`${glassCard("px-3.5 py-3")}`}>
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-emerald-100/45">{label}</p>
      <p className={`mt-1.5 text-sm font-black tabular-nums tracking-tight sm:text-base ${toneClass}`}>{value}</p>
    </div>
  );
}

function PeriodDetailSheet({
  detail,
  onClose,
}: {
  detail: PeriodDetail;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true">
      <button type="button" className="absolute inset-0 bg-black/70 backdrop-blur-sm" aria-label="Close detail" onClick={onClose} />
      <div className="relative z-10 flex max-h-[88dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-[1.75rem] border border-white/10 bg-[#071512] shadow-2xl sm:rounded-[1.75rem]">
        <header className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3 pt-[calc(0.75rem+env(safe-area-inset-top,0px))]">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-emerald-100/45">Period detail</p>
            <h2 className="truncate text-lg font-black text-white">{detail.label}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-emerald-50"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-4 py-4 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] [-webkit-overflow-scrolling:touch]">
          <div className="grid grid-cols-2 gap-2.5">
            <SummaryTile label="Total Income" value={formatNpr(detail.totalIncome)} tone="lime" />
            <SummaryTile label="Total Expenses" value={formatNpr(detail.totalExpenses)} tone="rose" />
            <SummaryTile
              label="Net Cashflow"
              value={`${detail.netCashflow >= 0 ? "+" : ""}${formatNpr(detail.netCashflow)}`}
              tone={detail.netCashflow >= 0 ? "emerald" : "rose"}
            />
            <SummaryTile label="Transactions" value={String(detail.transactionCount)} />
          </div>

          <section className="mt-5">
            <h3 className="text-xs font-black uppercase tracking-[0.14em] text-emerald-100/45">Largest</h3>
            <div className="mt-2 space-y-2">
              <div className={`${glassCard("px-3.5 py-3")}`}>
                <p className="text-[10px] font-black uppercase tracking-[0.12em] text-emerald-100/40">Largest income</p>
                {detail.largestIncome ? (
                  <p className="mt-1 text-sm font-bold text-lime-200">
                    {detail.largestIncome.description} · {formatNpr(detail.largestIncome.amount)}
                  </p>
                ) : (
                  <p className="mt-1 text-sm font-semibold text-emerald-100/45">No data</p>
                )}
              </div>
              <div className={`${glassCard("px-3.5 py-3")}`}>
                <p className="text-[10px] font-black uppercase tracking-[0.12em] text-emerald-100/40">Largest expense</p>
                {detail.largestExpense ? (
                  <p className="mt-1 text-sm font-bold text-rose-200">
                    {detail.largestExpense.description} · {formatNpr(detail.largestExpense.amount)}
                  </p>
                ) : (
                  <p className="mt-1 text-sm font-semibold text-emerald-100/45">No data</p>
                )}
              </div>
            </div>
          </section>

          <section className="mt-5">
            <h3 className="text-xs font-black uppercase tracking-[0.14em] text-emerald-100/45">Income sources</h3>
            {detail.incomeSources.length === 0 ? (
              <p className="mt-2 text-sm font-semibold text-emerald-100/45">No data</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {detail.incomeSources.map((item) => (
                  <li key={item.source} className={`${glassCard("flex items-center justify-between gap-3 px-3.5 py-2.5")}`}>
                    <span className="text-sm font-bold text-emerald-50">{item.label}</span>
                    <span className="text-sm font-black tabular-nums text-lime-300">{formatNpr(item.amount)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="mt-5">
            <h3 className="text-xs font-black uppercase tracking-[0.14em] text-emerald-100/45">Expense categories</h3>
            {detail.expenseCategories.length === 0 ? (
              <p className="mt-2 text-sm font-semibold text-emerald-100/45">No data</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {detail.expenseCategories.map((item) => (
                  <li key={item.category} className={`${glassCard("flex items-center justify-between gap-3 px-3.5 py-2.5")}`}>
                    <span className="text-sm font-bold text-emerald-50">{item.label}</span>
                    <span className="text-sm font-black tabular-nums text-rose-300">{formatNpr(item.amount)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

export function HistoricalFinanceDashboard() {
  const { user } = useProductAuth();
  const { state, reload, dataset } = useHistoricalFinanceData(user?.id);
  const [preset, setPreset] = useState<HistoricalPeriodPreset>("1y");
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [detail, setDetail] = useState<PeriodDetail | null>(null);

  const now = useMemo(() => new Date(), [dataset?.fetchedAt]);

  const range = useMemo(
    () =>
      resolveHistoricalRange(preset, {
        now,
        selectedYear,
        customFrom: customFrom || undefined,
        customTo: customTo || undefined,
      }),
    [preset, selectedYear, customFrom, customTo, now],
  );

  const months = useMemo(() => {
    if (!dataset) return [] as HistoricalMonthPoint[];
    return buildMonthlySeries(dataset.cashflow, dataset.transactions, range.monthKeys, now);
  }, [dataset, range.monthKeys, now]);

  const years = useMemo(() => buildYearlySeries(months), [months]);
  const summary = useMemo(() => buildHistoricalSummary(months), [months]);
  const categoryBreakdown = useMemo(
    () => (dataset ? expenseCategoryBreakdownForMonths(dataset.transactions, range.monthKeys) : []),
    [dataset, range.monthKeys],
  );
  const incomeSources = useMemo(() => {
    if (!dataset) return [];
    const map = new Map<string, { source: ReturnType<typeof historicalIncomeBySourceForMonth>[number]["source"]; label: string; amount: number }>();
    for (const mk of range.monthKeys) {
      for (const item of historicalIncomeBySourceForMonth(dataset.cashflow, mk, now)) {
        const prev = map.get(item.source);
        map.set(item.source, {
          source: item.source,
          label: item.label,
          amount: (prev?.amount ?? 0) + item.amount,
        });
      }
    }
    return Array.from(map.values())
      .filter((i) => i.amount > 0)
      .sort((a, b) => b.amount - a.amount);
  }, [dataset, range.monthKeys, now]);

  const yoy = useMemo(() => yearOverYearComparison(years), [years]);
  const chartMonths = preset === "yearly" ? months : months;
  const emptyMonthsNote = summary.monthsInRange > summary.monthsWithData && summary.monthsWithData > 0;

  const yearOptions = useMemo(() => {
    const current = now.getFullYear();
    return Array.from({ length: 10 }, (_, i) => current - i);
  }, [now]);

  function openMonthDetail(point: HistoricalMonthPoint) {
    if (!dataset) return;
    setDetail(
      buildPeriodDetail(dataset.cashflow, dataset.transactions, [point.key], point.label, point.key, now),
    );
  }

  function openYearDetail(yearKey: string, label: string) {
    if (!dataset) return;
    const keys = range.monthKeys.filter((k) => k.startsWith(yearKey));
    setDetail(buildPeriodDetail(dataset.cashflow, dataset.transactions, keys, label, yearKey, now));
  }

  const loading = state.status === "loading" || state.status === "idle";
  const errorMessage = state.status === "error" ? state.message : null;
  const showEmpty = !loading && dataset && !summary.hasAnyData;
  const showCharts = !loading && dataset && summary.hasAnyData;

  return (
    <main className="min-h-[100dvh] overflow-x-clip bg-[#020806] px-4 pb-[calc(6.25rem+env(safe-area-inset-bottom,0px))] pt-[calc(0.85rem+env(safe-area-inset-top,0px))] text-white sm:px-6 lg:px-8">
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -left-24 top-8 h-72 w-72 rounded-full bg-emerald-400/18 blur-3xl" />
        <div className="absolute -right-24 top-52 h-80 w-80 rounded-full bg-lime-300/12 blur-3xl" />
      </div>

      <div className="relative mx-auto flex w-full max-w-lg flex-col gap-4 lg:max-w-6xl lg:gap-5">
        <header>
          <div className="flex items-center justify-between gap-3">
            <Link
              href="/finance"
              className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 text-xs font-black text-emerald-50 backdrop-blur-xl transition active:scale-95"
            >
              <ArrowLeft size={15} /> Finance
            </Link>
            <button
              type="button"
              onClick={() => reload()}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 text-xs font-black text-emerald-50 transition active:scale-95"
              aria-label="Refresh history"
            >
              <RefreshCw size={14} /> Refresh
            </button>
          </div>
          <h1 className="mt-3 text-[2rem] font-black tracking-[-0.05em] text-white sm:text-[2.35rem]">History</h1>
          <p className="mt-1 text-sm font-semibold text-emerald-100/58">Income, expenses &amp; cashflow over time</p>
        </header>

        {/* Sticky period selector — above bottom nav, touch-friendly */}
        <div className="sticky top-0 z-40 -mx-4 border-b border-white/5 bg-[#020806]/92 px-4 py-2.5 backdrop-blur-xl sm:-mx-6 sm:px-6 lg:static lg:mx-0 lg:border-0 lg:bg-transparent lg:px-0 lg:py-0 lg:backdrop-blur-none">
          <div
            className="flex gap-2 overflow-x-auto pb-1 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            role="tablist"
            aria-label="Time period"
          >
            {PRIMARY_PRESETS.map((item) => {
              const active = preset === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setPreset(item.id)}
                  className={`relative z-10 shrink-0 rounded-full px-4 py-2.5 text-xs font-black transition active:scale-95 ${
                    active
                      ? "bg-emerald-400 text-emerald-950 shadow-[0_8px_24px_-10px_rgba(52,211,153,0.8)]"
                      : "border border-white/10 bg-white/[0.06] text-emerald-50"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>

          <div className="mt-2 flex gap-2 overflow-x-auto pb-0.5 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {QUICK_PRESETS.map((item) => {
              const active = preset === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setPreset(item.id)}
                  className={`relative z-10 shrink-0 rounded-full px-3 py-2 text-[11px] font-black transition active:scale-95 ${
                    active
                      ? "bg-lime-300/90 text-emerald-950"
                      : "border border-white/8 bg-black/25 text-emerald-100/70"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>

          {preset === "monthly" ? (
            <div className="mt-2 flex items-center gap-2">
              <label className="text-[11px] font-black uppercase tracking-[0.12em] text-emerald-100/45" htmlFor="hist-year">
                Year
              </label>
              <select
                id="hist-year"
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="min-h-[44px] rounded-xl border border-white/10 bg-black/30 px-3 text-sm font-bold text-emerald-50 outline-none"
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          {preset === "custom" ? (
            <div className="mt-2 grid grid-cols-2 gap-2">
              <label className="block">
                <span className="text-[10px] font-black uppercase tracking-[0.12em] text-emerald-100/45">From</span>
                <input
                  type="month"
                  value={customFrom.slice(0, 7)}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="mt-1 min-h-[44px] w-full rounded-xl border border-white/10 bg-black/30 px-3 text-sm font-bold text-emerald-50 outline-none"
                />
              </label>
              <label className="block">
                <span className="text-[10px] font-black uppercase tracking-[0.12em] text-emerald-100/45">To</span>
                <input
                  type="month"
                  value={customTo.slice(0, 7)}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="mt-1 min-h-[44px] w-full rounded-xl border border-white/10 bg-black/30 px-3 text-sm font-bold text-emerald-50 outline-none"
                />
              </label>
            </div>
          ) : null}
        </div>

        {errorMessage ? (
          <div className={`${glassCard("border-rose-400/25 bg-rose-500/10 px-4 py-4")}`} role="alert">
            <p className="text-sm font-black text-rose-100">Unable to load financial history. Please try again.</p>
            {dataset ? (
              <p className="mt-1 text-xs font-semibold text-rose-100/60">Showing last successfully loaded data.</p>
            ) : null}
            <button
              type="button"
              onClick={() => reload()}
              className="mt-3 inline-flex min-h-[44px] items-center rounded-full bg-rose-300/90 px-4 text-xs font-black text-rose-950"
            >
              Try again
            </button>
          </div>
        ) : null}

        {loading && !dataset ? (
          <div className="space-y-3" aria-busy="true" aria-label="Loading financial history">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className={`${glassCard("h-24 animate-pulse bg-emerald-500/10")}`} />
            ))}
          </div>
        ) : null}

        {showEmpty ? (
          <div className={`${glassCard("border-dashed px-5 py-12 text-center")}`}>
            <CalendarRange className="mx-auto text-emerald-300/50" size={28} />
            <p className="mt-3 text-sm font-black text-white">No financial records found for this period.</p>
            <p className="mt-1 text-xs font-semibold text-emerald-100/50">
              Add income in Cashflow or expenses in Expense to build your history.
            </p>
          </div>
        ) : null}

        {showCharts ? (
          <>
            <section className="grid grid-cols-2 gap-2.5 lg:grid-cols-3">
              <SummaryTile label="Total Income" value={formatNpr(summary.totalIncome)} tone="lime" />
              <SummaryTile label="Total Expenses" value={formatNpr(summary.totalExpenses)} tone="rose" />
              <SummaryTile
                label="Net Cashflow"
                value={`${summary.netCashflow >= 0 ? "+" : ""}${formatNpr(summary.netCashflow)}`}
                tone={summary.netCashflow >= 0 ? "emerald" : "rose"}
              />
              <SummaryTile label="Savings" value={formatNpr(summary.savings)} tone="emerald" />
              <SummaryTile
                label="Savings Rate"
                value={summary.savingsRate == null ? "—" : `${summary.savingsRate.toFixed(1)}%`}
                tone="amber"
              />
              <SummaryTile label="Avg Monthly Income" value={formatNpr(summary.averageMonthlyIncome)} tone="lime" />
              <SummaryTile label="Avg Monthly Expenses" value={formatNpr(summary.averageMonthlyExpenses)} tone="rose" />
              <SummaryTile
                label="Highest Income Month"
                value={
                  summary.highestIncomeMonth
                    ? `${summary.highestIncomeMonth.shortLabel} · ${formatNpr(summary.highestIncomeMonth.income)}`
                    : "No data"
                }
              />
              <SummaryTile
                label="Highest Expense Month"
                value={
                  summary.highestExpenseMonth
                    ? `${summary.highestExpenseMonth.shortLabel} · ${formatNpr(summary.highestExpenseMonth.expense)}`
                    : "No data"
                }
              />
            </section>

            {emptyMonthsNote ? (
              <p className="text-xs font-semibold text-emerald-100/50">
                Showing {summary.monthsWithData} month{summary.monthsWithData === 1 ? "" : "s"} with records.
                Older periods in this range have no recorded data (shown as 0).
              </p>
            ) : null}

            <div className="grid gap-4 lg:grid-cols-2">
              <IncomeVsExpenseChart data={chartMonths} />
              <NetCashflowTrendChart data={chartMonths} />
              <ExpenseTrendChart data={chartMonths} />
              <IncomeTrendChart data={chartMonths} />
              <ExpenseCategoriesChart data={categoryBreakdown} />
              <IncomeSourcesChart data={incomeSources} />
              <div className="lg:col-span-2">
                <YearOverYearChart data={yoy} />
              </div>
            </div>

            <section>
              <div className="mb-3 flex items-end justify-between gap-3">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-emerald-100/50">
                    {preset === "yearly" ? "Years" : "Months"}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-emerald-100/55">Tap for detailed breakdown</p>
                </div>
              </div>

              {preset === "yearly" ? (
                <ul className="space-y-2">
                  {years.map((y) => (
                    <li key={y.key}>
                      <button
                        type="button"
                        onClick={() => openYearDetail(y.key, y.label)}
                        className={`${glassCard("flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition active:scale-[0.99]")} ${
                          y.hasData ? "" : "opacity-60"
                        }`}
                      >
                        <div>
                          <p className="text-sm font-black text-white">{y.label}</p>
                          <p className="mt-0.5 text-[11px] font-semibold text-emerald-100/45">
                            {y.hasData ? `${y.monthsWithData} mo with data` : "No data"}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className={`text-sm font-black tabular-nums ${y.netCashflow >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                            {y.netCashflow >= 0 ? "+" : ""}
                            {formatNpr(y.netCashflow)}
                          </p>
                          <p className="mt-0.5 text-[11px] font-semibold text-emerald-100/45">
                            In {formatNpr(y.income)} · Out {formatNpr(y.expense)}
                          </p>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <ul className="space-y-2">
                  {[...months].reverse().map((m) => (
                    <li key={m.key}>
                      <button
                        type="button"
                        onClick={() => openMonthDetail(m)}
                        className={`${glassCard("flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition active:scale-[0.99]")} ${
                          m.hasData ? "" : "opacity-60"
                        }`}
                      >
                        <div>
                          <p className="text-sm font-black text-white">{m.label}</p>
                          <p className="mt-0.5 text-[11px] font-semibold text-emerald-100/45">
                            {m.hasData ? "Tap for breakdown" : "No recorded data"}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className={`text-sm font-black tabular-nums ${m.netCashflow >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                            {m.netCashflow >= 0 ? "+" : ""}
                            {formatNpr(m.netCashflow)}
                          </p>
                          <p className="mt-0.5 text-[11px] font-semibold text-emerald-100/45">
                            In {formatNpr(m.income)} · Out {formatNpr(m.expense)}
                          </p>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        ) : null}
      </div>

      {detail ? <PeriodDetailSheet detail={detail} onClose={() => setDetail(null)} /> : null}
    </main>
  );
}
