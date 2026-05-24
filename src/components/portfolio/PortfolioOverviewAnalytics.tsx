"use client";

import {
  ArcElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
  type TooltipItem,
} from "chart.js";
import { useEffect, useMemo, useState, useCallback } from "react";
import { Doughnut, Line } from "react-chartjs-2";
import type { Chart as ChartModel } from "chart.js";
import {
  allocationLegendGenerateLabels,
  emeraldAreaFill,
  neonUnderlayLineDataset,
  passivePurpleEmeraldFill,
  premiumAnim,
} from "@/components/portfolio/wealth-premium-charts";
import { WealthMomentumStrip } from "@/components/portfolio/WealthMomentumStrip";
import { registerWealthChartPlugins } from "@/components/portfolio/wealth-chart-plugins";
import type { NetWorthHistoryPoint } from "@/components/portfolio/types";
import { useFireTheme } from "@/contexts/FireThemeContext";
import { useCountUpNumber } from "@/hooks/useCountUpNumber";
import {
  getWealthChartUi,
  premiumTooltipForTheme,
  wealthChartFontsForTheme,
} from "@/lib/fire-dash-chart-theme";
import { formatMoney } from "@/lib/expense-utils";

ChartJS.register(ArcElement, CategoryScale, Legend, LinearScale, LineElement, PointElement, Tooltip, Filler);
registerWealthChartPlugins();

/** Short x-axis labels (e.g. Jan '24) so multi-year ranges stay readable on 13" / tablet widths. */
function shortMonthLabel(isoYm: string): string {
  if (/^\d{4}-\d{2}$/.test(isoYm)) {
    const [y, m] = isoYm.split("-");
    const mi = Math.max(1, Math.min(12, parseInt(m ?? "1", 10))) - 1;
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const yy = (y ?? "").slice(-2);
    return `${months[mi] ?? isoYm} '${yy}`;
  }
  return isoYm;
}

