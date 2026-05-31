import { fetchJson } from "@/lib/api/fetch-json";
import { fetchEconomicNews } from "@/lib/nepal-economy/news-feed";
import {
  OFFICIAL_FD_RATES,
  OFFICIAL_INFLATION,
  OFFICIAL_NEWS,
  OFFICIAL_NEPSE_MOVERS,
  OFFICIAL_POLICY_RATE,
  OFFICIAL_REMITTANCE,
  type OfficialMetric,
} from "@/lib/nepal-economy/official-baseline";
import { readDashboardCache, writeDashboardCache } from "@/lib/nepal-economy/storage-cache";
import { getCachedNepseYonepseBundle } from "@/services/market/nepse-bundle-cache";
import type { NepseSecurityTick } from "@/types/market";
import type {
  NepalEconomyCard,
  NepalEconomyCardId,
  NepalEconomyChartPoint,
  NepalEconomyDashboardData,
  NepalEconomyMover,
  NepalEconomyTone,
} from "@/types/nepal-economy";

const NRB_FOREX_URL = "https://www.nrb.org.np/api/forex/v1/rates";
const WORLD_BANK_GDP_URL = "https://api.worldbank.org/v2/country/NPL/indicator/NY.GDP.MKTP.KD.ZG?format=json&per_page=80";
const FENEGOSIDA_URL = "https://www.fenegosida.org/";
const YONEPSE_SOURCE_URL = "https://shubhamnpk.github.io/yonepse/";

type DataMode = "live" | "cached" | "official";

type ResolvedMetric = {
  value: string;
  detail: string;
  change: string | null;
  tone: NepalEconomyTone;
  source: string;
  sourceUrl: string;
  updatedAt: string;
  dataMode: DataMode;
};

type NrbForexRate = {
  currency?: { iso3?: string; ISO3?: string; unit?: number | string };
  buy?: string | number;
  sell?: string | number;
};

type NrbForexResponse = {
  data?: { payload?: Array<{ date?: string; published_on?: string; rates?: NrbForexRate[] }> };
};

type WorldBankRow = { date?: string; value?: number | null };

function formatPercent(value: number) {
  return `${value.toLocaleString("en-US", { maximumFractionDigits: 2 })}%`;
}

function formatNpr(value: number, fractionDigits = 2) {
  return `रु ${value.toLocaleString("en-US", {
    maximumFractionDigits: fractionDigits,
    minimumFractionDigits: fractionDigits,
  })}`;
}

function parseNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;
  const numeric = Number(value.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(numeric) ? numeric : null;
}

