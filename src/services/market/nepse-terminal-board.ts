import { fetchJson } from "@/lib/api/fetch-json";
import { createMemoryTtlCache } from "@/lib/api/memory-ttl-cache";
import { getKathmanduMarketStatus } from "@/lib/market/nepse-hub";
import { getCachedNepseYonepseBundle } from "@/services/market/nepse-bundle-cache";
import { createMarketDataServiceClient } from "@/services/market/nepse-market-data-engine";
import { buildNepseTerminalSnapshot } from "@/services/market/nepse-terminal";
import { getCachedNepseYonepseBoard } from "@/services/market/nepse-yonepse";
import type { NepseSecurityTick } from "@/types/market";
import type {
  NepseTerminalBoardPayload,
  TerminalBrokerBoard,
  TerminalBrokerRow,
  TerminalHeatCell,
  TerminalIndexRow,
  TerminalMovers,
  TerminalRange52W,
} from "@/types/market/nepse-professional-terminal";

const SECTOR_INDEX_BLUEPRINT: { name: string; sectorMatchers: string[] }[] = [
  { name: "Bank Index", sectorMatchers: ["commercial bank"] },
  { name: "Finance Index", sectorMatchers: ["finance"] },
  { name: "Hydropower Index", sectorMatchers: ["hydro", "hydropower"] },
  { name: "Development Bank Index", sectorMatchers: ["development bank"] },
  { name: "Hotel & Tourism", sectorMatchers: ["hotel", "tourism"] },
  { name: "Investment", sectorMatchers: ["investment"] },
  { name: "Manufacturing", sectorMatchers: ["manufactur", "production"] },
  { name: "Life Insurance", sectorMatchers: ["life insurance"] },
  { name: "Non-Life Insurance", sectorMatchers: ["non-life", "non life", "nonlife"] },
  { name: "Microfinance", sectorMatchers: ["microfinance", "micro finance"] },
  { name: "Trading", sectorMatchers: ["trading"] },
  { name: "Mutual Fund", sectorMatchers: ["mutual fund", "mutualfund"] },
];

const SHAREHUB_BROKERS = "https://shubhamnpk.github.io/yonepse/data/sharehub_brokers.json";
const BROKERS_META = "https://shubhamnpk.github.io/yonepse/data/brokers.json";
const cache = createMemoryTtlCache();

function matchSector(sector: string | undefined, matchers: string[]): boolean {
  if (!sector) return false;
  const lower = sector.toLowerCase();
  return matchers.some((m) => lower.includes(m));
}

function heatColorWeight(changePct: number | null): number {
  if (changePct == null || !Number.isFinite(changePct)) return 0;
  return Math.max(-1, Math.min(1, changePct / 5));
}

function preferMovers(primary: NepseSecurityTick[], fallback: NepseSecurityTick[], limit = 20): NepseSecurityTick[] {
  if (primary.length) return primary.slice(0, limit);
  return fallback.slice(0, limit);
}

function buildHeatCompanies(bySymbol: Record<string, NepseSecurityTick>): TerminalHeatCell[] {
  return Object.values(bySymbol)
    .filter((tick) => tick.ltpNpr > 0)
    .sort((a, b) => (b.turnoverNpr ?? 0) - (a.turnoverNpr ?? 0))
    .slice(0, 160)
    .map((tick) => ({
      symbol: tick.symbol,
      companyName: tick.companyName ?? null,
      sector: tick.sector ?? null,
      changePct: tick.changePct ?? null,
      ltpNpr: tick.ltpNpr,
      turnoverNpr: tick.turnoverNpr ?? null,
      marketCapNpr: tick.marketCap ?? null,
    }))
    .sort((a, b) => heatColorWeight(b.changePct) - heatColorWeight(a.changePct) || (b.turnoverNpr ?? 0) - (a.turnoverNpr ?? 0));
}

function num(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value);
  return null;
}