function baselineNwHistory(history: NetWorthHistoryPoint[], netWorthCurrent: number): NetWorthHistoryPoint[] {
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

function HeroKpi({
  label,
  valueNpr,
  hint,
  accent,
  reducedMotion,
}: {
  label: string;
  valueNpr: number;
  hint?: string;
  accent?: "default" | "rose" | "lime" | "amber";
  reducedMotion: boolean;
}) {
  const v = useCountUpNumber(valueNpr, { skipAnimation: reducedMotion });
  const border =
    accent === "rose"
      ? "border-rose-400/30"
      : accent === "lime"
        ? "border-lime-400/30"
        : accent === "amber"
          ? "border-amber-400/28"
          : "border-emerald-400/22";

  return (
    <div
      data-accent={accent === "default" ? undefined : accent}
      className={`wealth-kpi-hero group relative overflow-hidden rounded-[1.2rem] border bg-gradient-to-br from-black/48 via-emerald-950/28 to-black/52 p-3.5 sm:p-4 ${border} transition-[border-color,background-color,box-shadow] duration-300 hover:border-emerald-300/35`}
    >
      <div className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-emerald-400/10 blur-2xl transition-opacity duration-500 group-hover:opacity-100" />
      <div className="pointer-events-none absolute -bottom-10 -left-6 h-24 w-24 rounded-full bg-lime-400/8 blur-2xl" />
      <p className="fn-txt-label relative text-[11px] font-black uppercase tracking-wide sm:text-xs">{label}</p>
      <p className="fn-txt-primary relative mt-2 text-xl font-black tabular-nums tracking-tight sm:text-2xl sm:tracking-tight">
        {formatMoney(Math.round(v), "NPR")}
      </p>
      {hint ? (
        <p className="fn-txt-muted relative mt-1 text-[11px] font-bold leading-snug sm:text-xs">{hint}</p>
      ) : null}
    </div>
  );
}

export function PortfolioOverviewAnalytics({
  hydrated,
  metricTiles,
  netWorthNpr,
  totalAssetsNpr,
  liabilitiesNpr,
  investableNpr,
  allocation,
  history,
  netWorthCurrent,
  fireScore,
  passiveMonthlyNpr,
  monthDelta,
  healthLabel,
  healthGradient,
  topAllocationLabel,
  topAllocationPct,
  liveDeltaNetWorthNpr,
}: {
  hydrated: boolean;
  metricTiles: Array<{ label: string; value: string; hint?: string; accent?: "default" | "rose" | "lime" | "amber" }>;
  netWorthNpr: number;
  totalAssetsNpr: number;
  liabilitiesNpr: number;
  investableNpr: number;
  allocation: { label: string; value: number; npr: number }[];
  history: NetWorthHistoryPoint[];
  netWorthCurrent: number;
  fireScore: number;
  passiveMonthlyNpr: number;
  monthDelta: number | null;
  healthLabel: string;
  healthGradient: string;
  topAllocationLabel: string;
  topAllocationPct: number;
  liveDeltaNetWorthNpr?: number | null;
}) {
  const [chartsReady, setChartsReady] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setChartsReady(true));
    return () => cancelAnimationFrame(id);
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
  const chartTickCompact = useMemo(() => ({ ...fonts.tickSm, size: 10 }), [fonts]);
  const premiumTt = useMemo(() => premiumTooltipForTheme(resolvedTheme), [resolvedTheme]);

  const nwSeries = useMemo(() => {
    const full = baselineNwHistory(history, netWorthCurrent);
    const tail = full.length > 14 ? full.slice(-14) : full;
    return tail;
  }, [history, netWorthCurrent]);

  const nwLineData = useMemo(() => {
    const labels = nwSeries.map((h) => shortMonthLabel(h.month));
    const values = nwSeries.map((h) => h.netWorthNpr);
    const tension = 0.4;
    return {
      labels,
      datasets: [
        neonUnderlayLineDataset(values, tension, chartUi.neonUnderlay, 6),
        {
          label: "Net worth",
          data: values,
          order: 1,
          borderColor: "rgba(52, 211, 153, 0.98)",
          borderWidth: 2,
          tension,
          pointRadius: 2,
          pointHoverRadius: 6,
          fill: true,
          backgroundColor: emeraldAreaFill,
        },
      ],
    };
  }, [nwSeries, chartUi.neonUnderlay]);

  const allocDonut = useMemo(() => {
    const slices = allocation.filter((a) => a.npr > 1);
    if (!slices.length) {
      return {
        labels: ["—"],
        datasets: [{ data: [1], backgroundColor: ["rgba(52,211,153,0.2)"], borderWidth: 1, borderColor: chartUi.pieBorder, hoverOffset: 8 }],
      };
    }
    return {
      labels: slices.map((s) => s.label),
      datasets: [
        {
          data: slices.map((s) => s.npr),
          backgroundColor: slices.map(
            (_, i) =>
              ["rgba(52,211,153,0.85)", "rgba(45,212,191,0.8)", "rgba(250,204,21,0.75)", "rgba(110,231,183,0.72)", "rgba(99,102,241,0.78)", "rgba(167,139,250,0.7)", "rgba(16,185,129,0.78)"][
                i % 7
              ],
          ),
          borderColor: chartUi.pieBorder,
          borderWidth: 2,
          hoverOffset: 12,
          spacing: 1,
        },
      ],
    };
  }, [allocation, chartUi.pieBorder]);

  const fireDonut = useMemo(
    () => ({
      labels: ["Progress", "Remaining"],
      datasets: [
        {
          data: [Math.max(0.5, fireScore), Math.max(0.5, 100 - fireScore)],
          backgroundColor: ["rgba(52, 211, 153, 0.92)", chartUi.fireDonutTrack],
          borderColor: ["rgba(16, 185, 129, 0.42)", chartUi.fireDonutBorder],
          borderWidth: 2,
          hoverOffset: 6,
        },
      ],
    }),
    [fireScore, chartUi.fireDonutTrack, chartUi.fireDonutBorder],
  );

  const savingsLineData = useMemo(() => {
    const labels = nwSeries.map((h) => shortMonthLabel(h.month));
    const deltas: number[] = nwSeries.reduce<number[]>((acc, h, i) => {
      if (i === 0) {
        acc.push(0);
        return acc;
      }
      const prev = nwSeries[i - 1]!.netWorthNpr;
      const step = Math.max(0, h.netWorthNpr - prev);
      const prevCum = acc[i - 1] ?? 0;
      acc.push(prevCum + step);
      return acc;
    }, []);
    return {
      labels,
      datasets: [
        {
          label: "Cumulative Δ (NPR)",
          data: deltas,
          borderColor: "rgba(250, 204, 21, 0.9)",
          backgroundColor: "rgba(250, 204, 21, 0.12)",
          fill: true,
          tension: 0.35,
          borderWidth: 2,
          pointRadius: 0,
        },
      ],
    };
  }, [nwSeries]);

  const passiveSparkData = useMemo(() => {
    const n = 14;
    const labels = Array.from({ length: n }, (_, i) => `M${i + 1}`);
    const base = passiveMonthlyNpr;
    const data = Array.from({ length: n }, (_, i) => base * (1 + (0.04 * i) / (n - 1 || 1)));
    const tension = 0.45;
    return {
      labels,
      datasets: [
        neonUnderlayLineDataset(data, tension, "rgba(167, 139, 250, 0.32)", 5),
        {
          label: "Passive (est.)",
          data,
          order: 1,
          borderColor: "rgba(216, 180, 254, 0.95)",
          backgroundColor: passivePurpleEmeraldFill,
          fill: true,
          tension,
          borderWidth: 2,
          pointRadius: 0,
        },
      ],
    };
  }, [passiveMonthlyNpr]);

  const footerDeltaDisplay = useCountUpNumber(monthDelta ?? 0, {
    durationMs: 900,
    skipAnimation: reducedMotion || monthDelta === null,
  });

  const miniOpts = useCallback(
    (legend: boolean) => ({
      responsive: true,
      maintainAspectRatio: false,
      animation: premiumAnim(reducedMotion),
      interaction: { mode: "index" as const, intersect: false },
      layout: {
        padding: { left: 0, right: 2, top: 0, bottom: 10 },
      },
      plugins: {
        legend: {
          display: legend,
          labels: { color: fonts.legend.color, font: chartTickCompact, boxWidth: 8, padding: 6 },
        },
        tooltip: {
          ...premiumTt,
          filter: (item: TooltipItem<"line">) => Boolean(item.dataset.label),
          callbacks: {
            title: (items: TooltipItem<"line">[]) => {
              const i = items[0]?.dataIndex;
              if (i == null || i < 0) return "";
              if (nwSeries[i]) return nwSeries[i]!.month;
              const lab = items[0]?.chart?.data?.labels?.[i];
              return typeof lab === "string" ? lab : "";
            },
            label(ctx: TooltipItem<"line">) {
              if (!ctx.dataset.label) return "";
              const v = ctx.parsed.y;
              return ` ${ctx.dataset.label}: ${formatMoney(typeof v === "number" ? v : 0, "NPR")}`;
            },
          },
        },
      },
      scales: {
        x: {
          display: true,
          offset: false,
          ticks: {
            color: chartUi.tick,
            maxRotation: 38,
            minRotation: 0,
            autoSkip: true,
            maxTicksLimit: 14,
            padding: 2,
            font: chartTickCompact,
          },
          grid: { color: chartUi.gridPrimary, drawTicks: false },
          border: { display: false },
        },
        y: {
          display: true,
          ticks: {
            color: chartUi.tick,
            font: chartTickCompact,
            maxTicksLimit: 4,
            padding: 4,
            mirror: false,
          },
          grid: { color: chartUi.gridStrong },
          border: { display: false },
        },
      },
    }),
    [reducedMotion, nwSeries, chartUi, fonts, premiumTt, chartTickCompact],
  );

  const doughnutOpts = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      cutout: "70%",
      layout: { padding: { top: 2, bottom: 2, left: 2, right: 2 } },
      animation: { ...premiumAnim(reducedMotion), animateRotate: true },
      plugins: {
        legend: {
          position: "bottom" as const,
          labels: {
            color: fonts.legend.color,
            font: chartTickCompact,
            boxWidth: 9,
            padding: 5,
            generateLabels: (ch: ChartModel<"doughnut">) =>
              allocationLegendGenerateLabels(ch, (n) => formatMoney(n, "NPR"), {
                legendStrokeStyle: chartUi.legendStroke,
              }),
          },
        },
        tooltip: {
          ...premiumTt,
          callbacks: {
            label(ctx: TooltipItem<"doughnut">) {
              const raw = typeof ctx.raw === "number" ? ctx.raw : Number(ctx.raw);
              const ds = ctx.dataset.data as number[];
              const total = ds.reduce((a, b) => a + b, 0) || 1;
              const pct = ((raw / total) * 100).toFixed(1);
              return ` ${ctx.label}: ${formatMoney(raw, "NPR")} (${pct}%)`;
            },
          },
        },
      },
    }),
    [reducedMotion, fonts, premiumTt, chartTickCompact, chartUi.legendStroke],
  );

  return (
    <section className="wealth-overview-shell relative mb-0 overflow-hidden bg-gradient-to-br from-[#031910]/96 via-[#042a1f]/90 to-[#021910]/96 p-4 ring-1 ring-white/[0.045] backdrop-blur-xl sm:p-5 md:p-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_15%_0%,rgba(52,211,153,0.14),transparent_50%),radial-gradient(ellipse_at_90%_80%,rgba(250,204,21,0.08),transparent_45%)]" />
      <div className="pointer-events-none absolute -right-24 top-1/2 h-64 w-64 -translate-y-1/2 rounded-full bg-emerald-500/5 blur-3xl" />

      <div className="relative mb-5 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="fn-txt-label text-[10px] font-black uppercase tracking-[0.2em] sm:text-[11px]">Portfolio overview</p>
          <h2 className="fn-txt-primary mt-0.5 text-lg font-black tracking-tight sm:text-xl">Live analytics surface</h2>
          <p className="fn-txt-secondary mt-0.5 text-[11px] font-semibold leading-snug sm:text-xs">KPIs animate on load · same calculations as before</p>
        </div>
      </div>

      <WealthMomentumStrip
        netWorthNpr={netWorthNpr}
        monthDelta={monthDelta}
        history={history}
        liveDeltaNetWorthNpr={liveDeltaNetWorthNpr}
        reducedMotion={reducedMotion}
      />

      <div className="relative grid grid-cols-2 gap-3 md:grid-cols-4">
        <HeroKpi
          label="Total net worth"
          valueNpr={netWorthNpr}
          hint="Assets − liabilities"
          reducedMotion={reducedMotion}
        />
        <HeroKpi label="Total assets" valueNpr={totalAssetsNpr} hint="All buckets" accent="lime" reducedMotion={reducedMotion} />
        <HeroKpi label="Total liabilities" valueNpr={liabilitiesNpr} hint="Debt stack" accent="rose" reducedMotion={reducedMotion} />
        <HeroKpi label="Investable wealth" valueNpr={investableNpr} hint="Liquid + investments" reducedMotion={reducedMotion} />
      </div>

      <div
        className={`relative mt-4 grid auto-rows-fr gap-3 transition-opacity duration-500 md:grid-cols-2 md:items-stretch lg:grid-cols-6 ${hydrated && chartsReady ? "opacity-100" : "opacity-30"}`}
      >
        <div className="wealth-overview-chart-shell relative flex min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl px-3 py-2.5 sm:px-3.5 sm:py-3 lg:col-span-2">
          <p className="fn-txt-label shrink-0 text-xs font-black uppercase tracking-wide sm:text-[13px]">Net worth growth</p>
          <div className="relative mt-1.5 min-h-0 w-full min-w-0 flex-1 [--plot-h:108px] sm:[--plot-h:114px] md:[--plot-h:120px]">
            <div className="relative h-[var(--plot-h)] w-full min-w-0">
              <Line data={nwLineData} options={miniOpts(false) as never} />
            </div>
          </div>
        </div>

        <div className="wealth-overview-chart-shell relative flex min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl px-3 py-2.5 sm:px-3.5 sm:py-3 lg:col-span-2">
          <p className="fn-txt-label shrink-0 text-xs font-black uppercase tracking-wide sm:text-[13px]">Asset allocation</p>
          <div className="relative mt-1.5 flex min-h-0 min-w-0 flex-1 items-center justify-center [--plot-h:108px] sm:[--plot-h:114px] md:[--plot-h:120px]">
            <div className="relative aspect-square h-[min(100%,var(--plot-h))] w-[min(100%,var(--plot-h))] max-h-[8rem] max-w-[8rem] sm:max-h-[8.75rem] sm:max-w-[8.75rem]">
              <Doughnut data={allocDonut} options={doughnutOpts as never} />
            </div>
          </div>
        </div>

        <div className="wealth-overview-chart-shell relative flex min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl px-3 py-2.5 sm:px-3.5 sm:py-3 lg:col-span-2">
          <p className="fn-txt-label shrink-0 text-xs font-black uppercase tracking-wide sm:text-[13px]">FIRE progress</p>
          <div className="relative mt-1.5 flex min-h-0 min-w-0 flex-1 items-center justify-center [--plot-h:108px] sm:[--plot-h:114px] md:[--plot-h:120px]">
            <div className="relative aspect-square h-[min(100%,var(--plot-h))] w-[min(100%,var(--plot-h))] max-h-[8rem] max-w-[8rem] sm:max-h-[8.75rem] sm:max-w-[8.75rem]">
              <Doughnut data={fireDonut} options={{ ...doughnutOpts, cutout: "78%" } as never} />
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="fn-txt-primary text-2xl font-black tabular-nums sm:text-3xl">{fireScore}</span>
                <span className="fn-txt-muted text-[10px] font-bold uppercase tracking-wide sm:text-[11px]">/ 100</span>
              </div>
            </div>
          </div>
        </div>

        <div className="wealth-overview-chart-shell relative min-h-0 min-w-0 overflow-hidden rounded-2xl px-3 py-2.5 sm:px-3.5 sm:py-3 lg:col-span-3">
          <p className="fn-txt-label text-[10px] font-black uppercase tracking-wide">Savings trend</p>
          <p className="fn-txt-muted mb-0.5 text-[9px] font-semibold">Cumulative net worth change across snapshots</p>
          <div className="relative mt-1.5 h-[106px] w-full min-w-0 sm:h-[116px] md:h-[122px]">
            <Line data={savingsLineData} options={miniOpts(false) as never} />
          </div>
        </div>

        <div className="wealth-overview-chart-shell relative min-h-0 min-w-0 overflow-hidden rounded-2xl px-3 py-2.5 sm:px-3.5 sm:py-3 lg:col-span-3">
          <p className="fn-txt-label text-xs font-black uppercase tracking-wide sm:text-[13px]">Passive income pulse</p>
          <p className="fn-txt-muted mb-0.5 text-[10px] font-semibold leading-snug sm:text-[11px]">
            Illustrative glide vs current monthly estimate
          </p>
          <div className="relative mt-1.5 h-[106px] w-full min-w-0 sm:h-[116px] md:h-[122px]">
            <Line data={passiveSparkData} options={miniOpts(false) as never} />
          </div>
        </div>
      </div>

      <div className="wealth-dash-analytics-footer relative mt-4 grid gap-3 rounded-2xl border p-3.5 sm:grid-cols-2 sm:p-4 lg:grid-cols-4 lg:p-5">
        <div className="flex items-center gap-3">
          <div
            className="relative grid h-14 w-14 shrink-0 place-items-center rounded-full shadow-[0_0_24px_rgba(52,211,153,0.35)] transition-transform duration-300 hover:scale-105"
            style={{
              background: `conic-gradient(from 0deg, #34d399 ${fireScore * 3.6}deg, ${chartUi.ringTrack} 0deg)`,
            }}
          >
            <div className="wealth-fire-score-inner grid h-[70%] w-[70%] place-items-center rounded-full bg-[#04251c]/95 text-center ring-1 ring-emerald-400/20">
              <span className="fn-txt-primary text-lg font-black tabular-nums sm:text-xl">{fireScore}</span>
            </div>
          </div>
          <div>
            <p className="fn-txt-label text-[11px] font-black uppercase tracking-wide sm:text-xs">FIRE readiness</p>
            <p className="fn-txt-primary text-sm font-black sm:text-base">Score / 100</p>
          </div>
        </div>

        <div>
          <p className="fn-txt-label text-[11px] font-black uppercase tracking-wide sm:text-xs">Financial health</p>
          <p className="fn-txt-primary mt-0.5 text-base font-black sm:text-lg">{healthLabel}</p>
          <div className="wealth-health-bar-track mt-2 h-2 overflow-hidden rounded-full">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${healthGradient} transition-[width] duration-[1100ms] ease-out`}
              style={{ width: `${fireScore}%` }}
            />
          </div>
        </div>

        <div>
          <p className="fn-txt-label text-[11px] font-black uppercase tracking-wide sm:text-xs">Passive income (est.)</p>
          <p className="fn-warning mt-0.5 text-base font-black tabular-nums sm:text-lg">{formatMoney(passiveMonthlyNpr, "NPR")}</p>
          <p className="fn-txt-muted text-[11px] font-bold leading-snug sm:text-xs">4% / yr on investable + dividends + FD</p>
        </div>

        <div>
          <p className="fn-txt-label text-[11px] font-black uppercase tracking-wide sm:text-xs">Monthly wealth Δ</p>
          <p
            className={`mt-0.5 text-base font-black tabular-nums sm:text-lg ${
              monthDelta === null ? "fn-txt-muted" : monthDelta >= 0 ? "fn-positive" : "fn-negative"
            }`}
          >
            {monthDelta === null
              ? "—"
              : `${monthDelta >= 0 ? "+" : "−"}${formatMoney(Math.round(Math.abs(footerDeltaDisplay)), "NPR")}`}
          </p>
          <p className="fn-txt-muted text-[11px] font-bold leading-snug sm:text-xs">
            vs prior snapshot · Top: {topAllocationLabel}{" "}
            <span className="fn-accent">({topAllocationPct.toFixed(0)}%)</span>
          </p>
        </div>
      </div>

      <div className="relative mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 md:grid-cols-4 lg:grid-cols-6">
        {metricTiles.map((t, i) => {
          const border =
            t.accent === "rose"
              ? "border-rose-400/22"
              : t.accent === "lime"
                ? "border-lime-400/22"
                : t.accent === "amber"
                  ? "border-amber-400/22"
                  : "border-emerald-400/14";
          return (
            <div
              key={`${t.label}-${i}`}
              className={`wealth-metric-tile wealth-overview-metric-animate rounded-xl border p-3 transition-[border-color] duration-300 hover:border-emerald-300/30 sm:p-3.5 ${border}`}
              style={{
                animation: "overview-tile 0.55s ease-out both",
                animationDelay: `${i * 40}ms`,
              }}
            >
              <p className="fn-txt-label text-[10px] font-black uppercase tracking-wide sm:text-[11px]">{t.label}</p>
              <p className="fn-txt-primary mt-1 text-sm font-black tabular-nums leading-tight sm:text-base">{t.value}</p>
              {t.hint ? <p className="fn-txt-muted mt-0.5 text-[10px] font-bold leading-snug sm:text-[11px]">{t.hint}</p> : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
