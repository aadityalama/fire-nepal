import type { EconomyMetric, EconomyMetricKey } from "@/lib/economy/types";
import type {
  NepalEconomyCard,
  NepalEconomyCardId,
  NepalEconomyDataMode,
  NepalEconomyTone,
} from "@/types/nepal-economy";

const KEY_TO_CARD: Record<EconomyMetricKey, NepalEconomyCardId> = {
  inflation: "inflation",
  gdp: "gdp",
  policy_rate: "policyRate",
  fd_rates: "fdRates",
  usd_npr: "usdNpr",
  krw_npr: "krwNpr",
  gold: "gold",
  silver: "silver",
  remittance: "remittance",
  nepse: "nepse",
};

const CARD_LABELS: Record<NepalEconomyCardId, string> = {
  inflation: "Nepal Inflation Rate",
  gdp: "GDP Growth",
  policyRate: "NRB Policy Rate",
  fdRates: "Commercial Bank Deposit Rate",
  usdNpr: "USD/NPR Exchange Rate",
  krwNpr: "KRW/NPR Exchange Rate",
  gold: "Gold Price",
  silver: "Silver Price",
  remittance: "Remittance Statistics",
  nepse: "NEPSE Index",
};

function toDataMode(metric: EconomyMetric): NepalEconomyDataMode {
  if (metric.stale || metric.status === "stale" || metric.status === "cached") return "cached";
  if (metric.status === "live") return "live";
  return "official";
}

function toTone(metric: EconomyMetric): NepalEconomyTone {
  return metric.tone;
}

function detailFor(metric: EconomyMetric): string {
  if (metric.stale) {
    return metric.staleReason ?? "Last verified data — source temporarily unavailable";
  }
  if (metric.key === "gdp") {
    return metric.period ? `Annual GDP growth · ${metric.period}` : "Annual GDP growth (official series)";
  }
  if (metric.period) return metric.period;
  if (metric.changeLabel) return metric.changeLabel;
  return metric.unit;
}

export function economyMetricToCard(metric: EconomyMetric): NepalEconomyCard {
  const id = KEY_TO_CARD[metric.key];
  return {
    id,
    label: CARD_LABELS[id],
    value: metric.displayValue,
    detail: detailFor(metric),
    change: metric.changeLabel,
    tone: toTone(metric),
    source: metric.source,
    sourceUrl: metric.sourceUrl,
    updatedAt: metric.updatedAt,
    dataMode: toDataMode(metric),
    period: metric.period,
    publishedAt: metric.publishedAt,
    stale: metric.stale,
    staleReason: metric.staleReason,
    numericValue: metric.value,
  };
}

export function orderEconomyCards(cards: NepalEconomyCard[]): NepalEconomyCard[] {
  const order: NepalEconomyCardId[] = [
    "inflation",
    "gdp",
    "policyRate",
    "fdRates",
    "usdNpr",
    "krwNpr",
    "gold",
    "silver",
    "remittance",
    "nepse",
  ];
  return order
    .map((id) => cards.find((c) => c.id === id))
    .filter((c): c is NepalEconomyCard => Boolean(c));
}
