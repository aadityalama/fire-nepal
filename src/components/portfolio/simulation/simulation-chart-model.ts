import type { SimulationCrashSpikeConfig } from "@/components/portfolio/simulation/simulation-chart-plugins";
import type { WealthMilestoneMarker } from "@/components/portfolio/wealth-chart-plugins";
import type { WealthPathBundle, WealthSimulationParams } from "@/components/portfolio/simulation/wealth-simulation-engine";
import { buildNominalStressOverlay } from "@/components/portfolio/simulation/wealth-simulation-engine";

export type DownsampledSimulationChart = {
  labels: string[];
  /** Calendar age at each point (for tooltips). */
  ages: number[];
  yearFracs: number[];
  monthIndices: number[];
  nominal: number[];
  real: number[];
  passive: number[];
  contrib: number[];
  stress: (number | null)[];
  milestones: WealthMilestoneMarker[];
  /** Dataset index of primary nominal line (after glow underlay). */
  nominalDatasetIndex: number;
  /** For stress connector plugin */
  stressSpike: SimulationCrashSpikeConfig | null;
  resilienceScore: number;
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function collectPinMonths(
  bundle: WealthPathBundle,
  opts: {
    monthsToFi: number | null;
    monthlySpendNpr: number;
    corpusNpr: number;
  },
): Set<number> {
  const pins = new Set<number>();
  const len = bundle.path.length;
  if (len <= 0) return pins;
  pins.add(0);
  for (let y = 1; y * 12 < len; y++) pins.add(y * 12);
  if (opts.monthsToFi != null && opts.monthsToFi < len) pins.add(opts.monthsToFi);
  const spend = Math.max(0, opts.monthlySpendNpr);
  for (let i = 1; i < bundle.passiveMonthlyFlowNpr.length; i++) {
    if (bundle.passiveMonthlyFlowNpr[i]! >= spend) {
      pins.add(i);
      break;
    }
  }
  for (const t of [10_000_000, 25_000_000, 50_000_000, 100_000_000]) {
    const ix = bundle.path.findIndex((p) => p.nominalNpr >= t);
    if (ix >= 0) pins.add(ix);
  }
  const coastIdx = bundle.path.findIndex((p) => p.nominalNpr >= opts.corpusNpr * 0.72);
  if (coastIdx >= 0 && coastIdx !== opts.monthsToFi) pins.add(coastIdx);
  return pins;
}

function mergeUniformAndPins(len: number, maxPts: number, pins: Set<number>): number[] {
  const step = Math.max(1, Math.ceil(len / Math.max(32, maxPts)));
  const idx = new Set<number>();
  for (let i = 0; i < len; i += step) idx.add(i);
  for (const p of pins) {
    if (p >= 0 && p < len) idx.add(p);
  }
  idx.add(len - 1);
  return [...idx].sort((a, b) => a - b);
}

function mapFullIndexToChartIndex(sortedFullIndices: number[], fullIdx: number): number {
  let best = 0;
  let bestD = Infinity;
  for (let c = 0; c < sortedFullIndices.length; c++) {
    const d = Math.abs(sortedFullIndices[c]! - fullIdx);
    if (d < bestD) {
      bestD = d;
      best = c;
    }
  }
  return best;
}

function buildMilestones(
  sortedIndices: number[],
  bundle: WealthPathBundle,
  opts: {
    monthsToFi: number | null;
    monthlySpendNpr: number;
    corpusNpr: number;
  },
): WealthMilestoneMarker[] {
  const markers: WealthMilestoneMarker[] = [];
  const seen = new Set<string>();

  const add = (fullIdx: number, label: string, color: string) => {
    if (fullIdx < 0 || fullIdx >= bundle.path.length) return;
    const chartIdx = mapFullIndexToChartIndex(sortedIndices, fullIdx);
    const key = `${chartIdx}-${label}`;
    if (seen.has(key)) return;
    seen.add(key);
    markers.push({ index: chartIdx, label, color });
  };

  if (opts.monthsToFi != null) {
    add(opts.monthsToFi, "FIRE target", "rgba(250, 204, 21, 0.95)");
  }
  const coastIdx = bundle.path.findIndex((p) => p.nominalNpr >= opts.corpusNpr * 0.72);
  if (coastIdx >= 0 && coastIdx !== opts.monthsToFi) {
    add(coastIdx, "Coast buffer", "rgba(56, 189, 248, 0.9)");
  }
  const spend = opts.monthlySpendNpr;
  for (let i = 1; i < bundle.passiveMonthlyFlowNpr.length; i++) {
    if (bundle.passiveMonthlyFlowNpr[i]! >= spend) {
      add(i, "Passive ≥ spend", "rgba(167, 139, 252, 0.95)");
      break;
    }
  }
  for (const t of [10_000_000, 25_000_000, 50_000_000]) {
    const ix = bundle.path.findIndex((p) => p.nominalNpr >= t);
    if (ix >= 0) add(ix, `${t / 1_000_000}M NPR`, "rgba(52, 211, 153, 0.75)");
  }

  markers.sort((a, b) => a.index - b.index);
  const unique: WealthMilestoneMarker[] = [];
  const seenIdx = new Set<number>();
  for (const m of markers) {
    if (seenIdx.has(m.index)) continue;
    seenIdx.add(m.index);
    unique.push(m);
    if (unique.length >= 6) break;
  }
  return unique;
}

/**
 * Downsamples path + overlays for responsive Chart.js while preserving milestone months.
 */
export function buildDownsampledSimulationChart(
  bundle: WealthPathBundle,
  p: WealthSimulationParams,
  opts: {
    currentAge: number;
    monthsToFi: number | null;
    corpusNpr: number;
    monthlySpendNpr: number;
    maxPts: number;
    postShockNpr: number;
    shockMonthFullIndex: number;
    resilienceScore: number;
  },
): DownsampledSimulationChart {
  const len = bundle.path.length;
  const pins = collectPinMonths(bundle, {
    monthsToFi: opts.monthsToFi,
    monthlySpendNpr: opts.monthlySpendNpr,
    corpusNpr: opts.corpusNpr,
  });
  pins.add(clamp(opts.shockMonthFullIndex, 1, Math.max(1, len - 2)));
  const sorted = mergeUniformAndPins(len, opts.maxPts, pins);

  const nominal = sorted.map((i) => bundle.path[i]!.nominalNpr);
  const real = sorted.map((i) => bundle.path[i]!.realNpr);
  const passive = sorted.map((i) => bundle.passiveMonthlyFlowNpr[i] ?? 0);
  const contrib = sorted.map((i) => bundle.contribMonthlyNpr[i] ?? 0);
  const yearFracs = sorted.map((i) => bundle.path[i]!.yearFrac);
  const ages = sorted.map((i) => opts.currentAge + bundle.path[i]!.yearFrac);
  const labels = sorted.map((i) => {
    const yf = bundle.path[i]!.yearFrac;
    const y = Math.floor(yf);
    return yf - y < 0.08 ? `${y}y` : "";
  });

  const fullStress = buildNominalStressOverlay(len, p, opts.shockMonthFullIndex, opts.postShockNpr);
  const stress = sorted.map((i) => fullStress[i] ?? null);

  const shockChartLo = mapFullIndexToChartIndex(sorted, opts.shockMonthFullIndex - 1);
  const shockChartHi = mapFullIndexToChartIndex(sorted, opts.shockMonthFullIndex);
  const preY =
    opts.shockMonthFullIndex > 0 ? bundle.path[opts.shockMonthFullIndex - 1]!.nominalNpr : bundle.path[0]!.nominalNpr;
  const stressSpike =
    len > 4 && shockChartHi > 0
      ? {
          betweenLo: Math.min(shockChartLo, shockChartHi),
          betweenHi: Math.max(shockChartLo, shockChartHi),
          nominalPost: opts.postShockNpr,
          nominalPre: preY,
          datasetIndex: 1,
        }
      : null;

  const milestones = buildMilestones(sorted, bundle, {
    monthsToFi: opts.monthsToFi,
    monthlySpendNpr: opts.monthlySpendNpr,
    corpusNpr: opts.corpusNpr,
  });

  return {
    labels,
    ages,
    yearFracs,
    monthIndices: sorted,
    nominal,
    real,
    passive,
    contrib,
    stress,
    milestones,
    nominalDatasetIndex: 1,
    stressSpike,
    resilienceScore: opts.resilienceScore,
  };
}
