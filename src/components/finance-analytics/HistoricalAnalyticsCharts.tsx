"use client";

import { useMemo, type ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatNpr } from "@/components/expense-workspace/expense-workspace-utils";
import type {
  CategoryBreakdownItem,
  HistoricalMonthPoint,
  HistoricalYearPoint,
  IncomeSourceBreakdownItem,
} from "@/lib/finance/historical-analytics";

const tooltipStyle = {
  background: "rgba(3, 8, 6, 0.94)",
  border: "1px solid rgba(52, 211, 153, 0.2)",
  borderRadius: 14,
  fontSize: 12,
  fontWeight: 700,
  color: "#ecfdf5",
} as const;

const CATEGORY_COLORS = [
  "#34d399",
  "#a3e635",
  "#2dd4bf",
  "#fbbf24",
  "#fb7185",
  "#60a5fa",
  "#c084fc",
  "#f472b6",
  "#94a3b8",
  "#f97316",
  "#22d3ee",
  "#eab308",
  "#4ade80",
  "#38bdf8",
  "#a78bfa",
  "#f43f5e",
];

function ChartFrame({
  title,
  subtitle,
  children,
  wide,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <section className="rounded-[1.5rem] border border-white/10 bg-white/[0.055] p-4 backdrop-blur-xl sm:p-5">
      <div className="mb-3">
        <h3 className="text-sm font-black text-white">{title}</h3>
        {subtitle ? <p className="mt-0.5 text-xs font-semibold text-emerald-100/50">{subtitle}</p> : null}
      </div>
      <div className={`-mx-1 overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch] ${wide ? "touch-pan-x" : ""}`}>
        <div className={wide ? "min-w-[520px]" : "min-w-0"}>{children}</div>
      </div>
    </section>
  );
}

