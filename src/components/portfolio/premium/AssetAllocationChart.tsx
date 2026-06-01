"use client";

import { useMemo } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { formatNpr } from "@/data/fire-premium-dashboard";
import { PremiumGlassCard } from "@/components/portfolio/premium/PremiumGlassCard";
import { useWealthPortfolio } from "@/contexts/WealthPortfolioContext";

const SLICE_COLORS = ["#38bdf8", "#818cf8", "#fbbf24", "#c084fc", "#fb7185", "#34d399", "#94a3b8"];

export function AssetAllocationChart() {
  const { totals, allocation, hydrated } = useWealthPortfolio();

  const total = totals.totalAssetsNpr;

  const data = useMemo(() => {
    const slices = allocation
      .map((s, i) => ({
        name: s.label,
        value: s.npr,
        color: SLICE_COLORS[i % SLICE_COLORS.length]!,
        pct: total > 0 ? (s.npr / total) * 100 : 0,
      }))
      .filter((s) => s.value > 0);
    return slices.length ? slices : [{ name: "Empty", value: 0, color: "#27272a", pct: 0 }];
  }, [allocation, total]);

  const isEmpty = !hydrated || total <= 0 || data.length === 0 || (data.length === 1 && data[0]!.name === "Empty");

  return (
    <PremiumGlassCard className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden p-3 sm:p-3.5 xl:p-3.5">
      <div className="relative z-10 shrink-0 space-y-0.5 border-b border-white/[0.07] pb-2.5 sm:space-y-1 sm:pb-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500 sm:text-[11px]">Asset allocation</p>
        <p className="text-[1.38rem] font-semibold tabular-nums tracking-[-0.03em] text-white sm:text-[1.5rem] sm:leading-tight xl:text-[1.42rem]">
          {formatNpr(total)}
        </p>
        <p className="max-w-xl text-[11px] font-medium leading-relaxed text-zinc-400/95 sm:text-xs">
          {isEmpty
            ? "Add Your First Asset in banking, investments, or property — allocation fills in from your real balances."
            : "Sleeve mix across your workspace — totals use NPR marks from your portfolio."}
        </p>
      </div>

      <div className="relative z-10 mt-2 flex min-h-0 flex-1 flex-col gap-3 sm:mt-3 sm:min-h-[196px] sm:flex-row sm:items-stretch sm:gap-4 md:min-h-[208px] md:gap-5 lg:min-h-[220px]">
        <div className="flex min-h-[168px] shrink-0 items-center justify-center sm:min-h-0 sm:w-[42%] sm:max-w-none lg:w-[40%]">
          <div className="relative aspect-square w-full max-w-[168px] drop-shadow-[0_0_40px_-12px_rgba(52,211,153,0.2)] sm:max-w-[188px] lg:max-w-[204px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius="54%"
                  outerRadius="80%"
                  paddingAngle={2.2}
                  stroke="rgba(9,9,11,0.92)"
                  strokeWidth={1.75}
                  cornerRadius={3}
                >
                  {data.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "rgba(9,9,11,0.96)",
                    border: "1px solid rgba(52,211,153,0.18)",
                    borderRadius: 14,
                    fontSize: 12,
                    fontWeight: 600,
                    boxShadow: "0 16px 48px -12px rgba(0,0,0,0.65), 0 0 40px -14px rgba(52,211,153,0.12)",
                  }}
                  formatter={(value: number, _n, item) => {
                    const pct = (item as { payload?: { pct?: number } })?.payload?.pct;
                    return [
                      formatNpr(value) + (pct != null ? ` (${pct.toFixed(1)}%)` : ""),
                      (item as { payload?: { name?: string } })?.payload?.name,
                    ];
                  }}
                />
              </PieChart>
            </ResponsiveContainer>

            <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center px-4 text-center">
              <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-zinc-500 sm:text-[10px]">Total</p>
              <p className="mt-0.5 text-xs font-semibold tabular-nums tracking-tight text-white sm:text-sm">{formatNpr(total, true)}</p>
            </div>
          </div>
        </div>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col justify-center sm:py-1">
          <div className="mb-1.5 hidden grid-cols-[10px,minmax(0,1fr),3.25rem,7rem] gap-x-3 border-b border-white/[0.06] pb-1.5 sm:grid">
            <span />
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Category</span>
            <span className="text-right text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Share</span>
            <span className="text-right text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Amount</span>
          </div>
          <ul className="max-h-[min(48vh,280px)] min-h-0 overflow-y-auto overscroll-contain pr-0.5 sm:max-h-none sm:overflow-visible sm:pr-0">
            {isEmpty ? (
              <li className="rounded-lg border border-white/[0.06] bg-black/25 px-3 py-4 text-center text-xs font-medium text-zinc-400">
                No allocation yet — your chart appears when you add assets.
              </li>
            ) : (
              data.map((row) => (
                <li
                  key={row.name}
                  className="grid grid-cols-[auto_1fr] gap-x-2.5 border-b border-white/[0.05] py-2 last:border-b-0 sm:grid-cols-[10px,minmax(0,1fr),3.25rem,7rem] sm:items-center sm:gap-x-3 sm:py-2"
                >
                  <span
                    className="row-span-2 mt-0.5 h-3 w-3 shrink-0 self-start rounded-full shadow-[0_0_16px_rgba(255,255,255,0.22)] sm:row-span-1 sm:mt-0 sm:self-center"
                    style={{ background: row.color }}
                  />
                  <p className="min-w-0 truncate text-[13px] font-semibold leading-snug text-zinc-100 sm:text-sm sm:py-0.5">{row.name}</p>
                  <div className="col-start-2 flex items-baseline justify-between gap-4 pt-0.5 sm:contents sm:pt-0">
                    <p className="text-xs font-bold tabular-nums text-white sm:text-[13px] sm:text-right">{row.pct.toFixed(1)}%</p>
                    <p className="min-w-0 max-w-[55%] truncate text-right text-[11px] font-medium tabular-nums text-zinc-400 sm:max-w-none sm:text-xs">
                      {formatNpr(row.value)}
                    </p>
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>
    </PremiumGlassCard>
  );
}
