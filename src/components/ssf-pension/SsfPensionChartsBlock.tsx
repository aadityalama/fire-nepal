"use client";

import { useId, useMemo } from "react";
import { Area, AreaChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useFireTheme } from "@/contexts/FireThemeContext";
import { SSF_GROWTH_CHART } from "@/lib/ssf-pension/demo-data";
import { computePensionProjection } from "@/lib/ssf-pension/projection";
import { useSsfPension } from "@/contexts/SsfPensionContext";

export function SsfPensionChartsBlock() {
  const { resolvedTheme } = useFireTheme();
  const light = resolvedTheme === "light";
  const gid = useId().replace(/:/g, "");
  const { workspace } = useSsfPension();
  const projSeries = useMemo(() => {
    const baseYear = new Date().getFullYear();
    const { currentAge, retirementAge } = workspace.projection;
    const span = Math.max(1, retirementAge - currentAge);
    const pts: { year: string; corpus: number }[] = [];
    const maxPoints = Math.min(span, 22);
    for (let y = 1; y <= maxPoints; y++) {
      const pr = computePensionProjection({
        ...workspace.projection,
        retirementAge: currentAge + y,
      });
      pts.push({ year: String(baseYear + y), corpus: pr.futureCorpusNpr });
    }
    return pts;
  }, [workspace.projection]);

  const tickColor = light ? "#64748b" : "#a1a1aa";
  const gridColor = light ? "rgba(15, 23, 42, 0.08)" : "rgba(255,255,255, 0.06)";
  const tooltipBg = light ? "rgba(255,255,255,0.96)" : "rgba(3, 8, 6, 0.94)";
  const tooltipBorder = light ? "rgba(13, 148, 136, 0.25)" : "rgba(45, 212, 191, 0.2)";

  const axisProps = {
    stroke: tickColor,
    tick: { fill: tickColor, fontSize: 10, fontWeight: 700 },
    tickLine: false,
    axisLine: { stroke: gridColor },
  } as const;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className={`wealth-chart-card wealth-glass flex min-h-[240px] flex-col p-4 sm:min-h-[260px] sm:p-5 ${light ? "border-slate-200/80" : ""}`}>
        <p className="text-[11px] font-black uppercase tracking-[0.14em] text-teal-700 dark:text-teal-300/85">Contribution growth</p>
        <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-zinc-400">
          Cumulative public-tier balance path from your contribution history (chart appears when data is available).
        </p>
        <div className="mt-3 min-h-[180px] flex-1">
          {SSF_GROWTH_CHART.length === 0 ? (
            <div
              className={`flex h-full min-h-[180px] flex-col items-center justify-center rounded-xl border border-dashed px-4 text-center text-sm font-semibold ${
                light ? "border-slate-200/90 text-slate-500" : "border-white/15 text-zinc-400"
              }`}
            >
              No contribution history yet. Log contributions in the SSF workspace to plot growth over time.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={SSF_GROWTH_CHART} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id={`ssfBal${gid}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#14b8a6" stopOpacity={light ? 0.35 : 0.45} />
                    <stop offset="100%" stopColor="#14b8a6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 6" stroke={gridColor} vertical={false} />
                <XAxis dataKey="label" {...axisProps} interval="preserveStartEnd" />
                <YAxis {...axisProps} tickFormatter={(v) => `${Math.round(v / 1000)}k`} width={36} />
                <Tooltip
                  contentStyle={{
                    background: tooltipBg,
                    border: `1px solid ${tooltipBorder}`,
                    borderRadius: 12,
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                  formatter={(v: number) => [`NPR ${v.toLocaleString("en-IN")}`, "Balance"]}
                />
                <Area type="monotone" dataKey="balance" stroke="#0d9488" strokeWidth={2} fill={`url(#ssfBal${gid})`} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className={`wealth-chart-card wealth-glass flex min-h-[240px] flex-col p-4 sm:min-h-[260px] sm:p-5 ${light ? "border-slate-200/80" : ""}`}>
        <p className="text-[11px] font-black uppercase tracking-[0.14em] text-teal-700 dark:text-teal-300/85">Pension corpus glide</p>
        <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-zinc-400">Linked to calculator inputs in Projection</p>
        <div className="mt-3 min-h-[180px] flex-1">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={projSeries} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 6" stroke={gridColor} vertical={false} />
              <XAxis dataKey="year" {...axisProps} />
              <YAxis {...axisProps} tickFormatter={(v) => `${Math.round(v / 100000)}L`} width={36} />
              <Tooltip
                contentStyle={{
                  background: tooltipBg,
                  border: `1px solid ${tooltipBorder}`,
                  borderRadius: 12,
                  fontSize: 12,
                  fontWeight: 700,
                }}
                formatter={(v: number) => [`NPR ${v.toLocaleString("en-IN")}`, "Corpus"]}
              />
              <Line type="monotone" dataKey="corpus" stroke="#34d399" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
