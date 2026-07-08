"use client";

import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useFireTheme } from "@/contexts/FireThemeContext";

const TREND_DATA = [
  { month: "Jan", spent: 44000 },
  { month: "Feb", spent: 58000 },
  { month: "Mar", spent: 49000 },
  { month: "Apr", spent: 67000 },
  { month: "May", spent: 61000 },
  { month: "Jun", spent: 73000 },
  { month: "Jul", spent: 65000 },
];

function formatNpr(amount: number) {
  return `NPR ${Math.round(amount).toLocaleString("en-IN")}`;
}

type BudgetMonthlyTrendChartProps = {
  ready: boolean;
};

export function BudgetMonthlyTrendChart({ ready }: BudgetMonthlyTrendChartProps) {
  const { resolvedTheme } = useFireTheme();
  const light = resolvedTheme === "light";
  const data = useMemo(() => TREND_DATA.map((item) => ({ ...item })), []);

  const tickColor = light ? "#64748b" : "#94a3b8";
  const gridColor = light ? "rgba(15, 23, 42, 0.08)" : "rgba(255,255,255, 0.06)";
  const tooltipBg = light ? "rgba(255,255,255,0.96)" : "rgba(3, 8, 6, 0.94)";
  const tooltipBorder = light ? "rgba(16, 185, 129, 0.25)" : "rgba(52, 211, 153, 0.2)";

  if (!ready) {
    return (
      <div className="flex h-40 items-end gap-2 sm:h-48">
        {Array.from({ length: 7 }).map((_, index) => (
          <div key={index} className="flex min-w-0 flex-1 flex-col items-center gap-2">
            <div className="flex w-full items-end rounded-full bg-white/[0.06]" style={{ height: "100%" }}>
              <div
                className="w-full rounded-full bg-emerald-500/20 motion-safe:animate-pulse"
                style={{ height: `${28 + ((index * 17) % 55)}%`, animationDelay: `${index * 80}ms` }}
              />
            </div>
            <span className="h-2.5 w-5 rounded-full bg-white/10" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="h-40 sm:h-48">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 4, left: -8, bottom: 0 }}>
          <defs>
            <linearGradient id="budgetTrendFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#a3e635" stopOpacity={0.95} />
              <stop offset="100%" stopColor="#34d399" stopOpacity={0.75} />
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
          <Bar dataKey="spent" fill="url(#budgetTrendFill)" radius={[8, 8, 0, 0]} maxBarSize={36} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