function recentDateRange() {
  const to = new Date();
  const from = new Date(to);
  from.setDate(to.getDate() - 10);
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

function nrbForexEndpoint() {
  const { from, to } = recentDateRange();
  return `${NRB_FOREX_URL}?page=1&per_page=10&from=${from}&to=${to}`;
}

function fromOfficial(metric: OfficialMetric, dataMode: DataMode = "official"): ResolvedMetric {
  return {
    value: metric.displayValue,
    detail: metric.detail,
    change: metric.change ?? null,
    tone: metric.tone,
    source: metric.source,
    sourceUrl: metric.sourceUrl,
    updatedAt: metric.updatedAt,
    dataMode,
  };
}

function fromCachedCard(card: NepalEconomyCard): ResolvedMetric {
  return {
    value: card.value,
    detail: card.detail,
    change: card.change,
    tone: card.tone,
    source: card.source,
    sourceUrl: card.sourceUrl,
    updatedAt: card.updatedAt ?? new Date().toISOString(),
    dataMode: card.dataMode ?? "cached",
  };
}

function resolveMetric(
  id: NepalEconomyCardId,
  label: string,
  live: ResolvedMetric | null,
  cached: NepalEconomyDashboardData | null,
  official: OfficialMetric,
  preferOfficial = false,
): NepalEconomyCard {
  const cachedCard = cached?.cards.find((c) => c.id === id);
  const resolved =
    live ??
    (preferOfficial
      ? fromOfficial(official, "official")
      : cachedCard?.value
        ? fromCachedCard(cachedCard)
        : fromOfficial(official, cachedCard ? "cached" : "official"));

  return {
    id,
    label,
    value: resolved.value,
    detail: resolved.detail,
    change: resolved.change,
    tone: resolved.tone,
    source: resolved.source,
    sourceUrl: resolved.sourceUrl,
    updatedAt: resolved.updatedAt,
    dataMode: resolved.dataMode,
  };
}

async function fetchNrbForex() {
  const response = await fetchJson<NrbForexResponse>(nrbForexEndpoint(), {
    timeoutMs: 12_000,
    retries: 1,
    init: { cache: "no-store" },
  });
  const payload = response.data?.payload?.find((item) => item.rates?.length);
  if (!payload?.rates) throw new Error("NRB returned no forex rates");

  const rateFor = (code: string) => {
    const rate = payload.rates?.find((item) => {
      const iso = item.currency?.iso3?.toUpperCase() ?? item.currency?.ISO3?.toUpperCase() ?? "";
      return iso === code;
    });
    if (!rate) return null;
    const buy = parseNumber(rate.buy);
    const sell = parseNumber(rate.sell);
    const unit = parseNumber(rate.currency?.unit) ?? 1;
    if (buy == null && sell == null) return null;
    const avg = ((buy ?? sell ?? 0) + (sell ?? buy ?? 0)) / 2;
    return avg / Math.max(unit, 1);
  };

  const date = payload.date ?? payload.published_on ?? new Date().toISOString();
  return { date, usdNpr: rateFor("USD"), krwNpr: rateFor("KRW") };
}

async function fetchWorldBankSeries(url: string) {
  const response = await fetchJson<[unknown, WorldBankRow[]]>(url, {
    timeoutMs: 12_000,
    retries: 1,
    init: { cache: "no-store" },
  });
  return (response[1] ?? [])
    .filter((row) => typeof row.value === "number" && Number.isFinite(row.value) && row.date)
    .sort((a, b) => Number(a.date) - Number(b.date));
}

async function fetchLiveInflation(): Promise<ResolvedMetric | null> {
  // NRB monthly CPI is the authoritative Nepal inflation series; no stable public JSON API yet.
  return null;
}

async function fetchMetals() {
  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), 12_000);
  try {
    const response = await fetch(FENEGOSIDA_URL, {
      cache: "no-store",
      signal: ctrl.signal,
      headers: { Accept: "text/html" },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const text = await response.text();
    const body = text
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ");
    const gold = body.match(/FINE GOLD[\s\S]{0,120}?per\s*1\s*tola[\s\S]{0,40}?(?:रु|Nrs\.?|Rs\.?)\s*([0-9,]+)/i)?.[1];
    const silver = body.match(/(?:^|\s)SILVER(?!ware)[\s\S]{0,90}?per\s*1\s*tola[\s\S]{0,40}?(?:रु|Nrs\.?|Rs\.?)\s*([0-9,]+)/i)?.[1];
    const updatedAt = response.headers.get("last-modified") ?? response.headers.get("date") ?? new Date().toISOString();
    const goldValue = gold ? Number(gold.replace(/,/g, "")) : null;
    let silverValue = silver ? Number(silver.replace(/,/g, "")) : null;
    if (silverValue != null && goldValue != null && silverValue >= goldValue * 0.5) {
      silverValue = null;
    }
    return {
      updatedAt,
      gold: goldValue,
      silver: silverValue,
    };
  } finally {
    clearTimeout(timeout);
  }
}

function tickToMover(tick: NepseSecurityTick, tone: "up" | "down", updatedAt: string): NepalEconomyMover {
  return {
    name: tick.companyName ?? tick.symbol,
    symbol: tick.symbol,
    price: formatNpr(tick.ltpNpr, 2),
    change: `${tone === "up" ? "+" : ""}${(tick.changePct ?? 0).toLocaleString("en-US", { maximumFractionDigits: 2 })}%`,
    tone,
    source: "Yonepse public NEPSE mirror",
    updatedAt: tick.lastUpdated ?? updatedAt,
  };
}

function forexCard(
  id: "usdNpr" | "krwNpr",
  label: string,
  value: number | null,
  endpoint: string,
  date: string,
  cached: NepalEconomyDashboardData | null,
  fallbackValue: string,
): NepalEconomyCard {
  if (value != null) {
    return {
      id,
      label,
      value: formatNpr(value, id === "krwNpr" ? 4 : 2),
      detail: "Official NRB average of buy/sell rate",
      change: "Live",
      tone: "neutral",
      source: "Nepal Rastra Bank Forex API",
      sourceUrl: endpoint,
      updatedAt: date,
      dataMode: "live",
    };
  }

  const cachedCard = cached?.cards.find((c) => c.id === id);
  if (cachedCard?.value) {
    return { ...cachedCard, dataMode: "cached" };
  }

  return {
    id,
    label,
    value: fallbackValue,
    detail: "Latest cached NRB forex reference",
    change: null,
    tone: "neutral",
    source: "Nepal Rastra Bank Forex API",
    sourceUrl: endpoint,
    updatedAt: cached?.fetchedAt ?? new Date().toISOString(),
    dataMode: "cached",
  };
}

export async function buildNepalEconomyDashboard(): Promise<NepalEconomyDashboardData> {
  const fetchedAt = new Date().toISOString();
  const cached = await readDashboardCache();
  const forexEndpoint = nrbForexEndpoint();

  const [forexResult, gdpRowsResult, inflationLive, metalsResult, nepseResult, newsResult] =
    await Promise.allSettled([
      fetchNrbForex(),
      fetchWorldBankSeries(WORLD_BANK_GDP_URL),
      fetchLiveInflation(),
      fetchMetals(),
      getCachedNepseYonepseBundle(),
      fetchEconomicNews(),
    ]);

  const gdpChart: NepalEconomyChartPoint[] = [];
  let gdpCard: NepalEconomyCard;

  if (gdpRowsResult.status === "fulfilled" && gdpRowsResult.value.length > 0) {
    const rows = gdpRowsResult.value;
    const latest = rows.at(-1)!;
    gdpChart.push(...rows.slice(-8).map((row) => ({ label: row.date ?? "", value: row.value ?? 0 })));
    gdpCard = {
      id: "gdp",
      label: "GDP Growth",
      value: formatPercent(latest.value ?? 0),
      detail: `Annual GDP growth, ${latest.date}`,
      change: (latest.value ?? 0) >= 0 ? "Up" : "Down",
      tone: (latest.value ?? 0) >= 0 ? "up" : "down",
      source: "World Bank Open Data",
      sourceUrl: WORLD_BANK_GDP_URL,
      updatedAt: `${latest.date}-12-31`,
      dataMode: "live",
    };
  } else {
    const cachedGdp = cached?.cards.find((c) => c.id === "gdp");
    gdpCard = cachedGdp ?? {
      id: "gdp",
      label: "GDP Growth",
      value: "3.67%",
      detail: "Annual GDP growth, 2024 (World Bank)",
      change: "Up",
      tone: "up",
      source: "World Bank Open Data",
      sourceUrl: WORLD_BANK_GDP_URL,
      updatedAt: "2024-12-31",
      dataMode: "official",
    };
    if (cached?.charts.gdpGrowth.length) gdpChart.push(...cached.charts.gdpGrowth);
  }

  const cards: NepalEconomyCard[] = [
    resolveMetric(
      "inflation",
      "Nepal Inflation Rate",
      inflationLive.status === "fulfilled" ? inflationLive.value : null,
      cached,
      OFFICIAL_INFLATION,
      true,
    ),
    gdpCard,
    resolveMetric("policyRate", "NRB Policy Rate", null, cached, OFFICIAL_POLICY_RATE, true),
    resolveMetric("fdRates", "Commercial Bank FD Rates", null, cached, OFFICIAL_FD_RATES, true),
  ];

  if (forexResult.status === "fulfilled") {
    const fx = forexResult.value;
    cards.push(
      forexCard("usdNpr", "USD/NPR Exchange Rate", fx.usdNpr, forexEndpoint, fx.date, cached, cached?.cards.find((c) => c.id === "usdNpr")?.value ?? "रु 154.92"),
      forexCard("krwNpr", "KRW/NPR Exchange Rate", fx.krwNpr, forexEndpoint, fx.date, cached, cached?.cards.find((c) => c.id === "krwNpr")?.value ?? "रु 0.1029"),
    );
  } else {
    cards.push(
      forexCard("usdNpr", "USD/NPR Exchange Rate", null, forexEndpoint, fetchedAt, cached, cached?.cards.find((c) => c.id === "usdNpr")?.value ?? "रु 154.92"),
      forexCard("krwNpr", "KRW/NPR Exchange Rate", null, forexEndpoint, fetchedAt, cached, cached?.cards.find((c) => c.id === "krwNpr")?.value ?? "रु 0.1029"),
    );
  }

  if (metalsResult.status === "fulfilled") {
    const metals = metalsResult.value;
    const cachedGold = cached?.cards.find((c) => c.id === "gold");
    const cachedSilver = cached?.cards.find((c) => c.id === "silver");
    const silverFallback = cachedSilver?.value && cachedSilver.value !== cachedGold?.value ? cachedSilver.value : "रु 5,345";
    cards.push(
      {
        id: "gold",
        label: "Gold Price",
        value: metals.gold != null ? formatNpr(metals.gold, 0) : cachedGold?.value ?? "रु 311,100",
        detail: "Fine gold price per tola",
        change: metals.gold != null ? "Live" : "Cached",
        tone: "neutral",
        source: "FENEGOSIDA",
        sourceUrl: FENEGOSIDA_URL,
        updatedAt: metals.updatedAt,
        dataMode: metals.gold != null ? "live" : "cached",
      },
      {
        id: "silver",
        label: "Silver Price",
        value: metals.silver != null ? formatNpr(metals.silver, 0) : silverFallback,
        detail: "Silver price per tola",
        change: metals.silver != null ? "Live" : metals.gold != null ? "Official" : "Cached",
        tone: "neutral",
        source: "FENEGOSIDA",
        sourceUrl: FENEGOSIDA_URL,
        updatedAt: metals.updatedAt,
        dataMode: metals.silver != null ? "live" : metals.gold != null ? "official" : "cached",
      },
    );
  } else {
    const cachedGold = cached?.cards.find((c) => c.id === "gold");
    const cachedSilver = cached?.cards.find((c) => c.id === "silver");
    cards.push(
      cachedGold ?? {
        id: "gold",
        label: "Gold Price",
        value: "रु 311,100",
        detail: "Fine gold price per tola",
        change: null,
        tone: "neutral",
        source: "FENEGOSIDA",
        sourceUrl: FENEGOSIDA_URL,
        updatedAt: "2025-08-31",
        dataMode: "official",
      },
      cachedSilver ?? {
        id: "silver",
        label: "Silver Price",
        value: "रु 5,345",
        detail: "Silver price per tola",
        change: null,
        tone: "neutral",
        source: "FENEGOSIDA",
        sourceUrl: FENEGOSIDA_URL,
        updatedAt: "2025-08-31",
        dataMode: "official",
      },
    );
  }

  cards.push(resolveMetric("remittance", "Remittance Statistics", null, cached, OFFICIAL_REMITTANCE, true));

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

    const indexValue = bundle.index?.value;
    cards.push({
      id: "nepse",
      label: "NEPSE Index",
      value: indexValue != null ? indexValue.toLocaleString("en-US", { maximumFractionDigits: 2 }) : cached?.cards.find((c) => c.id === "nepse")?.value ?? "2,777.11",
      detail: "Latest NEPSE index from public market mirror",
      change: bundle.index?.changePct != null ? `${bundle.index.changePct >= 0 ? "+" : ""}${formatPercent(bundle.index.changePct)}` : cached?.cards.find((c) => c.id === "nepse")?.change ?? null,
      tone: bundle.index?.changePct == null ? "neutral" : bundle.index.changePct >= 0 ? "up" : "down",
      source: "Yonepse public NEPSE mirror",
      sourceUrl: YONEPSE_SOURCE_URL,
      updatedAt: fetchedAt,
      dataMode: indexValue != null ? "live" : "cached",
    });
  } else {
    cards.push(
      cached?.cards.find((c) => c.id === "nepse") ?? {
        id: "nepse",
        label: "NEPSE Index",
        value: "2,777.11",
        detail: "Latest NEPSE index reference",
        change: "+0.17%",
        tone: "up",
        source: "Yonepse public NEPSE mirror",
        sourceUrl: YONEPSE_SOURCE_URL,
        updatedAt: fetchedAt,
        dataMode: "official",
      },
    );
  }

  const orderedIds: NepalEconomyCardId[] = [
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

  const newsRaw = newsResult.status === "fulfilled" ? newsResult.value.items : cached?.news ?? [];
  const news = newsRaw.length > 0 ? newsRaw : OFFICIAL_NEWS.map((item) => ({ ...item }));
  const liveCount = cards.filter((c) => c.dataMode === "live").length;

  const payload: NepalEconomyDashboardData = {
    fetchedAt,
    apiStatus: liveCount >= 6 ? "ok" : liveCount >= 3 ? "degraded" : "cached",
    networkStatus: liveCount > 0 ? "reachable" : cached ? "partial" : "reachable",
    cards: orderedIds.map((id) => cards.find((c) => c.id === id)).filter((c): c is NepalEconomyCard => Boolean(c)),
    topGainers: topGainers.length ? topGainers : cached?.topGainers.length ? cached.topGainers : OFFICIAL_NEPSE_MOVERS.gainers,
    topLosers: topLosers.length ? topLosers : cached?.topLosers.length ? cached.topLosers : OFFICIAL_NEPSE_MOVERS.losers,
    charts: {
      gdpGrowth: gdpChart.length
        ? gdpChart
        : cached?.charts.gdpGrowth.length
          ? cached.charts.gdpGrowth
          : [
              { label: "2020", value: -2.4 },
              { label: "2021", value: 4.8 },
              { label: "2022", value: 5.6 },
              { label: "2023", value: 2.0 },
              { label: "2024", value: 3.67 },
            ],
      fdRates: OFFICIAL_FD_RATES.chart,
    },
    news,
    newsMode: newsResult.status === "fulfilled" ? newsResult.value.mode : cached?.newsMode ?? "official",
  };

  await writeDashboardCache(payload);
  return payload;
}
