import { Chart, type Plugin } from "chart.js";

export type SimulationCrashSpikeConfig = {
  /** Lower chart index along x (downsampled). */
  betweenLo: number;
  betweenHi: number;
  nominalPre: number;
  nominalPost: number;
  datasetIndex: number;
};

/**
 * Draws a short vertical “cliff” between pre-shock and post-shock nominal at the shock bucket.
 */
export const simulationCrashConnectorPlugin: Plugin<"line"> = {
  id: "simulationCrashConnector",
  afterDatasetsDraw(chart) {
    const raw = (chart.options.plugins as Record<string, unknown> | undefined)?.simulationCrashConnector as
      | SimulationCrashSpikeConfig
      | undefined;
    if (!raw || raw.betweenLo < 0) return;
    const yScale = chart.scales.y;
    const meta = chart.getDatasetMeta(raw.datasetIndex);
    const pts = meta?.data;
    if (!pts?.length) return;
    const { top, bottom } = chart.chartArea;
    if (top == null || bottom == null) return;
    const i0 = clampIdx(raw.betweenLo, pts.length);
    const i1 = clampIdx(raw.betweenHi, pts.length);
    const el0 = pts[i0];
    const el1 = pts[i1];
    if (!el0 || typeof el0.x !== "number") return;
    const x = el1 && typeof el1.x === "number" ? (el0.x + el1.x) / 2 : el0.x;
    const yA = yScale.getPixelForValue(raw.nominalPre);
    const yB = yScale.getPixelForValue(raw.nominalPost);
    if (![yA, yB].every(Number.isFinite)) return;
    const ctx = chart.ctx;
    ctx.save();
    ctx.beginPath();
    ctx.strokeStyle = "rgba(251, 113, 133, 0.75)";
    ctx.lineWidth = 2;
    ctx.shadowColor = "rgba(251, 113, 133, 0.45)";
    ctx.shadowBlur = 10;
    ctx.moveTo(x, yA);
    ctx.lineTo(x, yB);
    ctx.stroke();
    ctx.restore();
  },
};

export const simulationResilienceBadgePlugin: Plugin<"line"> = {
  id: "simulationResilienceBadge",
  afterDraw(chart) {
    const raw = (chart.options.plugins as Record<string, unknown> | undefined)?.simulationResilienceBadge as
      | { score?: number; label?: string }
      | undefined;
    const score = raw?.score;
    if (score == null || !Number.isFinite(score)) return;
    const { left, top, right } = chart.chartArea;
    if (left == null || top == null || right == null) return;
    const ctx = chart.ctx;
    const text = raw?.label ?? "Resilience";
    const pill = `${text} ${Math.round(score)}`;
    ctx.save();
    ctx.font = "700 11px Inter, system-ui, sans-serif";
    const w = ctx.measureText(pill).width + 18;
    const h = 24;
    const x = right - w - 8;
    const y = top + 8;
    ctx.fillStyle = "rgba(2, 22, 18, 0.78)";
    ctx.strokeStyle = "rgba(52, 211, 153, 0.35)";
    ctx.lineWidth = 1;
    ctx.fillRect(x, y, w, h);
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    ctx.fillStyle = "rgba(236, 253, 245, 0.92)";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(pill, x + 10, y + h / 2);
    ctx.restore();
  },
};

let simPluginsRegistered = false;

export function registerSimulationChartPlugins() {
  if (simPluginsRegistered) return;
  Chart.register(simulationCrashConnectorPlugin, simulationResilienceBadgePlugin);
  simPluginsRegistered = true;
}

function clampIdx(i: number, len: number): number {
  return Math.max(0, Math.min(len - 1, Math.floor(i)));
}
