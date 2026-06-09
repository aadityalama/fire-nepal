"use client";

import { useId, useMemo, useState } from "react";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { NetWorthPoint } from "@/data/fire-premium-dashboard";
import { formatNpr } from "@/data/fire-premium-dashboard";
import { PremiumGlassCard } from "@/components/portfolio/premium/PremiumGlassCard";
import { useWealthPortfolio } from "@/contexts/WealthPortfolioContext";

const tabs = [
  { id: "monthly" as const, label: "Monthly" },
  { id: "yearly" as const, label: "Yearly" },
  { id: "all" as const, label: "All Time" },
];

function monthKeyToShortLabel(monthKey: string): string {
  const [y, m] = monthKey.split("-").map(Number);
  if (!y || !m) return monthKey;
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

function bucketHistory(
  history: { month: string; netWorthNpr: number }[],
  mode: "monthly" | "yearly" | "all",
): NetWorthPoint[] {
  const sorted = [...history].sort((a, b) => a.month.localeCompare(b.month));
  if (!sorted.length) return [];

  if (mode === "all" || sorted.length <= 18) {
    return sorted.map((p) => ({ label: monthKeyToShortLabel(p.month), nw: p.netWorthNpr }));
  }

  if (mode === "yearly") {
    const byYear = new Map<string, { month: string; netWorthNpr: number }>();
    for (const p of sorted) {
      const y = p.month.slice(0, 4);
      const prev = byYear.get(y);
      if (!prev || p.month > prev.month) byYear.set(y, p);
    }
    return [...byYear.values()]
      .sort((a, b) => a.month.localeCompare(b.month))
      .map((p) => ({ label: p.month.slice(0, 4), nw: p.netWorthNpr }));
  }

  // monthly: last 18 points
  return sorted.slice(-18).map((p) => ({ label: monthKeyToShortLabel(p.month), nw: p.netWorthNpr }));
}

function MilestoneCallout({ points }: { points: NetWorthPoint[] }) {
  const tagged = points.filter((p) => p.milestone);
  if (!tagged.length) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {tagged.slice(-2).map((p) => (
        <span
          key={p.label + (p.milestone ?? "")}
          className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-500/[0.08] px-3 py-1.5 text-[11px] font-medium tracking-tight text-emerald-100/95 shadow-[0_0_24px_-12px_rgba(52,211,153,0.2)] ring-1 ring-white/[0.05] transition-shadow duration-500 hover:shadow-[0_0_32px_-10px_rgba(52,211,153,0.28)]"
        >
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.85)]" />
          {p.milestone}
        </span>
      ))}
    </div>
  );
}

type NetWorthTooltipEntry = {
  value?: number | string | ReadonlyArray<number | string>;
  payload?: NetWorthPoint;
};

function NetWorthTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: NetWorthTooltipEntry[];
  label?: string | number;
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  if (!row) return null;
  return (
    <div className="rounded-2xl border border-emerald-400/20 bg-zinc-950/95 px-4 py-3 shadow-[0_16px_48px_-12px_rgba(0,0,0,0.75),0_0_40px_-12px_rgba(52,211,153,0.15)] backdrop-blur-md">
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-zinc-500">{label != null ? String(label) : ""}</p>
      <p className="mt-1 text-sm font-black text-white">{formatNpr(row.nw)}</p>
      {row.milestone ? <p className="mt-1 text-[11px] font-medium text-emerald-300/90">{row.milestone}</p> : null}
    </div>
  );
}

