import { getEconomyMetrics, getEconomySeries } from "@/lib/economy/service";
import { economyMetricToCard, orderEconomyCards } from "@/lib/economy/map-to-cards";
import { fetchEconomicNews } from "@/lib/nepal-economy/news-feed";
import { readDashboardCache, writeDashboardCache } from "@/lib/nepal-economy/storage-cache";
import { getCachedNepseYonepseBundle } from "@/services/market/nepse-bundle-cache";
import type { NepseSecurityTick } from "@/types/market";
import type {
  NepalEconomyChartPoint,
  NepalEconomyDashboardData,
  NepalEconomyMover,
} from "@/types/nepal-economy";

const YONEPSE_SOURCE_URL = "https://shubhamnpk.github.io/yonepse/";

function formatNpr(value: number, fractionDigits = 2) {
  return `रु ${value.toLocaleString("en-US", {
    maximumFractionDigits: fractionDigits,
    minimumFractionDigits: fractionDigits,
  })}`;
}

function tickToMover(
  tick: NepseSecurityTick,
  tone: "up" | "down",
  updatedAt: string,
): NepalEconomyMover {
  return {
    name: tick.companyName ?? tick.symbol,
    symbol: tick.symbol,
    price: formatNpr(tick.ltpNpr, 2),
    change: `${tone === "up" ? "+" : ""}${(tick.changePct ?? 0).toLocaleString("en-US", {
      maximumFractionDigits: 2,
    })}%`,
    tone,
    source: "Yonepse public NEPSE mirror",
    updatedAt: tick.lastUpdated ?? updatedAt,
  };
}

/**
 * Nepal Economy dashboard builder.
 * Card values come from the Economic Data Engine (DB + verified sources).
 * Hard-coded economic figures are never used as current values.
 */
export async function buildNepalEconomyDashboard(): Promise<NepalEconomyDashboardData> {
  const fetchedAt = new Date().toISOString();
  const cached = await readDashboardCache();

  const [economyResult, nepseResult, newsResult] = await Promise.allSettled([
    getEconomyMetrics({ allowLiveFill: true }),
    getCachedNepseYonepseBundle(),
    fetchEconomicNews(),
  ]);

  const cards =
    economyResult.status === "fulfilled"
      ? orderEconomyCards(economyResult.value.metrics.map(economyMetricToCard))
      : [...(cached?.cards ?? [])];

  const engineSource =
    economyResult.status === "fulfilled" ? economyResult.value.source : ("empty" as const);

  let gdpChart: NepalEconomyChartPoint[] = cached?.charts.gdpGrowth ?? [];
  try {
    const gdpHistory = await getEconomySeries("gdp", 10);
    if (gdpHistory.length > 0) {
      gdpChart = [...gdpHistory]
        .reverse()
        .map((row) => ({
          label: row.period?.replace(/Calendar year\s+/i, "") ?? row.updatedAt.slice(0, 4),
          value: row.value,
        }))
        .filter((p) => Boolean(p.label));
    }
  } catch {
    /* keep cached chart */
  }

  if (economyResult.status === "fulfilled") {
    const gdpMetric = economyResult.value.metrics.find((m) => m.key === "gdp");
    const series = gdpMetric?.raw?.series;
    if (Array.isArray(series) && series.length > 0) {
      gdpChart = series
        .map((row) => {
          const r = row as { year?: string; value?: number };
          return {
            label: String(r.year ?? ""),
            value: typeof r.value === "number" ? r.value : 0,
          };
        })
        .filter((p) => Boolean(p.label));
    }
  }

  let fdChart: NepalEconomyChartPoint[] = [];
  if (economyResult.status === "fulfilled") {
    const fdMetric = economyResult.value.metrics.find((m) => m.key === "fd_rates");
    const policy = economyResult.value.metrics.find((m) => m.key === "policy_rate");
    const lending = fdMetric?.raw?.lendingRateCommercial;
    if (policy) fdChart.push({ label: "Policy", value: policy.value });
    if (fdMetric) fdChart.push({ label: "Deposit", value: fdMetric.value });
    if (typeof lending === "number" && Number.isFinite(lending)) {
      fdChart.push({ label: "Lending", value: lending });
    }
  }
  if (fdChart.length === 0 && cached?.charts.fdRates?.length) {
    const labels = cached.charts.fdRates.map((p) => p.label);
    if (labels.includes("Policy") || labels.includes("Deposit")) {
      fdChart = cached.charts.fdRates;
    }
  }

  let topGainers: NepalEconomyMover[] = cached?.topGainers ?? [];
  let topLosers: NepalEconomyMover[] = cached?.topLosers ?? [];

  if (nepseResult.status === "fulfilled") {
    const bundle = nepseResult.value;
    const ticks = Object.values(bundle.bySymbol).filter((tick) => typeof tick.changePct === "number");
    topGainers = [...ticks]
      .filter((tick) => (tick.changePct ?? 0) > 0)
      .sort((a, b) => (b.changePct ?? 0) - (a.changePct ?? 0))
      .slice(0, 5)
      .map((tick) => tickToMover(tick, "up", fetchedAt));
    topLosers = [...ticks]
      .filter((tick) => (tick.changePct ?? 0) < 0)
      .sort((a, b) => (a.changePct ?? 0) - (b.changePct ?? 0))
      .slice(0, 5)
      .map((tick) => tickToMover(tick, "down", fetchedAt));

    if (!cards.some((c) => c.id === "nepse") && bundle.index?.value != null) {
      cards.push({
        id: "nepse",
        label: "NEPSE Index",
        value: bundle.index.value.toLocaleString("en-US", { maximumFractionDigits: 2 }),
        detail: "Latest NEPSE index from public market mirror",
        change:
          bundle.index.changePct != null
            ? `${bundle.index.changePct >= 0 ? "+" : ""}${bundle.index.changePct.toLocaleString("en-US", {
                maximumFractionDigits: 2,
              })}%`
            : null,
        tone:
          bundle.index.changePct == null ? "neutral" : bundle.index.changePct >= 0 ? "up" : "down",
        source: "Yonepse public NEPSE mirror",
        sourceUrl: YONEPSE_SOURCE_URL,
        updatedAt: fetchedAt,
        dataMode: "live",
        period: "Latest NEPSE index",
        publishedAt: fetchedAt,
        stale: false,
        numericValue: bundle.index.value,
      });
    }
  } else if (!topGainers.length) {
    topGainers = [];
    topLosers = [];
  }

  const news =
    newsResult.status === "fulfilled" ? newsResult.value.items : (cached?.news ?? []);
  const liveCount = cards.filter((c) => c.dataMode === "live").length;
  const staleCount = cards.filter((c) => c.stale).length;

  const payload: NepalEconomyDashboardData = {
    fetchedAt,
    apiStatus:
      engineSource === "empty" || cards.length === 0
        ? "cached"
        : staleCount >= 4 || liveCount === 0
          ? "degraded"
          : "ok",
    networkStatus:
      economyResult.status === "fulfilled" && engineSource !== "empty"
        ? "reachable"
        : cached
          ? "partial"
          : "unreachable",
    cards: orderEconomyCards(cards),
    topGainers,
    topLosers,
    charts: {
      gdpGrowth: gdpChart,
      fdRates: fdChart,
    },
    news,
    newsMode:
      newsResult.status === "fulfilled" ? newsResult.value.mode : (cached?.newsMode ?? "cached"),
    engineSource: economyResult.status === "fulfilled" ? economyResult.value.source : "empty",
  };

  await writeDashboardCache(payload);
  return payload;
}
