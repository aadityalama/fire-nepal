"use client";

import { useMemo } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { formatNpr } from "@/data/fire-premium-dashboard";
import { PremiumGlassCard } from "@/components/portfolio/premium/PremiumGlassCard";
import { useWealthPortfolio } from "@/contexts/WealthPortfolioContext";

const SLICE_COLORS = ["#38F2A0", "#C06CFF", "#F7C948", "#60A5FA", "#FB7185", "#A7B4C4", "#7DD3FC"];

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
    <PremiumGlassCard className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden p-4 xl:p-5">
      <div className="relative z-10 flex shrink-0 flex-col gap-2 border-b border-white/[0.08] pb-4 md:flex-row md:items-end md:justify-between md:gap-4">
        <div className="min-w-0 space-y-0.5">
          <p className="truncate text-xs font-bold uppercase tracking-wider text-white/65">Asset allocation</p>
          <p className="min-w-0 truncate text-xl font-bold tabular-nums tracking-tight text-white sm:text-2xl sm:leading-tight">
            {formatNpr(total)}
          </p>
        </div>
        <p className="min-w-0 max-w-full truncate text-[11px] font-medium leading-snug text-[#A7B4C4] md:max-w-[20rem] md:text-right">
          {isEmpty
            ? "Add assets in banking, investments, or property — allocation fills from your balances."
            : "Sleeve mix · NPR marks from your portfolio."}
        </p>
      </div>

      <div className="relative z-10 mt-4 flex min-h-0 flex-1 flex-col gap-4 md:min-h-[180px] md:flex-row md:items-stretch lg:min-h-[220px]">
        <div className="flex min-h-[140px] shrink-0 items-center justify-center md:min-h-0 md:w-[40%] md:max-w-none lg:w-[42%]">
          <div className="relative aspect-square w-full max-w-[136px] drop-shadow-[0_14px_36px_-28px_rgba(0,0,0,0.9)] md:max-w-[154px] lg:max-w-[174px]">
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
                  stroke="#0B1623"
                  strokeWidth={1.5}
                  cornerRadius={2.5}
                >
                  {data.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "rgba(11,22,35,0.96)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 16,
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#FFFFFF",
                    boxShadow: "0 18px 42px -24px rgba(0,0,0,0.85)",
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
              <p className="text-[9px] font-semibold uppercase tracking-wider text-white/65">Total</p>
              <p className="mt-0.5 text-xs font-bold tabular-nums tracking-tight text-white">{formatNpr(total, true)}</p>
            </div>
          </div>
        </div>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col justify-center md:py-0.5">
          <div className="mb-2 hidden min-w-0 grid-cols-[10px,minmax(0,1fr),3rem,minmax(5rem,6.5rem)] gap-x-2.5 border-b border-white/[0.08] pb-2 md:grid">
            <span />
            <span className="text-[9px] font-bold uppercase tracking-wider text-white/65">Category</span>
            <span className="text-right text-[9px] font-bold uppercase tracking-wider text-white/65">Share</span>
            <span className="text-right text-[9px] font-bold uppercase tracking-wider text-white/65">Amt</span>
          </div>
          <ul className="max-h-[min(36vh,220px)] min-h-0 min-w-0 overflow-y-auto overscroll-contain pr-0.5 md:max-h-[min(42vh,260px)] md:pr-0 lg:max-h-none lg:overflow-visible">
            {isEmpty ? (
              <li className="rounded-lg border border-white/[0.08] bg-[#07111A]/70 px-2 py-2.5 text-center text-xs font-medium text-[#A7B4C4]">
                No allocation yet — add assets to see your mix.
              </li>
            ) : (
              data.map((row) => (
                <li
                  key={row.name}
                  className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] gap-x-2 border-b border-white/[0.06] py-2 last:border-b-0 md:grid-cols-[10px,minmax(0,1fr),3rem,minmax(5rem,6.5rem)] md:items-center md:gap-x-2.5"
                >
                  <span
                    className="row-span-2 mt-0.5 h-2.5 w-2.5 shrink-0 self-start rounded-full shadow-[0_0_10px_rgba(255,255,255,0.18)] md:row-span-1 md:mt-0 md:h-3 md:w-3 md:self-center"
                    style={{ background: row.color }}
                  />
                  <p className="min-w-0 truncate text-xs font-semibold leading-snug text-white md:py-0 md:text-[13px]" title={row.name}>
                    {row.name}
                  </p>
                  <div className="col-start-2 flex min-w-0 items-baseline justify-between gap-2 pt-0.5 md:contents md:pt-0">
                    <p className="text-[10px] font-bold tabular-nums text-white md:text-right md:text-xs">{row.pct.toFixed(1)}%</p>
                    <p className="min-w-0 max-w-[55%] truncate text-right text-[10px] font-medium tabular-nums text-[#A7B4C4] md:max-w-none md:text-[11px]">
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
