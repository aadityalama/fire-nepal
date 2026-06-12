"use client";

import { useId, useMemo } from "react";
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
import { useFireTheme } from "@/contexts/FireThemeContext";
import {
  FIRE_PROGRESS_SERIES,
  MONTHLY_SAVINGS_SERIES,
  YEARLY_GROWTH,
} from "@/components/savings-tracker/savings-tracker-data";
import { formatNprAxisShort, formatNprInteger } from "@/components/savings-tracker/savings-currency";

function ChartSkeleton({ light }: { light: boolean }) {
  return (
    <div
      className={`wealth-chart-card flex h-[220px] flex-col justify-end gap-3 p-4 sm:h-[240px] ${
        light ? "border-slate-200/80" : ""
      }`}
    >
      <div className={`h-3 w-28 rounded-full ${light ? "bg-slate-200/90" : "bg-white/10"}`} />
      <div className="flex flex-1 items-end gap-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className={`flex-1 rounded-t-md motion-safe:animate-pulse ${light ? "bg-emerald-200/50" : "bg-emerald-500/20"}`}
            style={{
              height: `${28 + ((i * 17) % 55)}%`,
              animationDelay: `${i * 80}ms`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

type SavingsChartsBlockProps = {
  chartsReady: boolean;
};

export function SavingsChartsBlock({ chartsReady }: SavingsChartsBlockProps) {
  const { resolvedTheme } = useFireTheme();
  const light = resolvedTheme === "light";
  const gid = useId().replace(/:/g, "");

  const monthly = useMemo(() => MONTHLY_SAVINGS_SERIES.map((m) => ({ ...m })), []);

  const tickColor = light ? "#64748b" : "#a1a1aa";
  const gridColor = light ? "rgba(15, 23, 42, 0.08)" : "rgba(255,255,255, 0.06)";
  const tooltipBg = light ? "rgba(255,255,255,0.96)" : "rgba(3, 8, 6, 0.94)";
  const tooltipBorder = light ? "rgba(16, 185, 129, 0.25)" : "rgba(52, 211, 153, 0.2)";

  const axisProps = {
    stroke: tickColor,
    tick: { fill: tickColor, fontSize: 11, fontWeight: 700 },
    tickLine: false,
    axisLine: { stroke: gridColor },
  } as const;

  if (!chartsReady) {
    return (
      <div className="grid gap-4 lg:grid-cols-3">
        <ChartSkeleton light={light} />
        <ChartSkeleton light={light} />
        <ChartSkeleton light={light} />
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className={`wealth-chart-card p-3 sm:p-4 ${light ? "border-slate-200/70 shadow-sm" : ""}`}>
        <p className={`mb-1 text-[11px] font-black uppercase tracking-[0.16em] ${light ? "text-emerald-700/90" : "fn-txt-muted"}`}>
          Monthly trend
        </p>
        <p className={`mb-3 text-sm font-bold ${light ? "text-slate-600" : "fn-txt-secondary"}`}>Savings (NPR)</p>
        <div className="h-[200px] w-full min-w-0 sm:h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={monthly} margin={{ top: 6, right: 6, left: -18, bottom: 0 }}>
              <defs>
                <linearGradient id={`${gid}-m`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#34d399" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="#059669" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 6" stroke={gridColor} vertical={false} />
              <XAxis dataKey="label" {...axisProps} />
              <YAxis {...axisProps} tickFormatter={(v) => formatNprAxisShort(Number(v))} width={44} />
              <Tooltip
                contentStyle={{
                  background: tooltipBg,
                  border: `1px solid ${tooltipBorder}`,
                  borderRadius: 14,
                  fontSize: 12,
                  fontWeight: 700,
                  color: light ? "#0f172a" : "#e2e8f0",
                }}
                formatter={(value: number) => [formatNprInteger(value), "Saved"]}
              />
              <Area
                type="monotone"
                dataKey="savingsNpr"
                stroke="#10b981"
                strokeWidth={2.25}
                fill={`url(#${gid}-m)`}
                isAnimationActive
                animationDuration={980}
                animationEasing="ease-out"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className={`wealth-chart-card p-3 sm:p-4 ${light ? "border-slate-200/70 shadow-sm" : ""}`}>
        <p className={`mb-1 text-[11px] font-black uppercase tracking-[0.16em] ${light ? "text-emerald-700/90" : "fn-txt-muted"}`}>
          Yearly growth
        </p>
        <p className={`mb-3 text-sm font-bold ${light ? "text-slate-600" : "fn-txt-secondary"}`}>Cumulative corpus (NPR)</p>
        <div className="h-[200px] w-full min-w-0 sm:h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={[...YEARLY_GROWTH]} margin={{ top: 6, right: 6, left: -18, bottom: 0 }}>
              <defs>
                <linearGradient id={`${gid}-b`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#5eead4" />
                  <stop offset="100%" stopColor="#047857" />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 6" stroke={gridColor} vertical={false} />
              <XAxis dataKey="year" {...axisProps} />
              <YAxis {...axisProps} tickFormatter={(v) => formatNprAxisShort(Number(v))} width={44} />
              <Tooltip
                contentStyle={{
                  background: tooltipBg,
                  border: `1px solid ${tooltipBorder}`,
                  borderRadius: 14,
                  fontSize: 12,
                  fontWeight: 700,
                  color: light ? "#0f172a" : "#e2e8f0",
                }}
                formatter={(value: number) => [formatNprInteger(value), "Total"]}
              />
              <Bar
                dataKey="cumulativeNpr"
                fill={`url(#${gid}-b)`}
                radius={[10, 10, 4, 4]}
                isAnimationActive
                animationDuration={900}
                animationEasing="ease-out"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className={`wealth-chart-card p-3 sm:p-4 ${light ? "border-slate-200/70 shadow-sm" : ""}`}>
        <p className={`mb-1 text-[11px] font-black uppercase tracking-[0.16em] ${light ? "text-emerald-700/90" : "fn-txt-muted"}`}>
          FIRE glide path
        </p>
        <p className={`mb-3 text-sm font-bold ${light ? "text-slate-600" : "fn-txt-secondary"}`}>Actual vs projected (NPR)</p>
        <div className="h-[200px] w-full min-w-0 sm:h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={FIRE_PROGRESS_SERIES} margin={{ top: 6, right: 6, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 6" stroke={gridColor} />
              <XAxis dataKey="month" {...axisProps} />
              <YAxis {...axisProps} tickFormatter={(v) => formatNprAxisShort(Number(v))} width={48} />
              <Tooltip
                contentStyle={{
                  background: tooltipBg,
                  border: `1px solid ${tooltipBorder}`,
                  borderRadius: 14,
                  fontSize: 12,
                  fontWeight: 700,
                  color: light ? "#0f172a" : "#e2e8f0",
                }}
                formatter={(value: number) => formatNprInteger(value)}
              />
              <Legend
                wrapperStyle={{ fontSize: 11, fontWeight: 800, paddingTop: 4 }}
                formatter={(v) => <span className={light ? "text-slate-700" : "fn-txt-secondary"}>{v}</span>}
              />
              <Line
                type="monotone"
                dataKey="actual"
                name="Actual"
                stroke="#34d399"
                strokeWidth={2.5}
                dot={{ r: 3, strokeWidth: 0, fill: "#6ee7b7" }}
                activeDot={{ r: 5 }}
                isAnimationActive
                animationDuration={1000}
              />
              <Line
                type="monotone"
                dataKey="projected"
                name="Projected"
                stroke="#a3e635"
                strokeWidth={2}
                strokeDasharray="6 5"
                dot={false}
                isAnimationActive
                animationDuration={1000}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
