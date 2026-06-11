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
    <PremiumGlassCard className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden p-5 xl:p-6">
      <div className="relative z-10 flex shrink-0 flex-col gap-2 border-b border-white/[0.07] pb-4 md:flex-row md:items-end md:justify-between md:gap-4">
        <div className="min-w-0 space-y-0.5">
          <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-zinc-500 sm:text-[10px]">Asset allocation</p>
          <p className="min-w-0 truncate text-base font-bold tabular-nums tracking-tight text-white sm:text-lg sm:leading-tight">
            {formatNpr(total)}
          </p>
        </div>
        <p className="min-w-0 max-w-full truncate text-[9px] font-medium leading-snug text-zinc-500 md:max-w-[20rem] md:text-right sm:text-[10px]">
          {isEmpty
            ? "Add assets in banking, investments, or property — allocation fills from your balances."
            : "Sleeve mix · NPR marks from your portfolio."}
        </p>
      </div>

      <div className="relative z-10 mt-4 flex min-h-0 flex-1 flex-col gap-4 md:min-h-[136px] md:flex-row md:items-stretch lg:min-h-[150px]">
        <div className="flex min-h-[116px] shrink-0 items-center justify-center md:min-h-0 md:w-[38%] md:max-w-none lg:w-[36%]">
          <div className="relative aspect-square w-full max-w-[118px] drop-shadow-[0_0_28px_-10px_rgba(52,211,153,0.18)] md:max-w-[132px] lg:max-w-[144px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius="58%"
                  outerRadius="82%"
                  paddingAngle={2}
                  stroke="rgba(9,9,11,0.92)"
                  strokeWidth={1.5}
                  cornerRadius={2.5}
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

            <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center px-2 text-center">
              <p className="text-[8px] font-semibold uppercase tracking-[0.14em] text-zinc-500 sm:text-[9px]">Total</p>
              <p className="mt-0.5 text-[10px] font-semibold tabular-nums tracking-tight text-white sm:text-xs">{formatNpr(total, true)}</p>
            </div>
          </div>
        </div>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col justify-center md:py-0.5">
          <div className="mb-2 hidden min-w-0 grid-cols-[10px,minmax(0,1fr),3rem,minmax(5rem,6.5rem)] gap-x-2.5 border-b border-white/[0.06] pb-2 md:grid">
            <span />
            <span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-zinc-500">Category</span>
            <span className="text-right text-[9px] font-semibold uppercase tracking-[0.12em] text-zinc-500">Share</span>
            <span className="text-right text-[9px] font-semibold uppercase tracking-[0.12em] text-zinc-500">Amt</span>
          </div>
          <ul className="max-h-[min(36vh,220px)] min-h-0 min-w-0 overflow-y-auto overscroll-contain pr-0.5 md:max-h-[min(42vh,260px)] md:pr-0 lg:max-h-none lg:overflow-visible">
            {isEmpty ? (
              <li className="rounded-md border border-white/[0.06] bg-black/25 px-2 py-2.5 text-center text-[10px] font-medium text-zinc-400 sm:text-xs">
                No allocation yet — add assets to see your mix.
              </li>
            ) : (
              data.map((row) => (
                <li
                  key={row.name}
                  className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] gap-x-2 border-b border-white/[0.05] py-2 last:border-b-0 md:grid-cols-[10px,minmax(0,1fr),3rem,minmax(5rem,6.5rem)] md:items-center md:gap-x-2.5"
                >
                  <span
                    className="row-span-2 mt-0.5 h-2.5 w-2.5 shrink-0 self-start rounded-full shadow-[0_0_10px_rgba(255,255,255,0.18)] md:row-span-1 md:mt-0 md:h-3 md:w-3 md:self-center"
                    style={{ background: row.color }}
                  />
                  <p className="min-w-0 truncate text-xs font-semibold leading-snug text-zinc-100 md:py-0 md:text-[13px]" title={row.name}>
                    {row.name}
                  </p>
                  <div className="col-start-2 flex min-w-0 items-baseline justify-between gap-2 pt-0.5 md:contents md:pt-0">
                    <p className="text-[10px] font-bold tabular-nums text-white md:text-right md:text-xs">{row.pct.toFixed(1)}%</p>
                    <p className="min-w-0 max-w-[55%] truncate text-right text-[10px] font-medium tabular-nums text-zinc-400 md:max-w-none md:text-[11px]">
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