async function load52wRanges(bySymbol: Record<string, NepseSecurityTick>): Promise<{
  nearHigh: TerminalRange52W[];
  nearLow: TerminalRange52W[];
  bySymbol: Map<string, { high: number; low: number }>;
}> {
  const empty = { nearHigh: [] as TerminalRange52W[], nearLow: [] as TerminalRange52W[], bySymbol: new Map<string, { high: number; low: number }>() };
  const symbols = Object.keys(bySymbol);
  const sb = createMarketDataServiceClient();
  if (!sb || !symbols.length) return empty;

  const since = new Date();
  since.setUTCDate(since.getUTCDate() - 370);
  const sinceIso = since.toISOString().slice(0, 10);

  const agg = new Map<string, { high: number; low: number }>();
  for (let i = 0; i < symbols.length; i += 80) {
    const chunk = symbols.slice(i, i + 80);
    const { data } = await sb
      .from("nepse_eod_prices")
      .select("symbol, high_npr, low_npr, close_npr")
      .in("symbol", chunk)
      .gte("trade_date", sinceIso);
    for (const row of (data ?? []) as Record<string, unknown>[]) {
      const symbol = typeof row.symbol === "string" ? row.symbol.toUpperCase() : null;
      if (!symbol) continue;
      const high = num(row.high_npr) ?? num(row.close_npr);
      const low = num(row.low_npr) ?? num(row.close_npr);
      if (high == null && low == null) continue;
      const cur = agg.get(symbol) ?? { high: -Infinity, low: Infinity };
      if (high != null && high > 0) cur.high = Math.max(cur.high, high);
      if (low != null && low > 0) cur.low = Math.min(cur.low, low);
      agg.set(symbol, cur);
    }
  }
  if (!agg.size) return empty;

  const nearHigh: TerminalRange52W[] = [];
  const nearLow: TerminalRange52W[] = [];
  for (const [symbol, range] of agg) {
    const tick = bySymbol[symbol];
    if (!tick || tick.ltpNpr <= 0) continue;
    const high = Number.isFinite(range.high) ? range.high : null;
    const low = Number.isFinite(range.low) && range.low !== Infinity ? range.low : null;
    if (high != null && high > 0) {
      const distancePct = ((tick.ltpNpr - high) / high) * 100;
      if (distancePct >= -3) {
        nearHigh.push({
          symbol,
          companyName: tick.companyName ?? null,
          sector: tick.sector ?? null,
          ltpNpr: tick.ltpNpr,
          high52wNpr: high,
          low52wNpr: low,
          distancePct,
        });
      }
    }
    if (low != null && low > 0) {
      const distancePct = ((tick.ltpNpr - low) / low) * 100;
      if (distancePct <= 3) {
        nearLow.push({
          symbol,
          companyName: tick.companyName ?? null,
          sector: tick.sector ?? null,
          ltpNpr: tick.ltpNpr,
          high52wNpr: high,
          low52wNpr: low,
          distancePct,
        });
      }
    }
  }

  nearHigh.sort((a, b) => (b.distancePct ?? -99) - (a.distancePct ?? -99));
  nearLow.sort((a, b) => (a.distancePct ?? 99) - (b.distancePct ?? 99));
  return { nearHigh: nearHigh.slice(0, 25), nearLow: nearLow.slice(0, 25), bySymbol: agg };
}

