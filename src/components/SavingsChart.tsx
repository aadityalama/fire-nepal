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
  type Plugin,
  type TooltipItem,
} from "chart.js";
import { useMemo } from "react";
import { Line } from "react-chartjs-2";
import { useFireCalculator } from "@/components/FireCalculatorContext";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
);

const CHART_ANIMATION_MS = 520;

type Marker = { age: number; color: string; dash?: number[] };

const wealthVerticalMarkersPlugin: Plugin<"line"> = {
  id: "fireWealthVerticalMarkers",
  afterDraw(chart) {
    const plugins = chart.options.plugins as Record<string, unknown> | undefined;
    const raw = plugins?.fireWealthVerticalMarkers as { verticals?: Marker[] } | undefined;
    const verticals = raw?.verticals;
    if (!verticals?.length) return;
    const xScale = chart.scales.x;
    const { top, bottom, left, right } = chart.chartArea;
    if (top === undefined || bottom === undefined) return;
    const ctx = chart.ctx;
    for (const v of verticals) {
      const px = xScale.getPixelForValue(v.age);
      if (px < left || px > right) continue;
      ctx.save();
      ctx.beginPath();
      ctx.setLineDash(v.dash ?? [5, 5]);
      ctx.strokeStyle = v.color;
      ctx.lineWidth = 1.5;
      ctx.moveTo(px, top);
      ctx.lineTo(px, bottom);
      ctx.stroke();
      ctx.restore();
    }
  },
};

let fireWealthMarkersPluginRegistered = false;
if (!fireWealthMarkersPluginRegistered) {
  ChartJS.register(wealthVerticalMarkersPlugin);
  fireWealthMarkersPluginRegistered = true;
}

