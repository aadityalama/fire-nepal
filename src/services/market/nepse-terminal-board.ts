import { getKathmanduMarketStatus } from "@/lib/market/nepse-hub";
import { getCachedNepseYonepseBundle } from "@/services/market/nepse-bundle-cache";
import { buildNepseTerminalSnapshot } from "@/services/market/nepse-terminal";
import { getCachedNepseYonepseBoard } from "@/services/market/nepse-yonepse";
import type { NepseSecurityTick } from "@/types/market";
import type {
  NepseTerminalBoardPayload,
  TerminalHeatCell,
  TerminalIndexRow,
  TerminalMovers,
} from "@/types/market/nepse-professional-terminal";

/**
 * Sector boards the terminal always surfaces. When the official index feed does not
 * publish a level, we show sector-pulse % from live constituents and leave value null.
 */
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

function matchSector(sector: string | undefined, matchers: string[]): boolean {
  if (!sector) return false;
  const lower = sector.toLowerCase();
  return matchers.some((m) => {
    if (m === "bank") {
      // Avoid classifying development banks / finance as commercial banks.
      return lower.includes("commercial bank") || (lower.includes("bank") && !lower.includes("development") && !lower.includes("finance") && !lower.includes("micro"));
    }
    return lower.includes(m);
  });
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
    .slice(0, 120)
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

/** Assemble the professional terminal board from real Yonepse + derived breadth. */
export async function loadTerminalBoard(): Promise<NepseTerminalBoardPayload> {
  const [board, cached] = await Promise.all([
    getCachedNepseYonepseBoard().catch(() => null),
    getCachedNepseYonepseBundle().catch(() => null),
  ]);

  const bySymbol = board?.bySymbol ?? cached?.bySymbol ?? {};
  const term = Object.keys(bySymbol).length ? buildNepseTerminalSnapshot(bySymbol) : null;
  const clock = getKathmanduMarketStatus();
  const feedIsOpen = board?.marketStatus.isOpen ?? null;

  const indices: TerminalIndexRow[] = [];
  const feedIndices = board?.indices?.length ? board.indices : cached?.index ? [{ name: cached.index.name, value: cached.index.value, changePct: cached.index.changePct ?? null, changeNpr: null, high: null, low: null, previousClose: null }] : [];

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

  // Ensure NEPSE appears even when the feed is partial.
  const hasNepse = indices.some((row) => /nepse/i.test(row.name) && !/sensitive|float/i.test(row.name));
  if (!hasNepse && cached?.index) {
    indices.unshift({
      id: "nepse-index",
      name: "NEPSE Index",
      value: cached.index.value,
      changePct: cached.index.changePct ?? null,
      changeNpr: null,
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
  };

  const sources: string[] = [];
  if (feedIndices.length) sources.push("Yonepse indices");
  if (Object.keys(bySymbol).length) sources.push("Yonepse live board");
  if (board?.topStocks.topGainers.length) sources.push("Yonepse top stocks");
  if (board?.summaryStats.totalTurnoverNpr != null) sources.push("Yonepse market summary");

  return {
    status: {
      label: feedIsOpen === true ? "Open" : feedIsOpen === false ? "Closed" : clock.label,
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
    },
    breadth: term?.breadth ?? null,
    sectorPerformance: term?.sectorPerformance ?? [],
    movers,
    heatmap: {
      companies: buildHeatCompanies(bySymbol),
      sectors: (term?.sectorPerformance ?? []).map((sector) => ({
        sector: sector.sector,
        avgChangePct: sector.avgChangePct,
        constituents: sector.constituents,
        turnoverNpr: sector.turnoverNpr,
      })),
    },
    loadedAt: new Date().toISOString(),
    sources,
  };
}
