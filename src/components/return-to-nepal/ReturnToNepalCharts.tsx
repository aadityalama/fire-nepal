"use client";

import { useId, useMemo } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useFireTheme } from "@/contexts/FireThemeContext";
import { formatNprInteger } from "@/components/savings-tracker/savings-currency";
import type { PlannerSnapshot } from "@/lib/return-to-nepal/planner-engine";

type Props = {
  snapshot: PlannerSnapshot;
  chartsReady: boolean;
};

function Skeleton({ light }: { light: boolean }) {
  return (
    <div
      className={`wealth-chart-card flex h-[220px] flex-col justify-end gap-3 p-4 sm:h-[240px] ${
        light ? "border-slate-200/80" : ""
      }`}
    >
      <div className={`h-3 w-32 rounded-full ${light ? "bg-slate-200/90" : "bg-white/10"}`} />
      <div className="flex flex-1 items-end gap-2">
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className={`flex-1 rounded-t-md motion-safe:animate-pulse ${light ? "bg-teal-200/50" : "bg-teal-500/20"}`}
            style={{ height: `${24 + ((i * 13) % 52)}%`, animationDelay: `${i * 70}ms` }}
          />
        ))}
      </div>
    </div>
  );
}

export function ReturnToNepalCharts({ snapshot, chartsReady }: Props) {
  const { resolvedTheme } = useFireTheme();
  const light = resolvedTheme === "light";
  const gid = useId().replace(/:/g, "");

  const corpusData = useMemo(
    () => snapshot.timeline.map((t) => ({ label: String(t.year), npr: t.corpusNpr })),
    [snapshot.timeline],
  );

  const gapData = useMemo(
    () => [
      { name: "Future need", v: Math.round(snapshot.monthlyNepalLivingFutureNpr + 1) },
      { name: "Passive", v: Math.round(snapshot.passiveMonthlyFutureNpr) },
    ],
    [snapshot.monthlyNepalLivingFutureNpr, snapshot.passiveMonthlyFutureNpr],
  );

  const tickColor = light ? "#64748b" : "#cbd5e1";
  const gridColor = light ? "rgba(15, 23, 42, 0.08)" : "rgba(255,255,255,0.09)";
  const tooltipBg = light ? "rgba(255,255,255,0.96)" : "rgba(7, 18, 26, 0.94)";
  const tooltipBorder = light ? "rgba(45, 212, 191, 0.28)" : "rgba(79, 255, 209, 0.28)";

  const axisProps = {
    stroke: tickColor,
    tick: { fill: tickColor, fontSize: 11, fontWeight: 700 },
    tickLine: false,
    axisLine: { stroke: gridColor },
  } as const;

  if (!chartsReady) {
    return (
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton light={light} />
        <Skeleton light={light} />
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className={`wealth-chart-card p-3 sm:p-4 ${light ? "border-slate-200/80" : ""}`}>
        <p className={`mb-1 text-[11px] font-bold uppercase tracking-[0.14em] ${light ? "text-teal-800" : "fn-txt-muted"}`}>
          Korea corpus → NPR
        </p>
        <p className={`mb-3 text-xs font-semibold ${light ? "text-slate-600" : "fn-txt-secondary"}`}>
          Modelled path with contributions + modest portfolio return.
        </p>
        <div className="h-[220px] w-full sm:h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={corpusData} margin={{ top: 8, right: 8, left: -4, bottom: 0 }}>
              <defs>
                <linearGradient id={`rtnCorpus${gid}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={light ? "#0d9488" : "#2dd4bf"} stopOpacity={0.45} />
                  <stop offset="100%" stopColor={light ? "#059669" : "#10b981"} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={gridColor} vertical={false} />
              <XAxis dataKey="label" {...axisProps} />
              <YAxis {...axisProps} tickFormatter={(v) => `${Math.round(Number(v) / 1_000_000)}M`} width={44} />
              <Tooltip
                contentStyle={{
                  background: tooltipBg,
                  border: `1px solid ${tooltipBorder}`,
                  borderRadius: 14,
                  fontSize: 12,
                  fontWeight: 700,
                  color: light ? "#0f172a" : "#e2e8f0",
                }}
                formatter={(value: number) => [formatNprInteger(value), "Corpus"]}
              />
              <Area type="monotone" dataKey="npr" stroke={light ? "#0f766e" : "#5eead4"} fill={`url(#rtnCorpus${gid})`} strokeWidth={2.2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className={`wealth-chart-card p-3 sm:p-4 ${light ? "border-slate-200/80" : ""}`}>
        <p className={`mb-1 text-[11px] font-bold uppercase tracking-[0.14em] ${light ? "text-emerald-800" : "fn-txt-muted"}`}>
          Nepal expense vs passive
        </p>
        <p className={`mb-3 text-xs font-semibold ${light ? "text-slate-600" : "fn-txt-secondary"}`}>
          Inflated to your target return year for apples-to-apples intuition.
        </p>
        <div className="h-[220px] w-full sm:h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={gapData} margin={{ top: 8, right: 8, left: -4, bottom: 0 }}>
              <CartesianGrid stroke={gridColor} vertical={false} />
              <XAxis dataKey="name" {...axisProps} />
              <YAxis {...axisProps} tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`} width={40} />
              <Tooltip
                contentStyle={{
                  background: tooltipBg,
                  border: `1px solid ${tooltipBorder}`,
                  borderRadius: 14,
                  fontSize: 12,
                  fontWeight: 700,
                  color: light ? "#0f172a" : "#e2e8f0",
                }}
                formatter={(value: number) => [formatNprInteger(value), "NPR / mo"]}
              />
              <Legend wrapperStyle={{ fontSize: 11, fontWeight: 800, color: light ? "#334155" : "#e2e8f0" }} />
              <Bar dataKey="v" name="Monthly" fill={light ? "#0d9488" : "#34d399"} radius={[10, 10, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
