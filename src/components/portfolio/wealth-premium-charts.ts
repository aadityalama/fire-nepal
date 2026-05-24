import type { Chart, ChartData, ScriptableContext } from "chart.js";

/** Shared typography for fintech-style dark charts */
export const wealthChartFonts = {
  tick: { family: "Inter, system-ui, sans-serif", weight: 600 as const, size: 12, color: "#e4e4e7" },
  tickSm: { family: "Inter, system-ui, sans-serif", weight: 600 as const, size: 11, color: "#e4e4e7" },
  legend: { family: "Inter, system-ui, sans-serif", weight: 700 as const, size: 12, color: "#f4f4f5" },
  legendSm: { family: "Inter, system-ui, sans-serif", weight: 700 as const, size: 11, color: "#f4f4f5" },
  tooltipTitle: { family: "Inter, system-ui, sans-serif", weight: 700 as const, size: 13, color: "#fafafa" },
  tooltipBody: { family: "Inter, system-ui, sans-serif", weight: 600 as const, size: 12, color: "#e4e4e7" },
};

export const premiumTooltip = {
  backgroundColor: "rgba(2, 22, 18, 0.96)",
  titleColor: "#ecfdf5",
  bodyColor: "#d1fae5",
  borderColor: "rgba(52, 211, 153, 0.5)",
  borderWidth: 1,
  padding: 14,
  cornerRadius: 14,
  displayColors: true,
  titleFont: wealthChartFonts.tooltipTitle,
  bodyFont: wealthChartFonts.tooltipBody,
  caretSize: 6,
  caretPadding: 10,
};

export const premiumAnim = (reducedMotion: boolean) =>
  reducedMotion
    ? { duration: 0 }
    : { duration: 640, easing: "easeOutQuart" as const };

/** Indices where series first crosses each threshold (for vertical milestone guides). */
export function milestoneCrossings(
  values: number[],
  thresholds: { y: number; label: string; color: string }[],
): { index: number; label: string; color: string }[] {
  const out: { index: number; label: string; color: string }[] = [];
  for (const t of thresholds) {
    if (!Number.isFinite(t.y) || t.y <= 0) continue;
    for (let i = 0; i < values.length; i++) {
      const v = values[i] ?? 0;
      const prev = i > 0 ? values[i - 1] ?? 0 : -Infinity;
      if (v >= t.y && prev < t.y) {
        out.push({ index: i, label: t.label, color: t.color });
        break;
      }
    }
  }
  return out;
}

export function emeraldAreaFill(context: ScriptableContext<"line">): CanvasGradient | string {
  const { ctx, chartArea } = context.chart;
  if (!chartArea) return "rgba(52, 211, 153, 0.12)";
  const g = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
  g.addColorStop(0, "rgba(6, 78, 59, 0.02)");
  g.addColorStop(0.4, "rgba(52, 211, 153, 0.1)");
  g.addColorStop(0.85, "rgba(52, 211, 153, 0.32)");
  g.addColorStop(1, "rgba(167, 139, 250, 0.12)");
  return g;
}

export function passivePurpleEmeraldFill(context: ScriptableContext<"line">): CanvasGradient | string {
  const { ctx, chartArea } = context.chart;
  if (!chartArea) return "rgba(167, 139, 250, 0.12)";
  const g = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
  g.addColorStop(0, "rgba(52, 211, 153, 0.06)");
  g.addColorStop(0.45, "rgba(139, 92, 246, 0.14)");
  g.addColorStop(1, "rgba(192, 132, 252, 0.22)");
  return g;
}

/** Outer “neon” stroke dataset — same points, drawn first (order: -1). */
export function neonUnderlayLineDataset(
  data: number[],
  tension: number,
  rgbaGlow: string,
  width = 7,
): ChartData<"line">["datasets"][0] {
  return {
    label: "",
    data,
    order: -1,
    tension,
    fill: false,
    pointRadius: 0,
    pointHoverRadius: 0,
    borderWidth: width,
    borderColor: rgbaGlow,
    borderCapStyle: "round",
    borderJoinStyle: "round",
    spanGaps: true,
  };
}

export function allocationLegendGenerateLabels(
  chart: Chart<"doughnut">,
  formatNpr: (n: number) => string,
  opts?: { legendStrokeStyle?: string },
) {
  const ds = chart.data.datasets[0];
  const data = (ds?.data as number[]) ?? [];
  const labels = (chart.data.labels as string[]) ?? [];
  const total = data.reduce((a, b) => a + b, 0) || 1;
  const strokeStyle = opts?.legendStrokeStyle ?? "rgba(255,255,255,0.14)";
  return data.map((v, i) => {
    const pct = ((v / total) * 100).toFixed(1);
    const bg = Array.isArray(ds?.backgroundColor) ? ds.backgroundColor[i] : ds?.backgroundColor;
    return {
      text: `${labels[i] ?? "—"} · ${pct}% · ${formatNpr(v)}`,
      fillStyle: (typeof bg === "string" ? bg : undefined) ?? "rgba(52,211,153,0.5)",
      strokeStyle,
      lineWidth: 1,
      hidden: false,
      index: i,
      datasetIndex: 0,
    };
  });
}
