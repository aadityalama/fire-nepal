"use client";

import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useFireTheme } from "@/contexts/FireThemeContext";
import { formatNpr } from "@/components/expense-workspace/expense-workspace-utils";

type ExpenseWorkspaceTrendChartProps = {
  data: Array<{ month: string; spent: number }>;
  ready: boolean;
};

export function ExpenseWorkspaceTrendChart({ data, ready }: ExpenseWorkspaceTrendChartProps) {
  const { resolvedTheme } = useFireTheme();
  const light = resolvedTheme === "light";
  const chartData = useMemo(() => data.map((item) => ({ ...item })), [data]);

  const tickColor = light ? "#64748b" : "#94a3b8";
  const gridColor = light ? "rgba(15, 23, 42, 0.08)" : "rgba(255,255,255, 0.06)";
  const tooltipBg = light ? "rgba(255,255,255,0.96)" : "rgba(3, 8, 6, 0.94)";
  const tooltipBorder = light ? "rgba(16, 185, 129, 0.25)" : "rgba(52, 211, 153, 0.2)";

  if (!ready) {
    return (
      <div className="flex h-40 items-end gap-2">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="flex min-w-0 flex-1 flex-col items-center gap-2">
            <div className="flex w-full items-end rounded-full bg-white/[0.06]" style={{ height: "100%" }}>
              <div
                className="w-full rounded-full bg-emerald-500/20 motion-safe:animate-pulse"
                style={{ height: `${28 + ((index * 17) % 55)}%`, animationDelay: `${index * 80}ms` }}
              />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="h-40 sm:h-44">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 8, right: 4, left: -8, bottom: 0 }}>
          <defs>
            <linearGradient id="expenseWorkspaceTrend" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6ee7b7" stopOpacity={0.95} />
              <stop offset="100%" stopColor="#059669" stopOpacity={0.8} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={gridColor} vertical={false} />
          <XAxis
            dataKey="month"
            stroke={tickColor}
            tick={{ fill: tickColor, fontSize: 11, fontWeight: 700 }}
            tickLine={false}
            axisLine={{ stroke: gridColor }}
          />
          <YAxis
            stroke={tickColor}
            tick={{ fill: tickColor, fontSize: 10, fontWeight: 700 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `${Math.round(value / 1000)}k`}
            width={36}
          />
          <Tooltip
            cursor={{ fill: light ? "rgba(16,185,129,0.08)" : "rgba(52,211,153,0.12)" }}
            contentStyle={{
              background: tooltipBg,
              border: `1px solid ${tooltipBorder}`,
              borderRadius: 14,
              fontSize: 12,
              fontWeight: 700,
              color: light ? "#0f172a" : "#ecfdf5",
            }}
            formatter={(value: number) => [formatNpr(value), "Spent"]}
          />
          <Bar dataKey="spent" fill="url(#expenseWorkspaceTrend)" radius={[8, 8, 0, 0]} maxBarSize={32} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
