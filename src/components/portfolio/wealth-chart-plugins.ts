import { Chart, type Plugin } from "chart.js";

export type WealthHorizontalLine = {
  y: number;
  label: string;
  color: string;
  dash?: number[];
};

export type WealthMilestoneMarker = {
  index: number;
  label: string;
  color: string;
};

export type WealthProjectionMarker = {
  index: number;
  label: string;
};

/**
 * Dashed horizontal reference lines (FIRE multiples, targets) after datasets.
 */
export const wealthHorizontalLinesPlugin: Plugin<"line"> = {
  id: "wealthHorizontalLines",
  afterDatasetsDraw(chart) {
    const raw = chart.options.plugins &&
      (chart.options.plugins as Record<string, unknown>).wealthHorizontalLines;
    const cfg = raw as { lines?: WealthHorizontalLine[] } | undefined;
    const lines = cfg?.lines;
    if (!lines?.length) return;
    const yScale = chart.scales.y;
    const { top, bottom, left, right } = chart.chartArea;
    if (top == null || bottom == null || left == null || right == null) return;
    const ctx = chart.ctx;
    for (const ln of lines) {
      const yPx = yScale.getPixelForValue(ln.y);
      if (!Number.isFinite(yPx) || yPx < top - 2 || yPx > bottom + 2) continue;
      ctx.save();
      ctx.beginPath();
      ctx.setLineDash(ln.dash ?? [6, 5]);
      ctx.strokeStyle = ln.color;
      ctx.lineWidth = 1.25;
      ctx.moveTo(left, yPx);
      ctx.lineTo(right, yPx);
      ctx.stroke();
      ctx.restore();
    }
  },
};

/**
 * Vertical milestone guides where net worth first crosses FI levels.
 */
export const wealthMilestoneMarkersPlugin: Plugin<"line"> = {
  id: "wealthMilestoneMarkers",
  afterDatasetsDraw(chart) {
    const raw = (chart.options.plugins as Record<string, unknown> | undefined)?.wealthMilestoneMarkers as
      | { markers?: WealthMilestoneMarker[]; datasetIndex?: number }
      | undefined;
    const markers = raw?.markers;
    if (!markers?.length) return;
    const dsIndex =
      typeof raw?.datasetIndex === "number"
        ? raw.datasetIndex
        : Math.max(0, chart.data.datasets.length - 1);
    const meta = chart.getDatasetMeta(dsIndex);
    const pts = meta?.data;
    if (!pts?.length) return;
    const { top, bottom } = chart.chartArea;
    if (top == null || bottom == null) return;
    const ctx = chart.ctx;
    for (const m of markers) {
      const el = pts[m.index];
      if (!el || typeof el.x !== "number" || typeof el.y !== "number") continue;
      const x = el.x;
      ctx.save();
      ctx.beginPath();
      ctx.setLineDash([3, 4]);
      ctx.strokeStyle = m.color;
      ctx.globalAlpha = 0.55;
      ctx.lineWidth = 1;
      ctx.moveTo(x, top + 2);
      ctx.lineTo(x, bottom - 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 0.9;
      ctx.font = "600 12px Inter, system-ui, sans-serif";
      ctx.fillStyle = m.color;
      ctx.textAlign = "center";
      ctx.textBaseline = "alphabetic";
      const label = m.label.length > 14 ? `${m.label.slice(0, 12)}…` : m.label;
      ctx.fillText(label, x, top + 14);
      ctx.restore();
    }
  },
};

/**
 * Diamond markers on projection curves (today / horizon / target years).
 */
export const wealthProjectionDiamondsPlugin: Plugin<"line"> = {
  id: "wealthProjectionDiamonds",
  afterDatasetsDraw(chart) {
    const raw = (chart.options.plugins as Record<string, unknown> | undefined)?.wealthProjectionMarkers as
      | { markers?: WealthProjectionMarker[]; datasetIndex?: number }
      | undefined;
    const markers = raw?.markers;
    if (!markers?.length) return;
    const dsIndex = raw?.datasetIndex ?? 0;
    const meta = chart.getDatasetMeta(dsIndex);
    const pts = meta?.data;
    if (!pts?.length) return;
    const ctx = chart.ctx;
    for (const m of markers) {
      const el = pts[m.index];
      if (!el || typeof el.x !== "number" || typeof el.y !== "number") continue;
      const { x, y } = el;
      const s = 5;
      ctx.save();
      ctx.fillStyle = "rgba(52, 211, 153, 0.95)";
      ctx.strokeStyle = "rgba(250, 250, 250, 0.35)";
      ctx.lineWidth = 1.25;
      ctx.beginPath();
      ctx.moveTo(x, y - s);
      ctx.lineTo(x + s, y);
      ctx.lineTo(x, y + s);
      ctx.lineTo(x - s, y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.font = "700 10px Inter, system-ui, sans-serif";
      ctx.fillStyle = "rgba(209, 250, 229, 0.9)";
      ctx.textAlign = "center";
      ctx.fillText(m.label, x, y + 15);
      ctx.restore();
    }
  },
};

let registered = false;

export function registerWealthChartPlugins() {
  if (registered) return;
  Chart.register(wealthHorizontalLinesPlugin, wealthMilestoneMarkersPlugin, wealthProjectionDiamondsPlugin);
  registered = true;
}
