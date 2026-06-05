"use client";

import { useMemo } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { WealthTotals } from "@/components/portfolio/calculations";
import { formatMoney } from "@/lib/expense-utils";

const COLORS = {
  realEstate: "#2dd4bf",
  stocks: "#818cf8",
  cash: "#fbbf24",
} as const;

type Slice = { name: string; value: number; color: string; pct: number };

type Props = {
  totals: WealthTotals;
  hydrated: boolean;
};

export function RealEstatePortfolioSleeveChart({ totals, hydrated }: Props) {
  const { chartData, isEmpty } = useMemo(() => {
    const cashNpr = totals.liquidNpr + totals.fixedDepositsPrincipalNpr;
    const raw = [
      { name: "Real estate", value: totals.realEstateNpr, color: COLORS.realEstate },
      { name: "Stocks & funds", value: totals.investmentsLiveNpr, color: COLORS.stocks },
      { name: "Cash & deposits", value: cashNpr, color: COLORS.cash },
    ].filter((s) => s.value > 0);
    const sumVal = raw.reduce((a, s) => a + s.value, 0);
    if (sumVal <= 0) {
      return {
        chartData: [{ name: "Empty", value: 1, color: "#27272a", pct: 0 }] satisfies Slice[],
        isEmpty: true,
      };
    }
    const chartData: Slice[] = raw.map((s) => ({
      ...s,
      pct: (s.value / sumVal) * 100,
    }));
    return { chartData, isEmpty: false };
  }, [
    totals.realEstateNpr,
    totals.investmentsLiveNpr,
    totals.liquidNpr,
    totals.fixedDepositsPrincipalNpr,
  ]);

  const showPlaceholder = !hydrated || isEmpty;

  return (
    <div className="min-w-0 overflow-hidden rounded-2xl border border-teal-400/20 bg-gradient-to-br from-teal-950/30 via-black/35 to-slate-950/45 p-3 shadow-inner shadow-black/30 ring-1 ring-white/[0.04] backdrop-blur-md sm:p-3.5">
      <div className="mb-2 border-b border-teal-400/10 pb-2">
        <p className="text-[10px] font-black uppercase tracking-[0.12em] text-teal-200/80">Portfolio mix</p>
        <p className="mt-0.5 text-xs font-bold leading-snug text-emerald-100/90 sm:text-sm">
          Real estate vs stocks & funds vs cash & deposits
        </p>
        <p className="mt-1 text-[10px] font-semibold text-emerald-200/50">
          NPR marks from your portfolio — same engine as the wealth dashboard.
        </p>
      </div>

      <div className="flex min-h-[168px] flex-col gap-3 sm:min-h-[188px] sm:flex-row sm:items-stretch">
        <div className="flex shrink-0 items-center justify-center sm:w-[44%]">
          <div className="relative aspect-square w-full max-w-[168px] drop-shadow-[0_0_36px_-10px_rgba(45,212,191,0.25)]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius="52%"
                  outerRadius="78%"
                  paddingAngle={2}
                  stroke="rgba(9,9,11,0.9)"
                  strokeWidth={1.5}
                  cornerRadius={3}
                >
                  {chartData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "rgba(9,9,11,0.96)",
                    border: "1px solid rgba(45,212,191,0.2)",
                    borderRadius: 12,
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                  formatter={(value: number, _n, item) => {
                    const payload = (item as { payload?: Slice }).payload;
                    if (payload?.name === "Empty") return ["Add balances to see mix", ""];
                    const pct = payload?.pct;
                    return [
                      `${formatMoney(value, "NPR")}${pct != null ? ` (${pct.toFixed(1)}%)` : ""}`,
                      payload?.name ?? "",
                    ];
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-3 text-center">
              <p className="text-[9px] font-black uppercase tracking-wider text-emerald-200/55">3-way</p>
              <p className="mt-0.5 text-[11px] font-bold tabular-nums text-emerald-50">sleeves</p>
            </div>
          </div>
        </div>

        <ul className="flex min-h-0 min-w-0 flex-1 flex-col justify-center gap-1.5 text-sm">
          {showPlaceholder ? (
            <li className="rounded-xl border border-white/[0.06] bg-black/30 px-3 py-3 text-center text-xs font-semibold text-emerald-200/55">
              Add property estimates, banking balances, or investments to populate this chart.
            </li>
          ) : (
            chartData.map((row) => (
              <li
                key={row.name}
                className="grid grid-cols-[auto_1fr_auto] items-center gap-2 rounded-xl border border-white/[0.06] bg-black/25 px-2.5 py-2"
              >
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full shadow-[0_0_12px_rgba(255,255,255,0.2)]"
                  style={{ background: row.color }}
                />
                <span className="min-w-0 truncate text-xs font-bold text-emerald-50">{row.name}</span>
                <span className="shrink-0 text-xs font-black tabular-nums text-emerald-200/90">{row.pct.toFixed(1)}%</span>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