export function SavingsChart() {
  const { wealthResult, result, currency, fromNprToKrw, formatMoney } = useFireCalculator();

  const { chartData, options } = useMemo(() => {
    let yearly = wealthResult.yearly.map((p) => ({ ...p }));
    if (yearly.length === 0) {
      yearly = [
        {
          age: result.fireAge,
          calendarYear: new Date().getFullYear(),
          balanceActualNpr: 0,
          balanceGrowthTrackNpr: 0,
          phase: "accumulate" as const,
        },
      ];
    }
    if (yearly.length === 1) {
      const y0 = yearly[0]!;
      yearly.push({
        ...y0,
        age: y0.age + 1,
        calendarYear: y0.calendarYear + 1,
      });
    }

    const toUnit = (npr: number) => (currency === "NPR" ? npr / 1_000_000 : fromNprToKrw(npr) / 1_000_000);
    const minAge = yearly[0]!.age;
    const maxAge = yearly[yearly.length - 1]!.age;
    const targetY = toUnit(result.requiredCorpusNpr);

    const growthData = yearly.map((p) => ({ x: p.age, y: toUnit(p.balanceGrowthTrackNpr) }));
    const actualData = yearly.map((p) => ({ x: p.age, y: toUnit(p.balanceActualNpr) }));

    const verticals: Marker[] = [
      { age: wealthResult.fireAgeYears, color: "rgba(15, 118, 110, 0.85)", dash: [4, 4] },
      { age: wealthResult.peakWealthAge, color: "rgba(202, 138, 4, 0.9)", dash: [2, 4] },
    ];
    if (wealthResult.depletionAge !== null) {
      verticals.push({ age: wealthResult.depletionAge, color: "rgba(220, 38, 38, 0.9)", dash: [6, 3] });
    }

    const data: ChartData<"line"> = {
      labels: [],
      datasets: [
        {
          label: currency === "NPR" ? "Growth path (invested, no drawdown)" : "Growth path (KRW, no drawdown)",
          data: growthData,
          borderColor: "#15803d",
          backgroundColor: "rgba(21, 128, 61, 0.08)",
          fill: true,
          tension: 0.38,
          pointRadius: 2,
          pointHoverRadius: 6,
          pointBackgroundColor: "#15803d",
          pointBorderColor: "#ffffff",
          pointBorderWidth: 2,
          parsing: { xAxisKey: "x", yAxisKey: "y" },
        },
        {
          label: currency === "NPR" ? "Wealth remaining (actual)" : "Wealth remaining (actual, KRW)",
          data: actualData,
          borderColor: "#008a4c",
          backgroundColor: "rgba(0, 138, 76, 0.06)",
          fill: true,
          tension: 0.38,
          pointRadius: 2,
          pointHoverRadius: 6,
          pointBackgroundColor: "#008a4c",
          pointBorderColor: "#ffffff",
          pointBorderWidth: 2,
          parsing: { xAxisKey: "x", yAxisKey: "y" },
          segment: {
            borderColor: (ctx) => {
              const y0 = ctx.p0.parsed.y;
              const y1 = ctx.p1.parsed.y;
              if (typeof y0 !== "number" || typeof y1 !== "number") return "#008a4c";
              return y1 < y0 - 1e-9 ? "rgba(234, 88, 12, 0.95)" : "#008a4c";
            },
            borderWidth: (ctx) => {
              const y0 = ctx.p0.parsed.y;
              const y1 = ctx.p1.parsed.y;
              if (typeof y0 !== "number" || typeof y1 !== "number") return 2;
              return y1 < y0 - 1e-9 ? 3 : 2;
            },
          },
        },
        {
          label: "FIRE corpus target (25× spend)",
          data: [
            { x: minAge, y: targetY },
            { x: maxAge, y: targetY },
          ],
          borderColor: "rgba(15, 118, 110, 0.45)",
          backgroundColor: "transparent",
          fill: false,
          tension: 0,
          borderDash: [6, 6],
          pointRadius: 0,
          pointHoverRadius: 0,
          parsing: { xAxisKey: "x", yAxisKey: "y" },
        },
      ],
    };

    const chartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      animation: {
        duration: CHART_ANIMATION_MS,
        easing: "easeOutCubic",
      },
      transitions: {
        active: { animation: { duration: CHART_ANIMATION_MS } },
      },
      plugins: {
        fireWealthVerticalMarkers: { verticals },
        legend: {
          align: "start",
          labels: {
            boxWidth: 9,
            boxHeight: 9,
            color: "#315247",
            font: { size: 10, weight: 600 },
            usePointStyle: true,
          },
        },
        tooltip: {
          backgroundColor: "rgba(0, 63, 47, 0.92)",
          padding: 14,
          cornerRadius: 14,
          borderColor: "rgba(255,255,255,0.18)",
          borderWidth: 1,
          titleColor: "#ffffff",
          bodyColor: "#dcfce7",
          callbacks: {
            title: (items: TooltipItem<"line">[]) => {
              const x = items[0]?.parsed.x;
              if (typeof x === "number") return `Age ${x.toFixed(1)}`;
              const idx = items[0]?.dataIndex ?? 0;
              const row = yearly[idx];
              if (!row) return "";
              return `Age ${row.age.toFixed(1)} · ${row.calendarYear}`;
            },
            label: (context: TooltipItem<"line">) => {
              const idx = context.dataIndex;
              const row = yearly[idx];
              if (!row) return ` ${context.dataset.label ?? ""}`;
              if (context.datasetIndex === 2) {
                return ` ${context.dataset.label}: ${formatMoney(result.requiredCorpusNpr)}`;
              }
              if (context.datasetIndex === 0) {
                return ` ${context.dataset.label}: ${formatMoney(row.balanceGrowthTrackNpr)}`;
              }
              return ` ${context.dataset.label}: ${formatMoney(row.balanceActualNpr)}`;
            },
          },
        },
      },
      scales: {
        x: {
          type: "linear",
          title: { display: true, text: "Age", color: "#315247", font: { size: 11, weight: 700 } },
          grid: { color: "rgba(0, 63, 47, 0.04)" },
          ticks: { color: "#64766f", font: { size: 10, weight: 600 } },
        },
        y: {
          border: { display: false },
          grid: { color: "rgba(0, 63, 47, 0.06)" },
          ticks: {
            color: "#64766f",
            callback: (value) => `${Number(value).toLocaleString()}M`,
            font: { size: 10, weight: 600 },
          },
        },
      },
    } as ChartOptions<"line">;

    return { chartData: data, options: chartOptions };
  }, [currency, formatMoney, fromNprToKrw, result.requiredCorpusNpr, wealthResult]);

  return <Line data={chartData} options={options} />;
}
