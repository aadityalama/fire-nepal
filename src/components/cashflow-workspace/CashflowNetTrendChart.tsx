"use client";

import { useMemo } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, YAxis } from "recharts";
import { formatNpr } from "@/components/expense-workspace/expense-workspace-utils";

type CashflowNetTrendChartProps = {
  data: Array<{ month: string; net: number; income: number; expense: number }>;
  ready: boolean;
};

export function CashflowNetTrendChart({ data, ready }: CashflowNetTrendChartProps) {
  const chartData = useMemo(() => data.map((item) => ({ ...item })), [data]);

  if (!ready) {
    return (
      <div className="flex h-28 items-end gap-2">
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

  if (chartData.length === 0) {
    return (
      <div className="flex h-28 items-center justify-center rounded-2xl border border-dashed border-white/10 bg-black/15 px-4 text-center text-xs font-semibold text-emerald-100/50">
        Trend appears after a few months of cashflow activity.
      </div>
    );
  }

  return (
    <div className="h-28 sm:h-32">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 8, right: 4, left: -18, bottom: 0 }}>
          <defs>
            <linearGradient id="cashflowNetTrend" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6ee7b7" stopOpacity={0.55} />
              <stop offset="100%" stopColor="#059669" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <YAxis hide domain={["auto", "auto"]} />
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
            formatter={(value: number, name: string) => {
              if (name === "net") return [formatNpr(value), "Net cashflow"];
              if (name === "income") return [formatNpr(value), "Income"];
              return [formatNpr(value), "Expense"];
            }}
            labelFormatter={(label) => `${label}`}
          />
          <Area
            type="monotone"
            dataKey="net"
            stroke="#6ee7b7"
            strokeWidth={2.5}
            fill="url(#cashflowNetTrend)"
            dot={false}
            activeDot={{ r: 4, fill: "#a7f3d0", stroke: "#065f46", strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
