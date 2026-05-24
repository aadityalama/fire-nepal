"use client";

import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
  type ChartData,
  type ChartOptions,
  type ScriptableContext,
} from "chart.js";
import { memo, useEffect, useId, useMemo, useRef, useState } from "react";
import { Line } from "react-chartjs-2";
import { registerWealthChartPlugins } from "@/components/portfolio/wealth-chart-plugins";
import { buildDownsampledSimulationChart } from "@/components/portfolio/simulation/simulation-chart-model";
import { registerSimulationChartPlugins } from "@/components/portfolio/simulation/simulation-chart-plugins";
import type { MarketCrashResult, WealthPathBundle, WealthSimulationParams } from "@/components/portfolio/simulation/wealth-simulation-engine";
import {
  emeraldAreaFill,
  neonUnderlayLineDataset,
  premiumAnim,
  premiumTooltip,
  wealthChartFonts,
} from "@/components/portfolio/wealth-premium-charts";

ChartJS.register(CategoryScale, Legend, LinearScale, LineElement, PointElement, Tooltip, Filler);
registerWealthChartPlugins();
registerSimulationChartPlugins();

function flowFmt(n: number): string {
  if (!Number.isFinite(n)) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `${Math.round(n / 1000)}k`;
  return `${Math.round(n)}`;
}

type SimulationProjectionChartProps = {
  pathBundle: WealthPathBundle;
  params: WealthSimulationParams;
  corpusNpr: number;
  monthsToFi: number | null;
  currentAge: number;
  displayFn: (npr: number) => string;
  reducedMotion: boolean;
  crash: MarketCrashResult;
  /** Smaller viewports: lighter sampling, bottom legend, extra chart padding. */
  narrow?: boolean;
};

