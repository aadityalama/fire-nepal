"use client";

import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from "chart.js";
import type { Chart as ChartModel } from "chart.js";
import { useEffect, useId, useMemo, useState } from "react";
import { Bar, Chart, Doughnut, Line } from "react-chartjs-2";
import {
  allocationLegendGenerateLabels,
  emeraldAreaFill,
  milestoneCrossings,
  neonUnderlayLineDataset,
  passivePurpleEmeraldFill,
  premiumAnim,
} from "@/components/portfolio/wealth-premium-charts";
import {
  REAL_ESTATE_INFLATION_PROXY_PCT,
  reAppreciationTargetProjection,
} from "@/components/portfolio/real-estate-metrics";
import { registerWealthChartPlugins, type WealthHorizontalLine } from "@/components/portfolio/wealth-chart-plugins";
import type { RealEstateRow } from "@/components/portfolio/types";
import { useFireTheme } from "@/contexts/FireThemeContext";
import {
  getWealthChartUi,
  premiumTooltipForTheme,
  wealthChartFontsForTheme,
} from "@/lib/fire-dash-chart-theme";
import { amountToNpr } from "@/lib/portfolio-convert";
import { formatMoney } from "@/lib/expense-utils";

ChartJS.register(
  ArcElement,
  BarElement,
  CategoryScale,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
  Filler,
);
registerWealthChartPlugins();

const KIND_LABELS: Record<string, string> = {
  nepse: "NEPSE",
  us_stock: "US stocks",
  etf: "ETFs",
  sip: "Open MF",
  closed_end_mf: "Closed MF",
  crypto: "Crypto",
};

function baselineHistory(
  history: { month: string; netWorthNpr: number }[],
  netWorthCurrent: number,
): { month: string; netWorthNpr: number }[] {
  if (history.length >= 2) return [...history].sort((a, b) => a.month.localeCompare(b.month));
  const cur = netWorthCurrent;
  if (cur <= 0 && history.length === 0) {
    return [
      { month: "Start", netWorthNpr: 0 },
      { month: "Now", netWorthNpr: 0 },
    ];
  }
  if (history.length === 1) {
    return [
      { month: "Prior", netWorthNpr: Math.round(cur * 0.94) },
      ...history,
    ];
  }
  return [
    { month: "T−2", netWorthNpr: Math.round(cur * 0.88) },
    { month: "T−1", netWorthNpr: Math.round(cur * 0.95) },
    { month: "Now", netWorthNpr: Math.round(cur) },
  ];
}

function toYearlySeries(series: { month: string; netWorthNpr: number }[]): { month: string; netWorthNpr: number }[] {
  const byYear = new Map<string, number>();
  const sorted = [...series].sort((a, b) => a.month.localeCompare(b.month));
  for (const p of sorted) {
    const y = p.month.length >= 4 ? p.month.slice(0, 4) : p.month;
    byYear.set(y, p.netWorthNpr);
  }
  return [...byYear.entries()].map(([month, netWorthNpr]) => ({ month, netWorthNpr }));
}

function pickReShowcaseRow(rows: RealEstateRow[], krwPerNpr: number, usdPerNpr: number): RealEstateRow | null {
  let best: { row: RealEstateRow; npr: number } | null = null;
  for (const r of rows) {
    const ev = r.estimatedValue;
    if (ev == null || ev <= 0 || !Number.isFinite(ev)) continue;
    const npr = amountToNpr(ev, r.currency, krwPerNpr, usdPerNpr);
    if (!best || npr > best.npr) best = { row: r, npr };
  }
  return best?.row ?? (rows[0] ?? null);
}

type Props = {
  allocation: { label: string; value: number; npr: number }[];
  investmentByKindNpr: Record<string, number>;
  history: { month: string; netWorthNpr: number }[];
  netWorthCurrent: number;
  passiveMonthlyNpr: number;
  fireScore: number;
  investableNpr: number;
  realEstateRows: RealEstateRow[];
  krwPerNpr: number;
  usdPerNpr: number;
  hydrated: boolean;
};