export function NetWorthGrowthChart() {
  const { totals, state, hydrated } = useWealthPortfolio();
  const uid = useId().replace(/:/g, "");
  const fillGradId = `nw-area-fill-${uid}`;
  const lineStrokeId = `nw-line-stroke-${uid}`;
  const compact = useMediaQuery("(max-width: 639px)");

  const [range, setRange] = useState<(typeof tabs)[number]["id"]>("yearly");
  const history = useMemo(() => state.netWorthHistory ?? [], [state.netWorthHistory]);

  const data = useMemo(() => {
    const pts = bucketHistory(history, range);
    if (pts.length >= 2) return pts;
    if (pts.length === 1) return [pts[0]!, { ...pts[0]!, label: `${pts[0]!.label} ·`, nw: pts[0]!.nw }];
    return [
      { label: "Start", nw: 0 },
      { label: "Now", nw: hydrated ? totals.netWorthNpr : 0 },
    ];
  }, [history, range, hydrated, totals.netWorthNpr]);

  const yDomain = useMemo(() => {
    const vals = data.map((d) => d.nw);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const pad = (max - min) * 0.12 || Math.max(max * 0.06, 1);
    return [min - pad, max + pad];
  }, [data]);

  const hasMilestones = useMemo(() => data.some((p) => p.milestone), [data]);
  const isEmptyHistory = history.length < 2;

  return (
    <PremiumGlassCard className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col p-2.5 sm:p-3 xl:p-3">
      <div className="relative z-10 flex flex-col gap-2 border-b border-white/[0.07] pb-2 sm:flex-row sm:items-end sm:justify-between sm:gap-3 sm:pb-2">
        <div className="min-w-0 flex-1 space-y-0.5">
          <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-zinc-500 sm:text-[10px]">Net worth growth</p>
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0">
            <p className="text-base font-bold tabular-nums tracking-tight text-white sm:text-lg xl:text-[1.15rem]">
              {formatNpr(hydrated ? totals.netWorthNpr : 0)}
            </p>
            <span className="text-[9px] font-semibold uppercase tracking-wide text-zinc-500 sm:text-[10px]">Primary</span>
          </div>
          <p className="max-w-lg text-[9px] font-medium leading-snug text-zinc-500 line-clamp-2 sm:text-[10px] lg:line-clamp-2">
            {isEmptyHistory
              ? "Log snapshots as you update your portfolio — the curve appears automatically."
              : "Trajectory from saved net worth history."}
          </p>
        </div>
        <div className="flex w-full min-w-0 flex-wrap gap-0.5 rounded-lg border border-white/[0.1] bg-black/40 p-0.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-md sm:w-auto sm:flex-nowrap sm:rounded-xl sm:p-0.5">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setRange(t.id)}
              className={`min-h-[32px] flex-1 rounded-md px-2 py-1 text-[9px] font-semibold transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] sm:min-h-0 sm:flex-none sm:rounded-md sm:px-2.5 sm:py-1 sm:text-[10px] ${
                range === t.id
                  ? "bg-gradient-to-b from-white/[0.16] to-white/[0.07] text-white shadow-[0_0_28px_-8px_rgba(52,211,153,0.35)] ring-1 ring-emerald-400/30"
                  : "text-zinc-500 hover:bg-white/[0.05] hover:text-zinc-100"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {hasMilestones ? (
        <div className="relative z-10 mt-1 sm:mt-1.5">
          <MilestoneCallout points={data} />
        </div>
      ) : null}

      <div
        className={`relative z-10 flex min-h-0 flex-1 flex-col pl-0 sm:pl-0.5 ${hasMilestones ? "mt-1 sm:mt-1.5" : "mt-1"}`}
      >
        <div className="min-h-[min(38vw,140px)] w-full flex-1 sm:min-h-[148px] lg:min-h-[156px] xl:min-h-[160px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={data}
              margin={
                compact
                  ? { top: 12, right: 4, left: -12, bottom: 4 }
                  : { top: 20, right: 8, left: 0, bottom: 12 }
              }
            >
              <defs>
                <linearGradient id={fillGradId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#5eead4" stopOpacity={0.38} />
                  <stop offset="40%" stopColor="#10b981" stopOpacity={0.16} />
                  <stop offset="85%" stopColor="#064e3b" stopOpacity={0.04} />
                  <stop offset="100%" stopColor="#022c22" stopOpacity={0} />
                </linearGradient>
                <linearGradient id={lineStrokeId} x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#a7f3d0" />
                  <stop offset="45%" stopColor="#34d399" />
                  <stop offset="100%" stopColor="#059669" />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="5 12" stroke="rgba(255,255,255,0.04)" vertical={false} />

              <XAxis
                dataKey="label"
                tick={{ fill: "rgba(161,161,170,0.88)", fontSize: compact ? 9 : 11, fontWeight: 700 }}
                tickLine={false}
                axisLine={false}
                tickMargin={compact ? 8 : 14}
                interval="preserveStartEnd"
                dy={4}
              />
              <YAxis
                domain={yDomain as [number, number]}
                tickFormatter={(v) => `${(v / 1_000_000).toFixed(1)}M`}
                tick={{ fill: "rgba(113,113,122,0.95)", fontSize: compact ? 9 : 11, fontWeight: 700 }}
                axisLine={false}
                tickLine={false}
                width={compact ? 40 : 56}
                tickMargin={compact ? 4 : 8}
              />

              <Tooltip
                content={(props) => <NetWorthTooltip {...props} />}
                cursor={{ stroke: "rgba(52,211,153,0.22)", strokeWidth: 1 }}
              />

              <Line
                type="monotone"
                dataKey="nw"
                stroke="#10b981"
                strokeWidth={14}
                strokeOpacity={0.14}
                strokeLinecap="round"
                strokeLinejoin="round"
                dot={false}
                isAnimationActive={false}
                legendType="none"
              />
              <Line
                type="monotone"
                dataKey="nw"
                stroke="#34d399"
                strokeWidth={6}
                strokeOpacity={0.22}
                strokeLinecap="round"
                strokeLinejoin="round"
                dot={false}
                isAnimationActive={false}
                legendType="none"
              />

              <Area
                type="monotone"
                dataKey="nw"
                stroke={`url(#${lineStrokeId})`}
                strokeWidth={3}
                fill={`url(#${fillGradId})`}
                fillOpacity={1}
                strokeLinecap="round"
                strokeLinejoin="round"
                isAnimationActive
                animationDuration={640}
                animationEasing="ease-out"
                activeDot={{
                  r: 6,
                  strokeWidth: 0,
                  fill: "#ecfdf5",
                  className: "drop-shadow-[0_0_14px_rgba(52,211,153,0.95)]",
                }}
                dot={(props) => {
                  const { cx, cy, payload } = props;
                  const dotKey = `nw-dot-${payload.label}-${payload.nw}`;
                  if (payload.milestone) {
                    return (
                      <circle
                        key={dotKey}
                        cx={cx}
                        cy={cy}
                        r={6}
                        fill="#052e22"
                        stroke="#6ee7b7"
                        strokeWidth={2}
                        className="drop-shadow-[0_0_14px_rgba(52,211,153,0.9)]"
                      />
                    );
                  }
                  return <circle key={dotKey} cx={cx} cy={cy} r={0} />;
                }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </PremiumGlassCard>
  );
}