async function loadBrokerBoard(): Promise<TerminalBrokerBoard> {
  const key = "terminal-brokers-v1";
  const hit = cache.get<TerminalBrokerBoard>(key);
  if (hit) return hit;

  try {
    const [sharehub, meta] = await Promise.all([
      fetchJson<Record<string, unknown>>(SHAREHUB_BROKERS, { timeoutMs: 20_000, retries: 0 }),
      fetchJson<Record<string, unknown>[]>(BROKERS_META, { timeoutMs: 12_000, retries: 0 }).catch(() => []),
    ]);
    const enrichment = (sharehub.enrichment && typeof sharehub.enrichment === "object"
      ? (sharehub.enrichment as Record<string, Record<string, unknown>>)
      : {}) as Record<string, Record<string, unknown>>;
    const names = new Map<string, string>();
    for (const row of Array.isArray(meta) ? meta : []) {
      const code = String(row.memberCode ?? row.member_code ?? "");
      const name = typeof row.memberName === "string" ? row.memberName : typeof row.member_name === "string" ? row.member_name : null;
      if (code && name) names.set(code, name);
    }

    const rows: TerminalBrokerRow[] = [];
    for (const [code, payload] of Object.entries(enrichment)) {
      const today = payload.todayStats && typeof payload.todayStats === "object" ? (payload.todayStats as Record<string, unknown>) : null;
      const ratingObj = payload.rating && typeof payload.rating === "object" ? (payload.rating as Record<string, unknown>) : null;
      rows.push({
        memberCode: code,
        memberName: names.get(code) ?? `Broker ${code}`,
        latestTurnoverNpr: num(payload.latestTurnover) ?? num(today?.totalAmount),
        thirtyDayTurnoverNpr: num(payload.thirtyDaysTurnover),
        buyAmountNpr: num(today?.buyAmount),
        sellAmountNpr: num(today?.sellAmount),
        buyQtyPct: num(today?.buyQuantityPercentage),
        sellQtyPct: num(today?.sellQuantityPercentage),
        rating: num(ratingObj?.averageRating),
      });
    }

    const topByTurnover = [...rows]
      .filter((row) => row.latestTurnoverNpr != null && row.latestTurnoverNpr > 0)
      .sort((a, b) => (b.latestTurnoverNpr ?? 0) - (a.latestTurnoverNpr ?? 0))
      .slice(0, 25);
    const buySellLeaders = [...rows]
      .filter((row) => row.buyAmountNpr != null || row.sellAmountNpr != null)
      .sort((a, b) => (b.buyAmountNpr ?? 0) + (b.sellAmountNpr ?? 0) - ((a.buyAmountNpr ?? 0) + (a.sellAmountNpr ?? 0)))
      .slice(0, 25);

    const board: TerminalBrokerBoard = {
      topByTurnover,
      buySellLeaders,
      asOf: typeof sharehub.scrapedAt === "string" ? sharehub.scrapedAt : null,
    };
    cache.set(key, board, 10 * 60_000);
    return board;
  } catch {
    return { topByTurnover: [], buySellLeaders: [], asOf: null };
  }
}