export function WealthChartsPanel({
  allocation,
  investmentByKindNpr,
  history,
  netWorthCurrent,
  passiveMonthlyNpr,
  fireScore,
  investableNpr,
  realEstateRows,
  krwPerNpr,
  usdPerNpr,
  hydrated,
}: Props) {
  const fireRingGradId = useId().replace(/:/g, "");
  const [nwMode, setNwMode] = useState<"monthly" | "yearly">("monthly");
  const [mounted, setMounted] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const t = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(t);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const upd = () => setReducedMotion(mq.matches);
    upd();
    mq.addEventListener("change", upd);
    return () => mq.removeEventListener("change", upd);
  }, []);

  const { resolvedTheme } = useFireTheme();
  const chartUi = useMemo(() => getWealthChartUi(resolvedTheme), [resolvedTheme]);
  const fonts = useMemo(() => wealthChartFontsForTheme(resolvedTheme), [resolvedTheme]);
  const premiumTt = useMemo(() => premiumTooltipForTheme(resolvedTheme), [resolvedTheme]);
  const chartFont = fonts.tick;

  const pieData = useMemo(() => {
    const slices = allocation.filter((a) => a.npr > 1);
    if (slices.length === 0) {
      return {
        labels: ["No assets yet"],
        datasets: [
          {
            data: [1],
            backgroundColor: ["rgba(52, 211, 153, 0.18)"],
            borderColor: chartUi.pieBorder,
            borderWidth: 2,
            hoverOffset: 18,
            hoverBorderWidth: 3,
          },
        ],
      };
    }
    return {
      labels: slices.map((a) => a.label),
      datasets: [
        {
          data: slices.map((a) => a.npr),
          backgroundColor: slices.map(
            (_, i) =>
              [
                "rgba(52, 211, 153, 0.88)",
                "rgba(16, 185, 129, 0.82)",
                "rgba(250, 204, 21, 0.78)",
                "rgba(45, 212, 191, 0.82)",
                "rgba(110, 231, 183, 0.72)",
                "rgba(99, 102, 241, 0.78)",
                "rgba(167, 139, 250, 0.72)",
              ][i % 7],
          ),
          borderColor: chartUi.pieBorder,
          borderWidth: 2,
          hoverBorderColor: chartUi.pieHoverBorder,
          hoverOffset: 18,
          hoverBorderWidth: 3,
          spacing: 2,
        },
      ],
    };
  }, [allocation, chartUi.pieBorder, chartUi.pieHoverBorder]);

  const lineSeries = useMemo(() => {
    const base = baselineHistory(history, netWorthCurrent);
    if (nwMode === "yearly") return toYearlySeries(base);
    return base;
  }, [history, netWorthCurrent, nwMode]);

  const fireMilestonesNpr = useMemo(() => {
    const annual = Math.max(0, passiveMonthlyNpr * 12);
    return {
      lean: annual * 15,
      fire: annual * 25,
      fat: annual * 33,
    };
  }, [passiveMonthlyNpr]);

  const horizontalLines: WealthHorizontalLine[] = useMemo(() => {
    const max = Math.max(netWorthCurrent, ...lineSeries.map((p) => p.netWorthNpr), fireMilestonesNpr.fat);
    if (max <= 0) return [];
    const lines: WealthHorizontalLine[] = [
      { y: fireMilestonesNpr.lean, label: "Lean FI (15×)", color: "rgba(45, 212, 191, 0.55)", dash: [4, 6] },
      { y: fireMilestonesNpr.fire, label: "Classic FI (25×)", color: "rgba(250, 204, 21, 0.65)", dash: [6, 4] },
      { y: fireMilestonesNpr.fat, label: "Fat FI (33×)", color: "rgba(167, 139, 250, 0.55)", dash: [2, 4] },
    ];
    return lines.filter((l) => l.y > 0 && l.y <= max * 1.35);
  }, [fireMilestonesNpr, lineSeries, netWorthCurrent]);

  const lineData = useMemo(() => {
    const labels = lineSeries.map((h) => h.month);
    const values = lineSeries.map((h) => h.netWorthNpr);
    const tension = 0.42;
    return {
      labels,
      datasets: [
        neonUnderlayLineDataset(values, tension, chartUi.neonLineUnderlay, 9),
        {
          label: "Net worth (NPR)",
          data: values,
          order: 1,
          borderColor: "rgba(52, 211, 153, 1)",
          borderWidth: 2.5,
          tension,
          pointRadius: 4,
          pointHoverRadius: 8,
          pointBackgroundColor: chartUi.pointFill,
          pointBorderColor: chartUi.pointStroke,
          pointBorderWidth: 2,
          fill: true,
          backgroundColor: emeraldAreaFill,
        },
      ],
    };
  }, [lineSeries, chartUi.neonLineUnderlay, chartUi.pointFill, chartUi.pointStroke]);

  const nwMilestoneMarkers = useMemo(() => {
    const values = lineSeries.map((h) => h.netWorthNpr);
    const th = horizontalLines.map((l) => ({ y: l.y, label: l.label, color: l.color }));
    return milestoneCrossings(values, th);
  }, [lineSeries, horizontalLines]);

  const barKeys = ["nepse", "sip", "closed_end_mf", "us_stock", "etf", "crypto"];
  const barLabels = barKeys.map((k) => KIND_LABELS[k] ?? k);
  const barValues = barKeys.map((k) => investmentByKindNpr[k] ?? 0);

  const barGradients = useMemo(
    () => [
      "rgba(52, 211, 153, 0.85)",
      "rgba(45, 212, 191, 0.8)",
      "rgba(16, 185, 129, 0.78)",
      "rgba(250, 204, 21, 0.75)",
      "rgba(110, 231, 183, 0.72)",
      "rgba(99, 102, 241, 0.78)",
    ],
    [],
  );

  const barData = useMemo(
    () => ({
      labels: barLabels,
      datasets: [
        {
          label: "Live value (NPR)",
          data: barValues,
          backgroundColor: barValues.map((_, i) => barGradients[i % barGradients.length]),
          borderRadius: 10,
          borderSkipped: false,
          borderWidth: 1,
          borderColor: chartUi.pieBorder,
          hoverBorderColor: chartUi.pieHoverBorder,
          hoverBackgroundColor: barGradients,
        },
      ],
    }),
    [barLabels, barValues, barGradients, chartUi.pieBorder, chartUi.pieHoverBorder],
  );

  const savingsMixData = useMemo(() => {
    const months = 13;
    const labels = Array.from({ length: months }, (_, i) => (i === 0 ? "Now" : `+${i}m`));
    const monthlyContrib = Array.from({ length: months }, () => passiveMonthlyNpr);
    const passiveStack = Array.from({ length: months }, (_, i) => passiveMonthlyNpr * i);
    const monthlyRate = 0.055 / 12;
    const compoundInvest = Array.from({ length: months }, (_, i) =>
      investableNpr > 0 ? investableNpr * (1 + monthlyRate) ** i : 0,
    );
    return {
      labels,
      datasets: [
        {
          type: "bar" as const,
          label: "Monthly contribution (est.)",
          yAxisID: "yContrib",
          order: 2,
          data: monthlyContrib,
          backgroundColor: "rgba(52, 211, 153, 0.42)",
          borderColor: "rgba(167, 243, 208, 0.32)",
          borderRadius: 7,
          borderWidth: 1,
          maxBarThickness: 28,
        },
        {
          type: "line" as const,
          label: "Cumulative passive (plan)",
          yAxisID: "yWealth",
          order: 1,
          data: passiveStack,
          borderColor: "rgba(250, 204, 21, 0.92)",
          backgroundColor: "rgba(250, 204, 21, 0.06)",
          fill: true,
          tension: 0.35,
          pointRadius: 0,
          borderWidth: 2,
        },
        {
          type: "line" as const,
          label: "Investable @ ~5.5% / yr (illustrative)",
          yAxisID: "yWealth",
          order: 0,
          data: compoundInvest,
          borderColor: "rgba(129, 140, 248, 0.95)",
          backgroundColor: "rgba(99, 102, 241, 0.05)",
          fill: true,
          tension: 0.35,
          pointRadius: 0,
          borderWidth: 2.2,
        },
      ],
    };
  }, [passiveMonthlyNpr, investableNpr]);

  const passiveIncomeTrendData = useMemo(() => {
    const months = 13;
    const labels = Array.from({ length: months }, (_, i) => (i === 0 ? "Now" : `+${i}m`));
    const base = passiveMonthlyNpr;
    const data = Array.from({ length: months }, (_, i) => base * (1 + (0.08 * i) / Math.max(1, months - 1)));
    const tension = 0.42;
    return {
      labels,
      datasets: [
        neonUnderlayLineDataset(data, tension, "rgba(167, 139, 250, 0.38)", 7),
        {
          label: "Passive income glide (illustrative)",
          data,
          order: 1,
          borderColor: "rgba(192, 132, 252, 0.95)",
          borderWidth: 2.5,
          tension,
          fill: true,
          backgroundColor: passivePurpleEmeraldFill,
          pointRadius: 0,
          pointHoverRadius: 6,
        },
      ],
    };
  }, [passiveMonthlyNpr]);

  const reShowcase = useMemo(
    () => pickReShowcaseRow(realEstateRows, krwPerNpr, usdPerNpr),
    [realEstateRows, krwPerNpr, usdPerNpr],
  );

  const reProjectionChart = useMemo(() => {
    if (!reShowcase) return null;
    const est = reShowcase.estimatedValue;
    if (est == null || est <= 0) return null;
    const estNpr = amountToNpr(est, reShowcase.currency, krwPerNpr, usdPerNpr);
    const rPct =
      typeof reShowcase.annualAppreciationEstimatePct === "number" && reShowcase.annualAppreciationEstimatePct >= 0
        ? reShowcase.annualAppreciationEstimatePct
        : REAL_ESTATE_INFLATION_PROXY_PCT;
    const r = Math.min(25, rPct) / 100;
    const years = 13;
    const labels = Array.from({ length: years }, (_, i) => (i === 0 ? "Today" : `+${i}y`));
    const forward = Array.from({ length: years }, (_, i) => estNpr * (1 + r) ** i);
    const targetProj = reAppreciationTargetProjection(reShowcase);
    const impliedCagr = targetProj?.impliedCagrFromMarketPct;
    const impliedLine =
      impliedCagr != null && Number.isFinite(impliedCagr)
        ? Array.from({ length: years }, (_, i) => estNpr * (1 + Math.max(0, impliedCagr) / 100) ** i)
        : null;
    return {
      labels,
      forward,
      impliedLine,
      targetY: targetProj?.targetFutureValue != null ? amountToNpr(targetProj.targetFutureValue, reShowcase.currency, krwPerNpr, usdPerNpr) : null,
      name: [reShowcase.name, reShowcase.location?.trim()].filter(Boolean).join(" · ") || reShowcase.propertyType,
      rPct,
    };
  }, [reShowcase, krwPerNpr, usdPerNpr]);

  const reLineData = useMemo(() => {
    if (!reProjectionChart) return null;
    const datasets = [
      {
        label: `Forward @ ${reProjectionChart.rPct.toFixed(1)}% / yr (est.)`,
        data: reProjectionChart.forward,
        borderColor: "rgba(45, 212, 191, 0.95)",
        backgroundColor: "rgba(45, 212, 191, 0.1)",
        fill: true,
        tension: 0.38,
        borderWidth: 2.5,
        pointRadius: 3,
        pointHoverRadius: 6,
      },
    ];
    if (reProjectionChart.impliedLine) {
      datasets.push({
        label: "Implied market CAGR path",
        data: reProjectionChart.impliedLine,
        borderColor: "rgba(250, 204, 21, 0.85)",
        backgroundColor: "rgba(0,0,0,0)",
        fill: false,
        tension: 0.38,
        borderWidth: 2,
        borderDash: [5, 5],
        pointRadius: 0,
        pointHoverRadius: 0,
      } as (typeof datasets)[0]);
    }
    return {
      labels: reProjectionChart.labels,
      datasets,
    };
  }, [reProjectionChart]);

  const reHorizontalLines: WealthHorizontalLine[] = useMemo(() => {
    if (!reProjectionChart?.targetY) return [];
    return [
      {
        y: reProjectionChart.targetY,
        label: "Compound-from-purchase target (today)",
        color: "rgba(250, 204, 21, 0.7)",
        dash: [4, 4],
      },
    ];
  }, [reProjectionChart]);

  const reProjectionDiamonds = useMemo(() => {
    if (!reLineData) return [];
    const n = reLineData.labels.length;
    const raw: { index: number; label: string }[] = [
      { index: 0, label: "Today" },
      { index: Math.min(5, n - 1), label: "+5y" },
      { index: Math.min(10, n - 1), label: "+10y" },
      { index: n - 1, label: "Horizon" },
    ];
    const seen = new Set<number>();
    return raw.filter((m) => {
      if (seen.has(m.index)) return false;
      seen.add(m.index);
      return true;
    });
  }, [reLineData]);

  const commonLegend = useMemo(
    () => ({
      labels: { color: chartUi.legend, font: fonts.legend, boxWidth: 12, usePointStyle: true, padding: 12 },
    }),
    [chartUi.legend, fonts.legend],
  );

  const formatNpr = (n: number) => formatMoney(n, "NPR");

  return (
    <section className="wealth-glass wealth-charts-root relative min-w-0 max-w-full overflow-hidden rounded-[1.45rem] p-5 ring-1 ring-white/[0.04] sm:rounded-[1.65rem] sm:p-6">
      <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-28 -left-16 h-64 w-64 rounded-full bg-lime-400/8 blur-3xl" />

      <div className="relative mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="fn-txt-primary text-xl font-black tracking-tight sm:text-2xl">Wealth intelligence</h2>
          <p className="fn-txt-secondary mt-1 text-xs font-semibold leading-snug sm:text-sm">
            Interactive analytics · FIRE runway overlays · projections (illustrative, not advice).
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="fn-txt-muted text-xs font-black uppercase tracking-wide sm:text-sm">Net worth</span>
          <div
            className={`inline-flex rounded-full border p-0.5 transition-colors duration-300 ${
              resolvedTheme === "light"
                ? "border-emerald-300/50 bg-white/90 shadow-sm"
                : "border-emerald-400/20 bg-black/35"
            }`}
          >
            <button
              type="button"
              onClick={() => setNwMode("monthly")}
              className={`rounded-full px-3 py-1.5 text-xs font-black uppercase tracking-wide transition sm:text-sm ${
                nwMode === "monthly"
                  ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-[color:var(--text-on-accent)] shadow-md"
                  : resolvedTheme === "light"
                    ? "text-slate-600 hover:bg-slate-100/90 hover:text-slate-900"
                    : "text-zinc-200 hover:text-emerald-100"
              }`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setNwMode("yearly")}
              className={`rounded-full px-3 py-1.5 text-xs font-black uppercase tracking-wide transition sm:text-sm ${
                nwMode === "yearly"
                  ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-[color:var(--text-on-accent)] shadow-md"
                  : resolvedTheme === "light"
                    ? "text-slate-600 hover:bg-slate-100/90 hover:text-slate-900"
                    : "text-zinc-200 hover:text-emerald-100"
              }`}
            >
              Yearly
            </button>
          </div>
        </div>
      </div>

      {!hydrated || !mounted ? (
        <div
          className="wealth-chart-loading relative mb-4 h-48 overflow-hidden rounded-2xl bg-emerald-950/40 ring-1 ring-emerald-400/15"
          aria-hidden
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-emerald-400/12 to-transparent wealth-chart-loading-shimmer" />
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="fn-txt-muted text-xs font-black uppercase tracking-widest sm:text-sm">Loading charts…</p>
          </div>
        </div>
      ) : null}

      <div className={`relative space-y-5 ${!hydrated || !mounted ? "opacity-40" : "opacity-100"} transition-opacity duration-500`}>
        <div className="grid min-w-0 gap-4 lg:grid-cols-5">
          <div className="wealth-chart-card group relative min-w-0 overflow-hidden rounded-2xl p-3 ring-1 ring-white/[0.04] transition-shadow duration-300 sm:p-4 lg:col-span-3 lg:min-h-[280px]">
            <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
              <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-emerald-500/10 to-transparent" />
            </div>
            <div className="relative mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className="fn-txt-label text-xs font-black uppercase tracking-wide sm:text-[13px]">Net worth trajectory</p>
              <p className="fn-txt-muted text-[11px] font-bold leading-snug sm:text-xs">Hover points · dashed = FI multiples on passive income</p>
            </div>
            <div className="relative h-[220px] sm:h-[260px] [contain:layout_paint]">
              <Line
                data={lineData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  animation: premiumAnim(reducedMotion),
                  interaction: { mode: "index", intersect: false },
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                      ...premiumTt,
                      filter: (item) => Boolean(item.dataset.label),
                      callbacks: {
                        label(ctx) {
                          if (!ctx.dataset.label) return "";
                          const v = ctx.parsed.y;
                          return ` ${ctx.dataset.label}: ${formatNpr(typeof v === "number" ? v : 0)}`;
                        },
                      },
                    },
                    ...( {
                      wealthHorizontalLines: { lines: horizontalLines },
                      wealthMilestoneMarkers: { markers: nwMilestoneMarkers },
                    } as Record<string, unknown>),
                  },
                  scales: {
                    x: {
                      ticks: { color: chartUi.tick, maxRotation: 40, font: chartFont },
                      grid: { color: chartUi.gridPrimary },
                    },
                    y: {
                      ticks: {
                        color: chartUi.tick,
                        font: chartFont,
                        callback: (v) => (typeof v === "number" ? `${(v / 1e6).toFixed(1)}M` : v),
                      },
                      grid: { color: chartUi.gridStrong },
                    },
                  },
                }}
              />
            </div>
            <div className="fn-txt-secondary relative mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs font-bold leading-snug sm:text-[13px]">
              {horizontalLines.map((l) => (
                <span key={l.label} className="inline-flex items-center gap-1.5">
                  <span className="h-0.5 w-4 rounded-full" style={{ backgroundColor: l.color }} />
                  {l.label}: {formatNpr(l.y ?? 0)}
                </span>
              ))}
            </div>
          </div>

          <div className="wealth-chart-card flex min-w-0 flex-col gap-4 rounded-2xl p-4 ring-1 ring-white/[0.04] sm:flex-row sm:items-stretch lg:col-span-2">
            <div className="min-w-0 flex-1">
              <p className="fn-txt-label text-xs font-black uppercase tracking-wide sm:text-[13px]">FIRE journey</p>
              <p className="fn-txt-primary mt-1 text-3xl font-black tabular-nums sm:text-4xl">{fireScore}</p>
              <p className="fn-txt-muted text-[11px] font-bold leading-snug sm:text-xs">Readiness score (composite)</p>
            </div>
            <div className="relative mx-auto flex shrink-0 items-center justify-center sm:mx-0 sm:w-[132px]">
              <svg width="120" height="120" viewBox="0 0 120 120" className="-rotate-90" aria-hidden>
                <defs>
                  <linearGradient id={fireRingGradId} x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#34d399" />
                    <stop offset="55%" stopColor="#a3e635" />
                    <stop offset="100%" stopColor="#c084fc" />
                  </linearGradient>
                </defs>
                <circle
                  cx="60"
                  cy="60"
                  r="50"
                  fill="none"
                  stroke={chartUi.ringTrack}
                  strokeWidth="10"
                />
                <circle
                  cx="60"
                  cy="60"
                  r="50"
                  fill="none"
                  stroke={`url(#${fireRingGradId})`}
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 50}
                  strokeDashoffset={2 * Math.PI * 50 * (1 - Math.min(100, Math.max(0, fireScore)) / 100)}
                  className="transition-[stroke-dashoffset] duration-[1100ms] ease-out"
                  style={{
                    filter: "drop-shadow(0 0 10px rgba(52,211,153,0.45))",
                  }}
                />
              </svg>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="fn-txt-primary text-xl font-black tabular-nums sm:text-2xl">{fireScore}</span>
                <span className="fn-txt-muted text-[10px] font-bold uppercase tracking-wide sm:text-[11px]">/ 100</span>
              </div>
            </div>
            <div className="min-w-0 flex-1 space-y-2 sm:pt-1">
              <div className="relative h-3 overflow-hidden rounded-full bg-black/40 ring-1 ring-emerald-400/15">
                <div
                  className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-emerald-500 via-lime-400 to-amber-300 shadow-[0_0_24px_rgba(52,211,153,0.45)] transition-[width] duration-[900ms] ease-out"
                  style={{ width: `${Math.min(100, Math.max(4, fireScore))}%` }}
                />
                {[25, 50, 75].map((m) => (
                  <div
                    key={m}
                    className="absolute top-0 h-full w-px -translate-x-px bg-emerald-100/25"
                    style={{ left: `${m}%` }}
                    title={`${m}%`}
                  />
                ))}
              </div>
              <div className="fn-txt-muted flex justify-between text-[10px] font-black uppercase tracking-wide sm:text-[11px]">
                <span>Start</span>
                <span>25</span>
                <span>50</span>
                <span>75</span>
                <span>FI</span>
              </div>
              <p className="fn-txt-muted text-[11px] font-semibold leading-snug sm:text-xs">
                Ring + bar mirror the same score. Milestones tie to 15× / 25× / 33× passive-income multiples on the net
                worth chart.
              </p>
            </div>
          </div>
        </div>

        <div className="grid min-w-0 gap-4 lg:grid-cols-3">
          <div className="wealth-chart-card min-w-0 rounded-2xl p-3 transition-transform duration-300 hover:-translate-y-0.5 hover:shadow-[0_0_40px_-8px_rgba(52,211,153,0.25)] sm:p-4">
            <p className="fn-txt-label mb-2 text-xs font-black uppercase tracking-wide sm:text-[13px]">Asset allocation</p>
            <div className="relative mx-auto h-[210px] min-w-0 max-w-full overflow-hidden sm:h-[230px] sm:max-w-[260px]">
              <Doughnut
                data={pieData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  cutout: "62%",
                  animation: { ...premiumAnim(reducedMotion), animateRotate: true },
                  plugins: {
                    legend: {
                      position: "bottom" as const,
                      labels: {
                        ...commonLegend.labels,
                        generateLabels: (ch) =>
                          allocationLegendGenerateLabels(ch as ChartModel<"doughnut">, formatNpr, {
                            legendStrokeStyle: chartUi.legendStroke,
                          }),
                      },
                      onHover(evt, _item, legend) {
                        (legend.chart.canvas as HTMLCanvasElement).style.cursor = "pointer";
                        const native = (evt as unknown as { native?: { target?: EventTarget | null } }).native;
                        const el = native?.target;
                        if (el instanceof HTMLElement) el.style.cursor = "pointer";
                      },
                      onLeave(evt, _item, legend) {
                        (legend.chart.canvas as HTMLCanvasElement).style.cursor = "default";
                      },
                    },
                    tooltip: {
                      ...premiumTt,
                      callbacks: {
                        label(ctx) {
                          const raw = ctx.raw as number;
                          const total = (ctx.dataset.data as number[]).reduce((a, b) => a + b, 0) || 1;
                          const pct = ((raw / total) * 100).toFixed(1);
                          return ` ${ctx.label}: ${formatNpr(raw)} (${pct}%)`;
                        },
                      },
                    },
                  },
                }}
              />
            </div>
          </div>

          <div className="wealth-chart-card min-w-0 rounded-2xl p-3 sm:p-4">
            <p className="fn-txt-label mb-2 text-xs font-black uppercase tracking-wide sm:text-[13px]">Investment mix</p>
            <div className="h-[210px] min-w-0 max-w-full overflow-hidden sm:h-[230px]">
              <Bar
                data={barData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  animation: premiumAnim(reducedMotion),
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                      ...premiumTt,
                      callbacks: {
                        label(ctx) {
                          const v = ctx.parsed.y;
                          return ` ${formatNpr(typeof v === "number" ? v : 0)}`;
                        },
                      },
                    },
                  },
                  scales: {
                    x: {
                      ticks: { color: chartUi.tick, font: chartFont, maxRotation: 35 },
                      grid: { display: false },
                    },
                    y: {
                      ticks: {
                        color: chartUi.tick,
                        font: chartFont,
                        callback: (v) => (typeof v === "number" ? `${(v / 1e6).toFixed(1)}M` : v),
                      },
                      grid: { color: chartUi.gridStrong },
                    },
                  },
                }}
              />
            </div>
          </div>

          <div className="wealth-chart-card min-w-0 rounded-2xl p-3 sm:p-4">
            <p className="fn-txt-label mb-2 text-xs font-black uppercase tracking-wide sm:text-[13px]">
              Savings & investment trend
            </p>
            <p className="fn-txt-muted mb-2 text-[11px] font-semibold leading-snug sm:text-xs">
              Monthly contribution (bars) vs cumulative passive plan + investable compounding (lines, dual scale).
            </p>
            <div className="h-[210px] min-w-0 max-w-full overflow-hidden sm:h-[230px]">
              <Chart
                type="bar"
                data={savingsMixData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  animation: premiumAnim(reducedMotion),
                  interaction: { mode: "index", intersect: false },
                  plugins: {
                    legend: { ...commonLegend, position: "bottom" as const },
                    tooltip: {
                      ...premiumTt,
                      callbacks: {
                        label(ctx) {
                          const v = ctx.parsed.y;
                          return ` ${ctx.dataset.label ?? ""}: ${formatNpr(typeof v === "number" ? v : 0)}`;
                        },
                      },
                    },
                  },
                  scales: {
                    x: {
                      stacked: false,
                      ticks: { color: chartUi.tick, font: chartFont },
                      grid: { color: chartUi.gridPrimary },
                    },
                    yContrib: {
                      type: "linear",
                      position: "left",
                      suggestedMax: Math.max(passiveMonthlyNpr * 2.25, 1000),
                      ticks: {
                        color: chartUi.tick,
                        font: chartFont,
                        maxTicksLimit: 5,
                        callback: (v) => (typeof v === "number" ? formatNpr(v) : v),
                      },
                      grid: { color: chartUi.gridStrong },
                      title: {
                        display: true,
                        text: "Monthly flow",
                        color: chartUi.dualAxisTitleLeft,
                        font: { size: 12, weight: "bold" },
                      },
                    },
                    yWealth: {
                      type: "linear",
                      position: "right",
                      grid: { drawOnChartArea: false },
                      ticks: {
                        color: chartUi.violetTick,
                        font: chartFont,
                        maxTicksLimit: 6,
                        callback: (v) => (typeof v === "number" ? `${(v / 1e6).toFixed(2)}M` : v),
                      },
                      title: {
                        display: true,
                        text: "Wealth (NPR)",
                        color: chartUi.dualAxisTitleRight,
                        font: { size: 12, weight: "bold" },
                      },
                    },
                  },
                }}
              />
            </div>
          </div>
        </div>

        <div className="wealth-chart-card min-w-0 rounded-2xl p-4 ring-1 ring-violet-400/15 sm:p-5">
          <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="fn-txt-label text-xs font-black uppercase tracking-wide sm:text-[13px]">Passive income trend</p>
              <p className="fn-txt-muted mt-0.5 text-[11px] font-semibold leading-snug sm:text-xs">
                Illustrative glide (purple) with emerald depth — not a forecast of contractual cashflows.
              </p>
            </div>
          </div>
          <div className="h-[200px] min-w-0 max-w-full overflow-hidden sm:h-[240px]">
            <Line
              data={passiveIncomeTrendData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                animation: premiumAnim(reducedMotion),
                interaction: { mode: "index", intersect: false },
                plugins: {
                  legend: { display: false },
                  tooltip: {
                    ...premiumTt,
                    filter: (item) => Boolean(item.dataset.label),
                    callbacks: {
                      label(ctx) {
                        if (!ctx.dataset.label) return "";
                        const v = ctx.parsed.y;
                        return ` ${ctx.dataset.label}: ${formatNpr(typeof v === "number" ? v : 0)}`;
                      },
                    },
                  },
                },
                scales: {
                  x: {
                    ticks: { color: chartUi.violetTick, font: chartFont, maxRotation: 0 },
                    grid: { color: chartUi.violetGrid },
                  },
                  y: {
                    ticks: {
                      color: chartUi.tick,
                      font: chartFont,
                      callback: (v) => (typeof v === "number" ? formatNpr(v) : v),
                    },
                    grid: { color: chartUi.gridStrong },
                  },
                },
              }}
            />
          </div>
        </div>

        {reLineData && reProjectionChart ? (
          <div className="wealth-chart-card min-w-0 rounded-2xl p-3 ring-1 ring-teal-400/15 sm:p-4">
            <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="fn-txt-label text-xs font-black uppercase tracking-wide sm:text-[13px]">Real estate · forward lens</p>
                <p className="fn-txt-primary mt-0.5 text-sm font-bold sm:text-base">{reProjectionChart.name}</p>
              </div>
              <p className="fn-txt-muted max-w-md text-right text-[11px] font-semibold leading-snug sm:text-xs">
                CAGR-style path vs your appreciation assumption. Gold dashed = compound-from-purchase target at today
                (when inputs allow). Diamond markers highlight Today / +5y / +10y / horizon on the primary curve.
              </p>
            </div>
            <div className="h-[220px] min-w-0 max-w-full overflow-hidden sm:h-[260px]">
              <Line
                data={reLineData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  animation: premiumAnim(reducedMotion),
                  interaction: { mode: "index", intersect: false },
                  plugins: {
                    legend: { ...commonLegend, position: "top" as const },
                    tooltip: {
                      ...premiumTt,
                      callbacks: {
                        label(ctx) {
                          const v = ctx.parsed.y;
                          return ` ${ctx.dataset.label}: ${formatNpr(typeof v === "number" ? v : 0)}`;
                        },
                      },
                    },
                    ...( {
                      wealthHorizontalLines: { lines: reHorizontalLines },
                      wealthProjectionMarkers: { markers: reProjectionDiamonds, datasetIndex: 0 },
                    } as Record<string, unknown>),
                  },
                  scales: {
                    x: {
                      ticks: { color: chartUi.tealTick, font: chartFont },
                      grid: { color: chartUi.tealGrid },
                    },
                    y: {
                      ticks: {
                        color: chartUi.tealTick,
                        font: chartFont,
                        callback: (v) => (typeof v === "number" ? `${(v / 1e6).toFixed(2)}M` : v),
                      },
                      grid: { color: chartUi.tealGrid },
                    },
                  },
                }}
              />
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