export function IncomeVsExpenseChart({ data }: { data: HistoricalMonthPoint[] }) {
  const chartData = useMemo(
    () =>
      data.map((m) => ({
        label: m.shortLabel,
        income: m.income,
        expenses: m.expense,
        net: m.netCashflow,
        hasData: m.hasData,
      })),
    [data],
  );
  const wide = chartData.length > 8;

  return (
    <ChartFrame title="Income vs Expense" subtitle="Monthly comparison · tap for exact values" wide={wide}>
      <div className="h-56 sm:h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 8, right: 8, left: -8, bottom: 0 }} barGap={2}>
            <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
            <XAxis dataKey="label" tick={{ fill: "rgba(167,243,208,0.55)", fontSize: 10, fontWeight: 700 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
            <YAxis tick={{ fill: "rgba(167,243,208,0.4)", fontSize: 10 }} axisLine={false} tickLine={false} width={48} tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`} />
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(value: number, name: string) => [
                formatNpr(value),
                name === "income" ? "Income" : name === "expenses" ? "Expenses" : "Net cashflow",
              ]}
            />
            <Legend wrapperStyle={{ fontSize: 11, fontWeight: 700 }} />
            <Bar dataKey="income" fill="#a3e635" radius={[6, 6, 0, 0]} maxBarSize={18} />
            <Bar dataKey="expenses" fill="#fb7185" radius={[6, 6, 0, 0]} maxBarSize={18} />
            <Bar dataKey="net" fill="#34d399" radius={[6, 6, 0, 0]} maxBarSize={18} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartFrame>
  );
}

export function ExpenseTrendChart({ data }: { data: HistoricalMonthPoint[] }) {
  const chartData = useMemo(() => data.map((m) => ({ label: m.shortLabel, expenses: m.expense })), [data]);
  const wide = chartData.length > 8;

  return (
    <ChartFrame title="Expense trend" subtitle="Monthly expense history" wide={wide}>
      <div className="h-48 sm:h-56">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
            <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
            <XAxis dataKey="label" tick={{ fill: "rgba(167,243,208,0.55)", fontSize: 10, fontWeight: 700 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
            <YAxis tick={{ fill: "rgba(167,243,208,0.4)", fontSize: 10 }} axisLine={false} tickLine={false} width={48} tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`} />
            <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [formatNpr(value), "Expenses"]} />
            <Line type="monotone" dataKey="expenses" stroke="#fb7185" strokeWidth={2.5} dot={{ r: 3, fill: "#fecdd3" }} activeDot={{ r: 5 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </ChartFrame>
  );
}

export function IncomeTrendChart({ data }: { data: HistoricalMonthPoint[] }) {
  const chartData = useMemo(() => data.map((m) => ({ label: m.shortLabel, income: m.income })), [data]);
  const wide = chartData.length > 8;

  return (
    <ChartFrame title="Income trend" subtitle="Monthly income history" wide={wide}>
      <div className="h-48 sm:h-56">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
            <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
            <XAxis dataKey="label" tick={{ fill: "rgba(167,243,208,0.55)", fontSize: 10, fontWeight: 700 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
            <YAxis tick={{ fill: "rgba(167,243,208,0.4)", fontSize: 10 }} axisLine={false} tickLine={false} width={48} tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`} />
            <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [formatNpr(value), "Income"]} />
            <Line type="monotone" dataKey="income" stroke="#a3e635" strokeWidth={2.5} dot={{ r: 3, fill: "#ecfccb" }} activeDot={{ r: 5 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </ChartFrame>
  );
}

export function NetCashflowTrendChart({ data }: { data: HistoricalMonthPoint[] }) {
  const chartData = useMemo(
    () =>
      data.map((m) => ({
        label: m.shortLabel,
        net: m.netCashflow,
        positive: Math.max(0, m.netCashflow),
        negative: Math.min(0, m.netCashflow),
      })),
    [data],
  );
  const wide = chartData.length > 8;

  return (
    <ChartFrame title="Net cashflow trend" subtitle="Positive and negative months" wide={wide}>
      <div className="h-48 sm:h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
            <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
            <XAxis dataKey="label" tick={{ fill: "rgba(167,243,208,0.55)", fontSize: 10, fontWeight: 700 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
            <YAxis tick={{ fill: "rgba(167,243,208,0.4)", fontSize: 10 }} axisLine={false} tickLine={false} width={48} tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`} />
            <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [formatNpr(value), "Net"]} />
            <Bar dataKey="positive" stackId="net" fill="#34d399" radius={[6, 6, 0, 0]} maxBarSize={20} name="Surplus" />
            <Bar dataKey="negative" stackId="net" fill="#fb7185" radius={[0, 0, 6, 6]} maxBarSize={20} name="Deficit" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartFrame>
  );
}

export function ExpenseCategoriesChart({ data }: { data: CategoryBreakdownItem[] }) {
  const chartData = useMemo(() => data.filter((d) => d.amount > 0), [data]);

  if (chartData.length === 0) {
    return (
      <ChartFrame title="Expense categories" subtitle="Food, Housing, Transport, and more">
        <div className="flex h-40 items-center justify-center rounded-2xl border border-dashed border-white/10 bg-black/15 px-4 text-center text-xs font-semibold text-emerald-100/50">
          No expense category data for this period.
        </div>
      </ChartFrame>
    );
  }

  return (
    <ChartFrame title="Expense categories" subtitle="Breakdown by FireNepal categories">
      <div className="h-56 sm:h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={chartData} dataKey="amount" nameKey="label" cx="50%" cy="50%" innerRadius={48} outerRadius={78} paddingAngle={2}>
              {chartData.map((entry, index) => (
                <Cell key={entry.category} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} stroke="rgba(0,0,0,0.25)" />
              ))}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} formatter={(value: number, _n, item) => [formatNpr(value), String(item?.payload?.label ?? "Category")]} />
            <Legend wrapperStyle={{ fontSize: 11, fontWeight: 700 }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </ChartFrame>
  );
}

export function IncomeSourcesChart({ data }: { data: IncomeSourceBreakdownItem[] }) {
  const chartData = useMemo(() => data.filter((d) => d.amount > 0), [data]);

  if (chartData.length === 0) {
    return (
      <ChartFrame title="Income sources" subtitle="Salary, freelance, and other sources">
        <div className="flex h-40 items-center justify-center rounded-2xl border border-dashed border-white/10 bg-black/15 px-4 text-center text-xs font-semibold text-emerald-100/50">
          No income source data for this period.
        </div>
      </ChartFrame>
    );
  }

  return (
    <ChartFrame title="Income sources" subtitle="Breakdown by income type">
      <div className="h-48 sm:h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 12, left: 8, bottom: 0 }}>
            <CartesianGrid stroke="rgba(255,255,255,0.06)" horizontal={false} />
            <XAxis type="number" tick={{ fill: "rgba(167,243,208,0.4)", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`} />
            <YAxis type="category" dataKey="label" width={88} tick={{ fill: "rgba(167,243,208,0.7)", fontSize: 10, fontWeight: 700 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [formatNpr(value), "Income"]} />
            <Bar dataKey="amount" fill="#a3e635" radius={[0, 8, 8, 0]} maxBarSize={18} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartFrame>
  );
}

export function YearOverYearChart({ data }: { data: HistoricalYearPoint[] }) {
  const chartData = useMemo(
    () =>
      data.map((y) => ({
        label: y.label,
        income: y.income,
        expenses: y.expense,
        net: y.netCashflow,
      })),
    [data],
  );

  if (chartData.length === 0) {
    return (
      <ChartFrame title="Year-over-year" subtitle="Income, expenses, and net cashflow">
        <div className="flex h-40 items-center justify-center rounded-2xl border border-dashed border-white/10 bg-black/15 px-4 text-center text-xs font-semibold text-emerald-100/50">
          No yearly comparison data yet.
        </div>
      </ChartFrame>
    );
  }

  return (
    <ChartFrame title="Year-over-year" subtitle="Compare selected years">
      <div className="h-56 sm:h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 8, right: 8, left: -8, bottom: 0 }} barGap={2}>
            <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
            <XAxis dataKey="label" tick={{ fill: "rgba(167,243,208,0.55)", fontSize: 11, fontWeight: 700 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "rgba(167,243,208,0.4)", fontSize: 10 }} axisLine={false} tickLine={false} width={48} tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`} />
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(value: number, name: string) => [
                formatNpr(value),
                name === "income" ? "Income" : name === "expenses" ? "Expenses" : "Net cashflow",
              ]}
            />
            <Legend wrapperStyle={{ fontSize: 11, fontWeight: 700 }} />
            <Bar dataKey="income" fill="#a3e635" radius={[6, 6, 0, 0]} maxBarSize={28} />
            <Bar dataKey="expenses" fill="#fb7185" radius={[6, 6, 0, 0]} maxBarSize={28} />
            <Bar dataKey="net" fill="#34d399" radius={[6, 6, 0, 0]} maxBarSize={28} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartFrame>
  );
}
