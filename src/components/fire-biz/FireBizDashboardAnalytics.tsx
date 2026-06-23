"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BarChart3, Package, Users } from "lucide-react";
import { FireBizEmptyState, FireBizGlassCard } from "@/components/fire-biz/FireBizUiPrimitives";
import { useFireBizCopy } from "@/contexts/FireBizContext";
import { useFireTheme } from "@/contexts/FireThemeContext";
import { formatBizNpr } from "@/lib/fire-biz/i18n";
import type { FireBizAnalytics } from "@/lib/fire-biz/types";

const PIE_COLORS = ["#34d399", "#14b8a6", "#f59e0b", "#fb7185", "#818cf8", "#94a3b8"];

type Props = {
  analytics: FireBizAnalytics;
  loading: boolean;
  variant?: "full" | "more";
};

export function FireBizDashboardAnalytics({ analytics, loading, variant = "full" }: Props) {
  const copy = useFireBizCopy();
  const a = copy.analytics;
  const dash = copy.dashboard;
  const { resolvedTheme } = useFireTheme();
  const light = resolvedTheme === "light";

  const tickColor = light ? "#64748b" : "#cbd5e1";
  const gridColor = light ? "rgba(15, 23, 42, 0.08)" : "rgba(255,255,255, 0.06)";
  const tooltipBg = light ? "rgba(255,255,255,0.96)" : "rgba(3, 8, 6, 0.94)";
  const tooltipBorder = light ? "rgba(16, 185, 129, 0.25)" : "rgba(52, 211, 153, 0.2)";

  const hasSalesTrend = analytics.salesTrend.some((r) => r.sales > 0 || r.purchases > 0);
  const hasExpenses = analytics.expenseBreakdown.length > 0;
  const hasProfit = analytics.profitOverview.some((r) => r.profit !== 0 || r.sales > 0);
  const hasCustomers = analytics.topCustomers.length > 0;
  const showExtended = variant === "full";

  if (loading) {
    return (
      <FireBizGlassCard title={dash.analytics} icon={BarChart3}>
        <p className="text-sm font-semibold text-emerald-200/60">{copy.common.loading}</p>
      </FireBizGlassCard>
    );
  }

  return (
    <div className="space-y-3">
      {showExtended ? (
        <h2 className="text-sm font-black uppercase tracking-[0.18em] text-emerald-400/80">{dash.analytics}</h2>
      ) : null}

      <div className={`grid gap-3 ${showExtended ? "xl:grid-cols-2" : ""}`}>
        <FireBizGlassCard title={a.salesTrend} icon={BarChart3}>
          {!hasSalesTrend ? (
            <FireBizEmptyState message={dash.noChartData} />
          ) : (
            <div className={`h-[200px] rounded-xl p-2 ${light ? "bg-slate-50/80" : "bg-black/25"}`}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analytics.salesTrend} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <defs>
                    <linearGradient id="bizSalesGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#34d399" stopOpacity={0.45} />
                      <stop offset="100%" stopColor="#34d399" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke={gridColor} strokeDasharray="3 3" />
                  <XAxis dataKey="month" stroke={tickColor} tick={{ fill: tickColor, fontSize: 11 }} tickLine={false} />
                  <YAxis stroke={tickColor} tick={{ fill: tickColor, fontSize: 11 }} tickLine={false} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                  <Tooltip contentStyle={{ background: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: 12, fontSize: 12 }} formatter={(v: number) => formatBizNpr(v)} />
                  <Area type="monotone" dataKey="sales" stroke="#34d399" fill="url(#bizSalesGrad)" strokeWidth={2} name="Sales" />
                  <Area type="monotone" dataKey="purchases" stroke="#14b8a6" fill="transparent" strokeWidth={2} name="Purchases" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </FireBizGlassCard>

        <FireBizGlassCard title={a.expenseBreakdown} icon={BarChart3}>
          {!hasExpenses ? (
            <FireBizEmptyState message={a.noExpenses} />
          ) : (
            <div className={`h-[200px] rounded-xl p-2 ${light ? "bg-slate-50/80" : "bg-black/25"}`}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={analytics.expenseBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={52} outerRadius={78} paddingAngle={2}>
                    {analytics.expenseBreakdown.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: 12, fontSize: 12 }} formatter={(v: number) => formatBizNpr(v)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </FireBizGlassCard>

        <FireBizGlassCard title={a.profitOverview} icon={BarChart3}>
          {!hasProfit ? (
            <FireBizEmptyState message={dash.noChartData} />
          ) : (
            <div className={`h-[180px] rounded-xl p-2 ${light ? "bg-slate-50/80" : "bg-black/25"}`}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={analytics.profitOverview} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid stroke={gridColor} strokeDasharray="3 3" />
                  <XAxis dataKey="month" stroke={tickColor} tick={{ fill: tickColor, fontSize: 11 }} tickLine={false} />
                  <YAxis stroke={tickColor} tick={{ fill: tickColor, fontSize: 11 }} tickLine={false} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                  <Tooltip contentStyle={{ background: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: 12, fontSize: 12 }} formatter={(v: number) => formatBizNpr(v)} />
                  <Line type="monotone" dataKey="profit" stroke="#34d399" strokeWidth={2.5} dot={false} name="Profit" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </FireBizGlassCard>
      </div>

      {showExtended ? (
        <>
        <FireBizGlassCard title={a.inventoryValue} icon={Package}>
          <div className={`rounded-2xl border p-6 text-center ${light ? "border-emerald-200/70 bg-emerald-50/50" : "border-emerald-400/15 bg-emerald-950/40"}`}>
            <p className={`text-3xl font-black tabular-nums ${light ? "text-emerald-800" : "text-lime-300"}`}>
              {formatBizNpr(analytics.inventoryValue)}
            </p>
            <p className={`mt-2 text-xs font-semibold ${light ? "text-slate-600" : "text-emerald-200/65"}`}>
              Σ quantity × cost price from inventory_items
            </p>
          </div>
        </FireBizGlassCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <FireBizGlassCard title={a.topCustomers} icon={Users}>
          {!hasCustomers ? (
            <FireBizEmptyState message={a.noCustomers} />
          ) : (
            <ul className="space-y-2">
              {analytics.topCustomers.map((c) => (
                <li
                  key={c.name}
                  className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 ${
                    light ? "border-emerald-200/60 bg-white/80" : "border-emerald-400/10 bg-black/20"
                  }`}
                >
                  <span className={`truncate text-sm font-bold ${light ? "text-slate-900" : "text-emerald-50"}`}>{c.name}</span>
                  <span className="shrink-0 text-sm font-black tabular-nums text-lime-400">{formatBizNpr(c.balance)}</span>
                </li>
              ))}
            </ul>
          )}
        </FireBizGlassCard>

        <FireBizGlassCard title={a.outstandingReceivables} icon={Users}>
          {analytics.outstandingReceivables.length === 0 ? (
            <FireBizEmptyState message={a.noCustomers} />
          ) : (
            <ul className="space-y-2">
              {analytics.outstandingReceivables.map((r) => (
                <li
                  key={r.name}
                  className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 ${
                    light ? "border-amber-200/60 bg-amber-50/40" : "border-amber-400/15 bg-black/20"
                  }`}
                >
                  <div className="min-w-0">
                    <p className={`truncate text-sm font-bold ${light ? "text-slate-900" : "text-emerald-50"}`}>{r.name}</p>
                    <p className={`text-[11px] font-semibold ${light ? "text-slate-500" : "text-emerald-200/55"}`}>{r.dueLabel}</p>
                  </div>
                  <span className="shrink-0 text-sm font-black tabular-nums text-amber-400">{formatBizNpr(r.amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </FireBizGlassCard>
      </div>
        </>
      ) : null}
    </div>
  );
}
