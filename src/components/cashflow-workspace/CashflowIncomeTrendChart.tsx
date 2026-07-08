"use client";

import { useMemo } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatNpr } from "@/components/expense-workspace/expense-workspace-utils";

type CashflowIncomeTrendChartProps = {
  data: Array<{ month: string; income: number }>;
  ready: boolean;
};

export function CashflowIncomeTrendChart({ data, ready }: CashflowIncomeTrendChartProps) {
  const chartData = useMemo(() => data.map((item) => ({ ...item })), [data]);

  if (!ready) {
    return (
      <div className="flex h-36 items-end gap-2">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="flex min-w-0 flex-1 flex-col items-center gap-2">
            <div className="flex w-full items-end rounded-full bg-white/[0.06]" style={{ height: "100%" }}>
              <div
                className="w-full rounded-full bg-emerald-500/20 motion-safe:animate-pulse"
                style={{ height: `${24 + ((index * 19) % 58)}%`, animationDelay: `${index * 80}ms` }}
              />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (chartData.length === 0) return null;

  return (
    <div className="h-36 sm:h-40">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 8, right: 4, left: -18, bottom: 0 }}>
          <defs>
            <linearGradient id="cashflowIncomeTrend" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#a3e635" stopOpacity={0.5} />
              <stop offset="100%" stopColor="#059669" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <XAxis dataKey="month" tick={{ fill: "rgba(167,243,208,0.55)", fontSize: 10, fontWeight: 700 }} axisLine={false} tickLine={false} />
          <YAxis hide domain={[0, "auto"]} />
          <Tooltip
            cursor={{ stroke: "rgba(52,211,153,0.25)", strokeWidth: 1 }}
            contentStyle={{
              background: "rgba(3, 8, 6, 0.94)",
              border: "1px solid rgba(52, 211, 153, 0.2)",
              borderRadius: 14,
              fontSize: 12,
              fontWeight: 700,
              color: "#ecfdf5",
            }}
            formatter={(value: number) => [formatNpr(value), "Income"]}
          />
          <Area
            type="monotone"
            dataKey="income"
            stroke="#a3e635"
            strokeWidth={2.5}
            fill="url(#cashflowIncomeTrend)"
            dot={false}
            activeDot={{ r: 4, fill: "#ecfccb", stroke: "#065f46", strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