/** Assemble the institutional terminal board from real feeds + DB ranges. */
export async function loadTerminalBoard(): Promise<NepseTerminalBoardPayload> {
  const [board, cached, brokers] = await Promise.all([
    getCachedNepseYonepseBoard().catch(() => null),
    getCachedNepseYonepseBundle().catch(() => null),
    loadBrokerBoard(),
  ]);

  const bySymbol = board?.bySymbol ?? cached?.bySymbol ?? {};
  const term = Object.keys(bySymbol).length ? buildNepseTerminalSnapshot(bySymbol) : null;
  const clock = getKathmanduMarketStatus();
  const feedIsOpen = board?.marketStatus.isOpen ?? null;
  const ranges = await load52wRanges(bySymbol);

  const indices: TerminalIndexRow[] = [];
  const feedIndices = board?.indices?.length
    ? board.indices
    : cached?.index
      ? [{ name: cached.index.name, value: cached.index.value, changePct: cached.index.changePct ?? null, changeNpr: cached.index.changePts ?? null, high: null, low: null, previousClose: null }]
      : [];

  for (const row of feedIndices) {
    indices.push({
      id: row.name.toLowerCase().replace(/\s+/g, "-"),
      name: row.name,
      value: row.value,
      changePct: row.changePct,
      changeNpr: row.changeNpr,
      sectorChangePct: null,
      source: row.value != null ? "index_feed" : "unavailable",
    });
  }

  const hasNepse = indices.some((row) => /nepse/i.test(row.name) && !/sensitive|float/i.test(row.name));
  if (!hasNepse && cached?.index) {
    indices.unshift({
      id: "nepse-index",
      name: "NEPSE Index",
      value: cached.index.value,
      changePct: cached.index.changePct ?? null,
      changeNpr: cached.index.changePts ?? null,
      sectorChangePct: null,
      source: "index_feed",
    });
  }

  for (const blueprint of SECTOR_INDEX_BLUEPRINT) {
    if (indices.some((row) => row.name.toLowerCase() === blueprint.name.toLowerCase())) continue;
    const sectorRow = (term?.sectorPerformance ?? []).find((sector) => matchSector(sector.sector, blueprint.sectorMatchers));
    indices.push({
      id: blueprint.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      name: blueprint.name,
      value: null,
      changePct: null,
      changeNpr: null,
      sectorChangePct: sectorRow?.avgChangePct ?? null,
      source: sectorRow ? "sector_pulse" : "unavailable",
    });
  }

  const movers: TerminalMovers = {
    topGainers: preferMovers(board?.topStocks.topGainers ?? [], term?.topGainers ?? []),
    topLosers: preferMovers(board?.topStocks.topLosers ?? [], term?.topLosers ?? []),
    topTurnover: preferMovers(board?.topStocks.topTurnover ?? [], term?.turnoverLeaders ?? []),
    topVolume: preferMovers(board?.topStocks.topVolume ?? [], term?.mostActive ?? []),
    topTransactions: preferMovers(
      board?.topStocks.topTransactions ?? [],
      [...Object.values(bySymbol)].sort((a, b) => (b.trades ?? 0) - (a.trades ?? 0)),
    ),
    mostActive: preferMovers(term?.mostActive ?? [], board?.topStocks.topVolume ?? []),
    near52wHigh: ranges.nearHigh,
    near52wLow: ranges.nearLow,
  };

  let totalMarketCapNpr: number | null = null;
  let marketCapCoverage = 0;
  let mcapSum = 0;
  for (const tick of Object.values(bySymbol)) {
    if (tick.marketCap != null && Number.isFinite(tick.marketCap) && tick.marketCap > 0) {
      mcapSum += tick.marketCap;
      marketCapCoverage += 1;
    }
  }
  if (marketCapCoverage > 0) totalMarketCapNpr = mcapSum;

  const sectorPerformance = term?.sectorPerformance ?? [];
  const totalSectorTurnover = sectorPerformance.reduce((sum, row) => sum + (row.turnoverNpr || 0), 0) || 1;
  const marketDistribution = sectorPerformance.map((row) => ({
    sector: row.sector,
    turnoverSharePct: (row.turnoverNpr / totalSectorTurnover) * 100,
    turnoverNpr: row.turnoverNpr,
    constituents: row.constituents,
  }));

  const sources: string[] = [];
  if (feedIndices.length) sources.push("Yonepse indices");
  if (Object.keys(bySymbol).length) sources.push("Yonepse live board");
  if (board?.topStocks.topGainers.length) sources.push("Yonepse top stocks");
  if (board?.summaryStats.totalTurnoverNpr != null) sources.push("Yonepse market summary");
  if (ranges.nearHigh.length || ranges.nearLow.length) sources.push("nepse_eod_prices 52W ranges");
  if (brokers.topByTurnover.length) sources.push("Sharehub broker turnover");

  return {
    status: {
      label: feedIsOpen === true ? "Open" : feedIsOpen === false ? clock.label === "Pre-open" ? "Pre-open" : "Closed" : clock.label,
      live: feedIsOpen === true ? true : feedIsOpen === false ? false : clock.live,
      feedIsOpen,
      checkedAt: board?.marketStatus.checkedAt ?? null,
    },
    indices,
    summary: {
      totalTurnoverNpr: board?.summaryStats.totalTurnoverNpr ?? term?.totalTurnoverNpr ?? null,
      totalVolume: board?.summaryStats.totalVolume ?? null,
      totalTrades: board?.summaryStats.totalTrades ?? null,
      scripsTraded: board?.summaryStats.scripsTraded ?? term?.totalsListed ?? null,
      totalMarketCapNpr,
      marketCapCoverage,
    },
    breadth: term?.breadth ?? null,
    sectorPerformance,
    movers,
    heatmap: {
      companies: buildHeatCompanies(bySymbol),
      sectors: sectorPerformance.map((sector) => ({
        sector: sector.sector,
        avgChangePct: sector.avgChangePct,
        constituents: sector.constituents,
        turnoverNpr: sector.turnoverNpr,
      })),
    },
    brokers,
    marketDistribution,
    loadedAt: new Date().toISOString(),
    sources,
  };
}
