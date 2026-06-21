"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { DashboardSectionHeader } from "@/components/DashboardSectionHeader";
import { FireBizEmptyState, FireBizGlassCard } from "@/components/fire-biz/FireBizUiPrimitives";
import { useFireBiz, useFireBizCopy } from "@/contexts/FireBizContext";
import { useFireTheme } from "@/contexts/FireThemeContext";
import { computeFireBizAnalytics } from "@/lib/fire-biz/analytics";
import { computeProfitLoss, defaultProfitLossRange } from "@/lib/fire-biz/profit-loss";
import { formatBizNpr } from "@/lib/fire-biz/i18n";
import { BarChart3 } from "lucide-react";

export function FireBizReportsPage() {
  const copy = useFireBizCopy();
  const r = copy.reports;
  const { summary, sales, purchases, transactions, customers } = useFireBiz();
  const { resolvedTheme } = useFireTheme();
  const light = resolvedTheme === "light";

  const analytics = useMemo(
    () => computeFireBizAnalytics(sales, purchases, transactions, customers, summary),
    [sales, purchases, transactions, customers, summary],
  );

  const tickColor = light ? "#64748b" : "#cbd5e1";
  const gridColor = light ? "rgba(15, 23, 42, 0.08)" : "rgba(255,255,255, 0.06)";
  const tooltipBg = light ? "rgba(255,255,255,0.96)" : "rgba(3, 8, 6, 0.94)";
  const tooltipBorder = light ? "rgba(16, 185, 129, 0.25)" : "rgba(52, 211, 153, 0.2)";

  const profit = useMemo(() => {
    const range = defaultProfitLossRange();
    return computeProfitLoss(sales, purchases, transactions, range.from, range.to).netProfit;
  }, [sales, purchases, transactions]);
  const hasData = sales.length > 0 || purchases.length > 0 || transactions.length > 0;

  return (
    <div className="space-y-6">
      <DashboardSectionHeader eyebrow={copy.moduleName} title={r.title} subtitle={r.subtitle} accent="teal" />

      <div className="flex flex-wrap gap-2">
        <Link href="/fire-biz/reports/profit-loss" className="inline-flex min-h-[44px] items-center rounded-xl border border-emerald-400/25 bg-emerald-500/10 px-4 text-sm font-bold text-emerald-300 hover:bg-emerald-500/20">
          {r.profitLossLink}
        </Link>
        <Link href="/fire-biz/reports/vat" className="inline-flex min-h-[44px] items-center rounded-xl border border-emerald-400/25 bg-emerald-500/10 px-4 text-sm font-bold text-emerald-300 hover:bg-emerald-500/20">
          {r.vatReportLink}
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className={`rounded-2xl border p-4 ${light ? "border-emerald-200/70 bg-white/90" : "border-emerald-400/15 bg-emerald-950/35"}`}>
          <p className="text-[10px] font-black uppercase tracking-wider text-emerald-200/70">Sales</p>
          <p className="mt-1 text-xl font-black tabular-nums">{formatBizNpr(summary.totalSales)}</p>
        </div>
        <div className={`rounded-2xl border p-4 ${light ? "border-emerald-200/70 bg-white/90" : "border-emerald-400/15 bg-emerald-950/35"}`}>
          <p className="text-[10px] font-black uppercase tracking-wider text-emerald-200/70">Purchases</p>
          <p className="mt-1 text-xl font-black tabular-nums">{formatBizNpr(summary.totalPurchases)}</p>
        </div>
        <div className={`rounded-2xl border p-4 ${light ? "border-emerald-200/70 bg-white/90" : "border-emerald-400/15 bg-emerald-950/35"}`}>
          <p className="text-[10px] font-black uppercase tracking-wider text-emerald-200/70">{r.profitOverview}</p>
          <p className={`mt-1 text-xl font-black tabular-nums ${profit >= 0 ? "text-lime-400" : "text-rose-400"}`}>
            {formatBizNpr(profit)}
          </p>
        </div>
      </div>

      <FireBizGlassCard title={r.salesTrend} subtitle={!hasData ? copy.dashboard.noChartData : undefined} icon={BarChart3}>
        {!hasData ? (
          <FireBizEmptyState message={copy.dashboard.noChartData} />
        ) : (
          <div className={`h-[240px] rounded-xl p-2 ${light ? "bg-slate-50/80" : "bg-black/25"}`}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analytics.salesTrend} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="reportsSalesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#34d399" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#34d399" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={gridColor} strokeDasharray="3 3" />
                <XAxis dataKey="month" stroke={tickColor} tick={{ fill: tickColor, fontSize: 11 }} tickLine={false} />
                <YAxis stroke={tickColor} tick={{ fill: tickColor, fontSize: 11 }} tickLine={false} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                <Tooltip contentStyle={{ background: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: 12, fontSize: 12 }} formatter={(v: number) => formatBizNpr(v)} />
                <Area type="monotone" dataKey="sales" stroke="#34d399" fill="url(#reportsSalesGrad)" strokeWidth={2} name="Sales" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </FireBizGlassCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <FireBizGlassCard title={r.purchaseBreakdown} icon={BarChart3}>
          {analytics.expenseBreakdown.length === 0 ? (
            <FireBizEmptyState message={copy.analytics.noExpenses} />
          ) : (
            <div className={`h-[220px] rounded-xl p-2 ${light ? "bg-slate-50/80" : "bg-black/25"}`}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.expenseBreakdown} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid stroke={gridColor} strokeDasharray="3 3" />
                  <XAxis dataKey="name" stroke={tickColor} tick={{ fill: tickColor, fontSize: 11 }} tickLine={false} />
                  <YAxis stroke={tickColor} tick={{ fill: tickColor, fontSize: 11 }} tickLine={false} />
                  <Tooltip contentStyle={{ background: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: 12, fontSize: 12 }} formatter={(v: number) => formatBizNpr(v)} />
                  <Bar dataKey="value" fill="#14b8a6" radius={[6, 6, 0, 0]} name="Amount" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </FireBizGlassCard>

        <FireBizGlassCard title={r.profitOverview} icon={BarChart3}>
          {analytics.profitOverview.every((p) => p.profit === 0 && p.sales === 0) ? (
            <FireBizEmptyState message={copy.dashboard.noChartData} />
          ) : (
            <div className={`h-[220px] rounded-xl p-2 ${light ? "bg-slate-50/80" : "bg-black/25"}`}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={analytics.profitOverview} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid stroke={gridColor} strokeDasharray="3 3" />
                  <XAxis dataKey="month" stroke={tickColor} tick={{ fill: tickColor, fontSize: 11 }} tickLine={false} />
                  <YAxis stroke={tickColor} tick={{ fill: tickColor, fontSize: 11 }} tickLine={false} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                  <Tooltip contentStyle={{ background: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: 12, fontSize: 12 }} formatter={(v: number) => formatBizNpr(v)} />
                  <Line type="monotone" dataKey="profit" stroke="#34d399" strokeWidth={2} dot={false} name="Profit" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </FireBizGlassCard>
      </div>
    </div>
  );
}
