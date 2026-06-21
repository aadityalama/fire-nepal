"use client";

import { useMemo } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { DashboardSectionHeader } from "@/components/DashboardSectionHeader";
import { FireBizGlassCard } from "@/components/fire-biz/FireBizUiPrimitives";
import { useFireBiz, useFireBizCopy } from "@/contexts/FireBizContext";
import { useFireTheme } from "@/contexts/FireThemeContext";
import { formatBizNpr } from "@/lib/fire-biz/i18n";
import { BarChart3 } from "lucide-react";

const PLACEHOLDER_SALES = [
  { month: "Shrawan", sales: 85000, purchases: 42000 },
  { month: "Bhadra", sales: 92000, purchases: 48000 },
  { month: "Ashwin", sales: 78000, purchases: 51000 },
  { month: "Kartik", sales: 105000, purchases: 55000 },
  { month: "Mangsir", sales: 98000, purchases: 47000 },
  { month: "Poush", sales: 112000, purchases: 62000 },
];

const PLACEHOLDER_CATEGORIES = [
  { name: "Inventory", value: 45 },
  { name: "Rent", value: 20 },
  { name: "Utilities", value: 12 },
  { name: "Transport", value: 15 },
  { name: "Other", value: 8 },
];

export function FireBizReportsPage() {
  const copy = useFireBizCopy();
  const r = copy.reports;
  const { summary, sales, purchases } = useFireBiz();
  const { resolvedTheme } = useFireTheme();
  const light = resolvedTheme === "light";

  const salesTrend = useMemo(() => {
    if (sales.length === 0) return PLACEHOLDER_SALES;
    const byMonth = new Map<string, number>();
    for (const s of sales) {
      const key = s.sale_date.slice(0, 7);
      byMonth.set(key, (byMonth.get(key) ?? 0) + Number(s.total_amount));
    }
    return Array.from(byMonth.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([month, salesAmt]) => ({ month, sales: salesAmt, purchases: 0 }));
  }, [sales]);

  const purchaseBreakdown = useMemo(() => {
    if (purchases.length === 0) return PLACEHOLDER_CATEGORIES;
    const total = purchases.reduce((s, p) => s + Number(p.total_amount), 0);
    return [{ name: "Purchases", value: total > 0 ? 100 : 0 }];
  }, [purchases]);

  const tickColor = light ? "#64748b" : "#cbd5e1";
  const gridColor = light ? "rgba(15, 23, 42, 0.08)" : "rgba(255,255,255, 0.06)";
  const tooltipBg = light ? "rgba(255,255,255,0.96)" : "rgba(3, 8, 6, 0.94)";
  const tooltipBorder = light ? "rgba(16, 185, 129, 0.25)" : "rgba(52, 211, 153, 0.2)";

  const profit = summary.totalSales - summary.totalPurchases;

  return (
    <div className="space-y-6">
      <DashboardSectionHeader eyebrow={copy.moduleName} title={r.title} subtitle={r.subtitle} accent="teal" />

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

      <FireBizGlassCard title={r.salesTrend} subtitle={sales.length === 0 ? r.placeholder : undefined} icon={BarChart3}>
        <div className={`h-[240px] rounded-xl p-2 ${light ? "bg-slate-50/80" : "bg-black/25"}`}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={salesTrend} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#34d399" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#34d399" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={gridColor} strokeDasharray="3 3" />
              <XAxis dataKey="month" stroke={tickColor} tick={{ fill: tickColor, fontSize: 11 }} tickLine={false} />
              <YAxis stroke={tickColor} tick={{ fill: tickColor, fontSize: 11 }} tickLine={false} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
              <Tooltip
                contentStyle={{ background: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: 12, fontSize: 12 }}
                formatter={(v: number) => formatBizNpr(v)}
              />
              <Area type="monotone" dataKey="sales" stroke="#34d399" fill="url(#salesGrad)" strokeWidth={2} name="Sales" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </FireBizGlassCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <FireBizGlassCard title={r.purchaseBreakdown} subtitle={r.placeholder} icon={BarChart3}>
          <div className={`h-[220px] rounded-xl p-2 ${light ? "bg-slate-50/80" : "bg-black/25"}`}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={purchaseBreakdown} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid stroke={gridColor} strokeDasharray="3 3" />
                <XAxis dataKey="name" stroke={tickColor} tick={{ fill: tickColor, fontSize: 11 }} tickLine={false} />
                <YAxis stroke={tickColor} tick={{ fill: tickColor, fontSize: 11 }} tickLine={false} />
                <Tooltip contentStyle={{ background: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: 12, fontSize: 12 }} />
                <Bar dataKey="value" fill="#14b8a6" radius={[6, 6, 0, 0]} name="%" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </FireBizGlassCard>

        <FireBizGlassCard title={r.profitOverview} subtitle={r.placeholder} icon={BarChart3}>
          <div className={`h-[220px] rounded-xl p-2 ${light ? "bg-slate-50/80" : "bg-black/25"}`}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={PLACEHOLDER_SALES} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid stroke={gridColor} strokeDasharray="3 3" />
                <XAxis dataKey="month" stroke={tickColor} tick={{ fill: tickColor, fontSize: 11 }} tickLine={false} />
                <YAxis stroke={tickColor} tick={{ fill: tickColor, fontSize: 11 }} tickLine={false} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                <Tooltip contentStyle={{ background: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: 12, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="sales" stroke="#34d399" strokeWidth={2} dot={false} name="Sales" />
                <Line type="monotone" dataKey="purchases" stroke="#f59e0b" strokeWidth={2} dot={false} name="Purchases" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </FireBizGlassCard>
      </div>
    </div>
  );
}
