"use client";

import { Area, AreaChart, ResponsiveContainer, Tooltip, YAxis } from "recharts";
import { useId, useMemo, useState } from "react";
import {
  buildPerformanceSeries,
  formatSignedPct,
  type ChartRangeId,
  type InvestmentPortfolioSummary,
} from "@/components/portfolio/investments/investment-card-model";
import { InvGlass, ToneValue, formatInvMoney } from "@/components/portfolio/investments/InvestmentUi";
import { cn } from "@/lib/utils";

const RANGES: ChartRangeId[] = ["7D", "1M", "1Y", "ALL"];

export function InvestmentHeroSummary({
  summary,
}: {
  summary: InvestmentPortfolioSummary;
}) {
  const [range, setRange] = useState<ChartRangeId>("1M");
  const uid = useId().replace(/:/g, "");
  const gradId = `inv-hero-${uid}`;

  const series = useMemo(
    () => buildPerformanceSeries(summary.costNpr, summary.portfolioValueNpr, range),
    [summary.costNpr, summary.portfolioValueNpr, range],
  );

  const positive = summary.overallPnlNpr >= 0;
  const todayPositive = (summary.todayGainLossNpr ?? 0) >= 0;

  return (
    <InvGlass className="overflow-hidden p-0">
      <div className="space-y-4 p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-400/85">FIRE Nepal</p>
            <h1 className="mt-1 text-3xl font-black tracking-tight text-emerald-50 sm:text-4xl">NEPSE Portfolio</h1>
            <p className="mt-1.5 text-sm font-semibold text-emerald-200/60">
              Simple view of your stocks — tap a holding for details.
            </p>
          </div>
          <div className="hidden shrink-0 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-right sm:block">
            <p className="text-[10px] font-black uppercase tracking-wider text-emerald-200/50">Holdings</p>
            <p className="mt-0.5 text-xl font-black tabular-nums text-white">{summary.holdingCount}</p>
          </div>
        </div>

        <div className="rounded-[1.35rem] border border-emerald-400/15 bg-black/35 p-4 sm:p-5">
          <p className="text-[10px] font-black uppercase tracking-wider text-emerald-200/55">Portfolio value</p>
          <p className="mt-1 text-3xl font-black tabular-nums tracking-tight text-white sm:text-4xl">
            {formatInvMoney(summary.portfolioValueNpr)}
          </p>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs font-bold">
            <span className="text-emerald-200/55">
              Today{" "}
              <ToneValue value={summary.todayGainLossNpr} className="ml-1 text-sm">
                {summary.todayGainLossNpr >= 0 ? "+" : ""}
                {formatInvMoney(summary.todayGainLossNpr)}
                {summary.todayGainLossPct != null ? ` (${formatSignedPct(summary.todayGainLossPct)})` : ""}
              </ToneValue>
            </span>
            <span className="text-emerald-200/55">
              Overall{" "}
              <ToneValue value={summary.overallPnlNpr} className="ml-1 text-sm">
                {summary.overallPnlNpr >= 0 ? "+" : ""}
                {formatInvMoney(summary.overallPnlNpr)}
              </ToneValue>
            </span>
            <span className="text-emerald-200/55">
              Return{" "}
              <ToneValue value={summary.portfolioReturnPct} className="ml-1 text-sm">
                {formatSignedPct(summary.portfolioReturnPct)}
              </ToneValue>
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <MiniStat label="Today's P/L" value={formatInvMoney(summary.todayGainLossNpr)} tone={todayPositive ? "pos" : "neg"} />
          <MiniStat label="Overall P/L" value={formatInvMoney(summary.overallPnlNpr)} tone={positive ? "pos" : "neg"} />
          <MiniStat label="Return %" value={formatSignedPct(summary.portfolioReturnPct)} tone={positive ? "pos" : "neg"} />
          <MiniStat label="Cost basis" value={formatInvMoney(summary.costNpr)} />
        </div>

        <div className="rounded-[1.35rem] border border-emerald-400/15 bg-black/35 p-3 sm:p-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-[10px] font-black uppercase tracking-wider text-emerald-200/55">Performance</p>
            <div className="flex gap-1 rounded-full border border-emerald-400/15 bg-black/30 p-0.5">
              {RANGES.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRange(r)}
                  className={cn(
                    "rounded-full px-2.5 py-1 text-[10px] font-black transition",
                    range === r
                      ? "bg-emerald-400 text-emerald-950 shadow-sm"
                      : "text-emerald-200/65 hover:text-emerald-50",
                  )}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
          <div className="h-[7.25rem] w-full sm:h-32">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series} margin={{ top: 6, right: 4, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={positive ? "#34d399" : "#fb7185"} stopOpacity={0.45} />
                    <stop offset="100%" stopColor={positive ? "#34d399" : "#fb7185"} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <YAxis domain={["dataMin", "dataMax"]} hide />
                <Tooltip
                  contentStyle={{
                    background: "rgba(2,12,10,0.92)",
                    border: "1px solid rgba(52,211,153,0.25)",
                    borderRadius: 12,
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                  formatter={(v) => [formatInvMoney(Number(v ?? 0)), "Value"]}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={positive ? "#34d399" : "#fb7185"}
                  strokeWidth={2.4}
                  fill={`url(#${gradId})`}
                  isAnimationActive
                  animationDuration={700}
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </InvGlass>
  );
}

function MiniStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "pos" | "neg";
}) {
  return (
    <div className="rounded-2xl border border-emerald-400/12 bg-black/30 px-3 py-2.5">
      <p className="text-[9px] font-black uppercase tracking-wider text-emerald-200/45">{label}</p>
      <p
        className={cn(
          "mt-1 truncate text-sm font-black tabular-nums sm:text-base",
          tone === "pos" ? "text-lime-300" : tone === "neg" ? "text-rose-300" : "text-emerald-50",
        )}
      >
        {value}
      </p>
    </div>
  );
}