function SimulationProjectionChartInner({
  pathBundle,
  params,
  corpusNpr,
  monthsToFi,
  currentAge,
  displayFn,
  reducedMotion,
  crash,
  narrow = false,
}: SimulationProjectionChartProps) {
  const uid = useId();
  const rafRef = useRef<number | null>(null);
  const [size, setSize] = useState({ h: 240 });

  const shockMonthFull = useMemo(() => {
    const len = pathBundle.path.length;
    return Math.min(42, Math.max(12, Math.floor(len / 7)));
  }, [pathBundle.path.length]);

  const chartModel = useMemo(
    () =>
      buildDownsampledSimulationChart(pathBundle, params, {
        currentAge,
        monthsToFi,
        corpusNpr,
        monthlySpendNpr: params.monthlySpendNpr,
        maxPts: narrow ? 88 : 130,
        postShockNpr: crash.postShockNetWorthNpr,
        shockMonthFullIndex: shockMonthFull,
        resilienceScore: crash.resilienceScore,
      }),
    [pathBundle, params, currentAge, monthsToFi, corpusNpr, narrow, crash.postShockNetWorthNpr, crash.resilienceScore, shockMonthFull],
  );

  useEffect(() => {
    const el = typeof document !== "undefined" ? document.getElementById(`sim-chart-${uid}`) : null;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const cr = entries[0]?.contentRect;
      if (!cr) return;
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        setSize({ h: Math.min(360, Math.max(220, cr.width * 0.42)) });
      });
    });
    ro.observe(el);
    return () => {
      ro.disconnect();
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [uid]);

  const data = useMemo((): ChartData<"line"> => {
    const d = chartModel;
    const nominalFill = (ctx: ScriptableContext<"line">) => emeraldAreaFill(ctx);
    const labels = d.labels.map((lb, i) => (lb || `${Math.round(d.yearFracs[i] ?? 0)}y`));

    return {
      labels,
      datasets: [
        neonUnderlayLineDataset(d.nominal, 0.36, "rgba(52, 211, 153, 0.22)", 9),
        {
          label: "Nominal wealth",
          data: d.nominal,
          yAxisID: "y",
          borderColor: "rgba(52, 211, 153, 0.98)",
          backgroundColor: nominalFill,
          borderWidth: 2.25,
          tension: 0.38,
          fill: true,
          pointRadius: 0,
          pointHoverRadius: 5,
          pointHoverBorderWidth: 2,
          pointHoverBackgroundColor: "rgba(52, 211, 153, 0.95)",
        },
        {
          label: "Real (today’s NPR)",
          data: d.real,
          yAxisID: "y",
          borderColor: "rgba(167, 139, 252, 0.9)",
          backgroundColor: "transparent",
          borderWidth: 1.75,
          borderDash: [6, 4],
          tension: 0.38,
          fill: false,
          pointRadius: 0,
          pointHoverRadius: 4,
        },
        {
          label: "Stress recovery (model)",
          data: d.stress,
          yAxisID: "y",
          borderColor: "rgba(251, 113, 133, 0.85)",
          backgroundColor: "rgba(251, 113, 133, 0.06)",
          borderWidth: 1.75,
          borderDash: [2, 3],
          tension: 0.32,
          fill: false,
          spanGaps: true,
          pointRadius: 0,
          pointHoverRadius: 3,
        },
        {
          label: "Passive income / mo",
          data: d.passive,
          yAxisID: "y1",
          borderColor: "rgba(56, 189, 248, 0.75)",
          backgroundColor: "transparent",
          borderWidth: 1.25,
          tension: 0.35,
          fill: false,
          pointRadius: 0,
          pointHoverRadius: 3,
        },
        {
          label: "Contribution / mo",
          data: d.contrib,
          yAxisID: "y1",
          borderColor: "rgba(250, 204, 21, 0.65)",
          backgroundColor: "transparent",
          borderWidth: 1.25,
          tension: 0.35,
          fill: false,
          pointRadius: 0,
          pointHoverRadius: 3,
        },
      ],
    };
  }, [chartModel]);

  const options = useMemo(() => {
    const d = chartModel;
    const o: ChartOptions<"line"> = {
      responsive: true,
      maintainAspectRatio: false,
      animation: premiumAnim(reducedMotion),
      layout: {
        padding: narrow
          ? { top: 4, right: 2, bottom: 52, left: 0 }
          : { top: 6, right: 4, bottom: 10, left: 0 },
      },
      interaction: { mode: "index", intersect: false },
      hover: { mode: "index", intersect: false },
      plugins: {
        legend: {
          position: narrow ? "bottom" : "top",
          align: "start",
          labels: {
            color: wealthChartFonts.legendSm.color,
            font: narrow ? { ...wealthChartFonts.legendSm, size: 10 } : wealthChartFonts.legendSm,
            boxWidth: narrow ? 8 : 10,
            padding: narrow ? 8 : 10,
            filter: (item) => item.datasetIndex !== 0,
          },
        },
        tooltip: {
          ...premiumTooltip,
          bodySpacing: 6,
          titleMarginBottom: 6,
          filter: (item) => item.datasetIndex !== 0,
          callbacks: {
            title: (items) => {
              const i = items[0]?.dataIndex ?? 0;
              const yf = d.yearFracs[i] ?? 0;
              const age = d.ages[i] ?? currentAge;
              return `Year ${yf.toFixed(1)} · Age ${age.toFixed(1)}`;
            },
            afterTitle: (items) => {
              const i = items[0]?.dataIndex ?? 0;
              const mi = d.monthIndices[i];
              return mi != null ? `Month ${mi} · snapshot` : "";
            },
            label: (ctx) => {
              const v = ctx.parsed.y;
              if (v == null) return "";
              if (ctx.dataset.yAxisID === "y1") {
                return `${ctx.dataset.label ?? ""}: ${flowFmt(Number(v))} NPR/mo`;
              }
              if (ctx.dataset.label?.includes("Stress")) {
                return `${ctx.dataset.label ?? ""}: ${displayFn(Number(v))}`;
              }
              return `${ctx.dataset.label ?? ""}: ${displayFn(Number(v))}`;
            },
          },
        },
      },
      scales: {
        x: {
          ticks: {
            maxRotation: 0,
            autoSkip: true,
            maxTicksLimit: narrow ? 6 : 10,
            color: wealthChartFonts.tickSm.color,
            font: narrow ? { ...wealthChartFonts.tickSm, size: 10 } : wealthChartFonts.tickSm,
          },
          grid: { color: "rgba(255,255,255,0.04)" },
        },
        y: {
          position: "left",
          ticks: {
            color: wealthChartFonts.tickSm.color,
            font: wealthChartFonts.tickSm,
            callback: (v) => displayFn(Number(v)),
          },
          grid: { color: "rgba(255,255,255,0.07)" },
        },
        y1: {
          position: "right",
          grid: { drawOnChartArea: false },
          ticks: {
            color: "rgba(161, 161, 170, 0.95)",
            font: { ...wealthChartFonts.tickSm, size: 10 },
            callback: (v) => flowFmt(Number(v)),
          },
        },
      },
    };

    const px = o.plugins as Record<string, unknown>;
    px.wealthMilestoneMarkers = {
      markers: d.milestones,
      datasetIndex: d.nominalDatasetIndex,
    };
    px.wealthHorizontalLines = {
      lines: [
        ...(corpusNpr > 0
          ? [
              { y: corpusNpr, label: "FIRE corpus", color: "rgba(250, 204, 21, 0.55)", dash: [5, 5] },
              {
                y: corpusNpr * 0.72,
                label: "Coast buffer (72%)",
                color: "rgba(56, 189, 248, 0.35)",
                dash: [3, 6],
              },
            ]
          : []),
      ],
    };
    px.simulationResilienceBadge = {
      score: d.resilienceScore,
      label: "Resilience",
    };
    if (d.stressSpike) {
      px.simulationCrashConnector = d.stressSpike;
    }

    return o;
  }, [chartModel, corpusNpr, displayFn, reducedMotion, currentAge, narrow]);

  return (
    <div
      id={`sim-chart-${uid}`}
      className="relative w-full min-w-0 max-w-full overflow-hidden rounded-2xl border border-emerald-400/12 bg-[#020c0a]/55 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
      style={{ height: size.h }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-90"
        style={{
          background:
            "radial-gradient(ellipse 80% 55% at 50% -10%, rgba(52, 211, 153, 0.12), transparent 55%), radial-gradient(ellipse 60% 40% at 100% 100%, rgba(167, 139, 252, 0.08), transparent 50%)",
        }}
        aria-hidden
      />
      <div className="relative h-full w-full min-h-[220px] min-w-0 px-1 pb-1 pt-2 sm:px-2 sm:pt-3">
        <Line data={data} options={options} />
      </div>
      <p
        className={`pointer-events-none absolute text-[9px] font-bold uppercase tracking-wider text-zinc-500/90 sm:left-4 ${
          narrow ? "bottom-14 left-3" : "bottom-2 left-3"
        }`}
      >
        Momentum view · illustrative stress path
      </p>
    </div>
  );
}

export const SimulationProjectionChart = memo(SimulationProjectionChartInner);
SimulationProjectionChart.displayName = "SimulationProjectionChart";
