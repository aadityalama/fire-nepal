import "server-only";

import { createMemoryTtlCache } from "@/lib/api/memory-ttl-cache";
import {
  NEPSE_MARKET_INDEX_OPTIONS,
  getMarketIndexOption,
  sectorMatchesIndex,
  type NepseMarketIndexOption,
} from "@/lib/market/nepse-market-indices";
import { listCompanyMasterMap } from "@/services/market/nepse-company-master";
import { createMarketDataServiceClient, type IngestResult } from "@/services/market/nepse-market-data-engine";
import { authenticateNepsePublicApi } from "@/services/market/nepse-ownership-provider";
import type { SupabaseClient } from "@supabase/supabase-js";

const ROOT = "https://www.nepalstock.com.np";
const cache = createMemoryTtlCache();
const COMPOSITION_TTL_MS = 5 * 60_000;

type OfficialIndexRow = {
  id?: unknown;
  indexCode?: unknown;
  indexName?: unknown;
  description?: unknown;
  keyIndexFlag?: unknown;
  baseYearMarketCapitalization?: unknown;
  sectorMaster?: {
    id?: unknown;
    sectorDescription?: unknown;
  } | null;
};

type TradeStatRow = {
  symbol?: unknown;
  securityId?: unknown;
  indexId?: unknown;
};

export type NepseIndexCompositionPayload = {
  indexKey: string;
  indexName: string;
  companyCount: number;
  symbols: string[];
  totalMarketCapNpr: number | null;
  lastUpdated: string | null;
  membershipSource: string;
  options: { key: string; displayName: string }[];
};

function str(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function num(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value);
  return null;
}

async function fetchJson<T>(url: string, authorization: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      authorization,
      accept: "application/json",
      "user-agent": "FIRENepal-IndexComposition/1.0 (+https://firenepal.com)",
    },
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status} ${url}`);
  return (await response.json()) as T;
}

function optionByNepseId(id: number): NepseMarketIndexOption | undefined {
  return NEPSE_MARKET_INDEX_OPTIONS.find((row) => row.nepseId === id);
}

/** Upsert official index catalog from NEPSE `/api/nots/index`. */
async function upsertIndexCatalog(sb: SupabaseClient, authorization: string): Promise<number> {
  const rows = await fetchJson<OfficialIndexRow[]>(`${ROOT}/api/nots/index`, authorization);
  const now = new Date().toISOString();
  const payload = (Array.isArray(rows) ? rows : [])
    .map((row) => {
      const nepseId = num(row.id);
      if (nepseId == null) return null;
      const option = optionByNepseId(nepseId);
      const indexKey = option?.key ?? `INDEX_${nepseId}`;
      const indexName = str(row.indexName) ?? option?.displayName ?? indexKey;
      return {
        index_key: indexKey,
        nepse_id: nepseId,
        index_code: str(row.indexCode),
        index_name: indexName,
        display_name: option?.displayName ?? indexName,
        description: str(row.description),
        sector_name: str(row.sectorMaster?.sectorDescription),
        sector_id: num(row.sectorMaster?.id),
        key_index_flag: str(row.keyIndexFlag),
        base_year_market_cap: num(row.baseYearMarketCapitalization),
        source: "nepalstock:index",
        updated_at: now,
      };
    })
    .filter(
      (
        row,
      ): row is {
        index_key: string;
        nepse_id: number;
        index_code: string | null;
        index_name: string;
        display_name: string;
        description: string | null;
        sector_name: string | null;
        sector_id: number | null;
        key_index_flag: string | null;
        base_year_market_cap: number | null;
        source: string;
        updated_at: string;
      } => Boolean(row),
    );

  // Ensure synthetic All Listed row is not required in DB.
  if (!payload.length) return 0;
  const { error } = await sb.from("nepse_market_indices").upsert(payload, { onConflict: "index_key" });
  if (error) throw new Error(error.message);
  return payload.length;
}

/**
 * Persist trade-composition membership for Sensitive / Float / Sensitive Float.
 * Official endpoint: `/api/nots/securityDailyTradeStat/{indexId}` (companies in that index).
 * Symbols are retained across quiet days until delisted from company master.
 */
async function upsertTradeComposition(
  sb: SupabaseClient,
  authorization: string,
  option: NepseMarketIndexOption,
): Promise<number> {
  if (option.nepseId == null) return 0;
  const rows = await fetchJson<TradeStatRow[]>(
    `${ROOT}/api/nots/securityDailyTradeStat/${option.nepseId}`,
    authorization,
  );
  const now = new Date().toISOString();
  const mapped = (Array.isArray(rows) ? rows : [])
    .map((row) => {
      const symbol = str(row.symbol)?.toUpperCase();
      if (!symbol) return null;
      return {
        index_key: option.key,
        symbol,
        security_id: num(row.securityId),
        membership_source: `nepalstock:securityDailyTradeStat:${option.nepseId}`,
        last_seen_at: now,
        updated_at: now,
      };
    })
    .filter(Boolean) as Record<string, unknown>[];

  if (!mapped.length) return 0;

  // Upsert touch last_seen; preserve first_seen_at via ignoreDuplicates=false default upsert.
  const existing = await sb
    .from("nepse_index_constituents")
    .select("symbol,first_seen_at")
    .eq("index_key", option.key);
  const firstSeen = new Map(
    ((existing.data as { symbol?: string; first_seen_at?: string }[] | null) ?? []).map((row) => [
      String(row.symbol ?? "").toUpperCase(),
      row.first_seen_at ?? now,
    ]),
  );

  const withFirst = mapped.map((row) => ({
    ...row,
    first_seen_at: firstSeen.get(String(row.symbol)) ?? now,
  }));

  for (let i = 0; i < withFirst.length; i += 200) {
    const chunk = withFirst.slice(i, i + 200);
    const { error } = await sb.from("nepse_index_constituents").upsert(chunk, { onConflict: "index_key,symbol" });
    if (error) throw new Error(error.message);
  }
  return withFirst.length;
}

/** Rebuild sector-index membership from official Company Master + index sector mapping. */
async function rebuildSectorComposition(sb: SupabaseClient, option: NepseMarketIndexOption): Promise<number> {
  if (!option.sectorNames.length) return 0;
  const master = await listCompanyMasterMap(sb);
  const now = new Date().toISOString();
  const members = [...master.values()]
    .filter((row) => row.isListed && sectorMatchesIndex(row.sector, option.sectorNames))
    .map((row) => ({
      index_key: option.key,
      symbol: row.symbol,
      security_id: row.securityId,
      membership_source: "nepalstock:company-master+index-sector",
      first_seen_at: now,
      last_seen_at: now,
      updated_at: now,
    }));

  // Replace sector membership atomically for this index.
  await sb.from("nepse_index_constituents").delete().eq("index_key", option.key);
  for (let i = 0; i < members.length; i += 200) {
    const { error } = await sb.from("nepse_index_constituents").insert(members.slice(i, i + 200));
    if (error) throw new Error(error.message);
  }
  return members.length;
}

/** NEPSE Index = all currently listed companies from official Company Master. */
async function rebuildNepseIndexComposition(sb: SupabaseClient): Promise<number> {
  const master = await listCompanyMasterMap(sb);
  const now = new Date().toISOString();
  const members = [...master.values()]
    .filter((row) => row.isListed)
    .map((row) => ({
      index_key: "NEPSE",
      symbol: row.symbol,
      security_id: row.securityId,
      membership_source: "nepalstock:company-master:listed",
      first_seen_at: now,
      last_seen_at: now,
      updated_at: now,
    }));

  await sb.from("nepse_index_constituents").delete().eq("index_key", "NEPSE");
  // Ensure catalog row exists even if /api/nots/index upsert already covered it.
  await sb.from("nepse_market_indices").upsert(
    {
      index_key: "NEPSE",
      nepse_id: 58,
      index_code: "NEPSE",
      index_name: "NEPSE Index",
      display_name: "NEPSE Index",
      description: "All listed companies on NEPSE",
      sector_name: "ALL",
      source: "nepalstock:company-master",
      updated_at: now,
    },
    { onConflict: "index_key" },
  );

  for (let i = 0; i < members.length; i += 200) {
    const { error } = await sb.from("nepse_index_constituents").insert(members.slice(i, i + 200));
    if (error) throw new Error(error.message);
  }
  return members.length;
}

/**
 * Refresh official index catalog + membership from NEPSE.
 * Safe to run on every market cron — incremental for trade indices, rebuilt for sector/NEPSE.
 */
export async function ingestIndexComposition(sb: SupabaseClient): Promise<IngestResult> {
  const startedAt = new Date();
  let result: IngestResult;
  try {
    const { authorization } = await authenticateNepsePublicApi();
    const catalogCount = await upsertIndexCatalog(sb, authorization);

    let memberTouches = 0;
    memberTouches += await rebuildNepseIndexComposition(sb);

    for (const option of NEPSE_MARKET_INDEX_OPTIONS) {
      if (option.key === "ALL_LISTED" || option.key === "NEPSE") continue;
      if (option.sectorNames.length) {
        memberTouches += await rebuildSectorComposition(sb, option);
        continue;
      }
      if (option.usesTradeComposition) {
        memberTouches += await upsertTradeComposition(sb, authorization, option);
      }
    }

    // Drop trade-composition members that are no longer listed in company master.
    const master = await listCompanyMasterMap(sb);
    const listed = new Set([...master.values()].filter((row) => row.isListed).map((row) => row.symbol));
    const { data: tradeRows } = await sb
      .from("nepse_index_constituents")
      .select("index_key,symbol")
      .in("index_key", ["SENSITIVE", "FLOAT", "SENSITIVE_FLOAT"]);
    const stale = ((tradeRows as { index_key: string; symbol: string }[] | null) ?? []).filter(
      (row) => !listed.has(row.symbol),
    );
    for (const row of stale) {
      await sb.from("nepse_index_constituents").delete().eq("index_key", row.index_key).eq("symbol", row.symbol);
    }

    cache.delete("nepse-index-composition-all");
    for (const option of NEPSE_MARKET_INDEX_OPTIONS) {
      cache.delete(`nepse-index-composition:${option.key}`);
    }

    result = {
      kind: "eod",
      status: "ok",
      items: memberTouches,
      message: `Index catalog ${catalogCount}; membership touches ${memberTouches}; pruned ${stale.length} delisted`,
    };
  } catch (error) {
    result = {
      kind: "eod",
      status: "error",
      items: 0,
      message: error instanceof Error ? error.message : "Index composition ingest failed",
    };
  }

  // Soft-log via ingestion_runs when available.
  try {
    await sb.from("nepse_ingestion_runs").insert({
      kind: "eod",
      status: result.status,
      items: result.items,
      message: `index_composition: ${result.message}`.slice(0, 500),
      started_at: startedAt.toISOString(),
      finished_at: new Date().toISOString(),
    });
  } catch {
    /* ignore logging failures */
  }
  return result;
}

async function loadSymbolsForIndex(sb: SupabaseClient, indexKey: string): Promise<{ symbols: string[]; lastUpdated: string | null; source: string }> {
  if (indexKey === "ALL_LISTED") {
    const master = await listCompanyMasterMap(sb);
    const symbols = [...master.values()].filter((row) => row.isListed).map((row) => row.symbol).sort();
    return { symbols, lastUpdated: new Date().toISOString(), source: "nepalstock:company-master" };
  }

  const { data, error } = await sb
    .from("nepse_index_constituents")
    .select("symbol,last_seen_at,membership_source")
    .eq("index_key", indexKey);
  if (error && /nepse_index_constituents|schema cache|does not exist/i.test(error.message)) {
    return { symbols: [], lastUpdated: null, source: "unavailable" };
  }
  const rows = (data as { symbol?: string; last_seen_at?: string; membership_source?: string }[] | null) ?? [];
  const symbols = rows
    .map((row) => String(row.symbol ?? "").toUpperCase())
    .filter(Boolean)
    .sort();
  let lastUpdated: string | null = null;
  let source = "nepalstock";
  for (const row of rows) {
    if (row.last_seen_at && (!lastUpdated || row.last_seen_at > lastUpdated)) lastUpdated = row.last_seen_at;
    if (row.membership_source) source = row.membership_source;
  }
  return { symbols, lastUpdated, source };
}

export async function getIndexComposition(
  indexKeyRaw = "ALL_LISTED",
  marketCapBySymbol?: Record<string, number | null | undefined>,
): Promise<NepseIndexCompositionPayload> {
  const indexKey = (indexKeyRaw || "ALL_LISTED").trim().toUpperCase();
  const option = getMarketIndexOption(indexKey) ?? getMarketIndexOption("ALL_LISTED")!;
  const cacheKey = `nepse-index-composition:${option.key}`;
  const hit = cache.get<NepseIndexCompositionPayload>(cacheKey);
  if (hit && !marketCapBySymbol) return hit;

  const sb = createMarketDataServiceClient();
  const options = NEPSE_MARKET_INDEX_OPTIONS.map((row) => ({ key: row.key, displayName: row.displayName }));

  if (!sb) {
    return {
      indexKey: option.key,
      indexName: option.displayName,
      companyCount: 0,
      symbols: [],
      totalMarketCapNpr: null,
      lastUpdated: null,
      membershipSource: "unavailable",
      options,
    };
  }

  // Lazy rebuild if empty for a known sector/NEPSE index (migration just applied).
  let { symbols, lastUpdated, source } = await loadSymbolsForIndex(sb, option.key);
  if (!symbols.length && option.key !== "ALL_LISTED") {
    try {
      await ingestIndexComposition(sb);
      ({ symbols, lastUpdated, source } = await loadSymbolsForIndex(sb, option.key));
    } catch {
      /* keep empty */
    }
  }

  let totalMarketCapNpr: number | null = null;
  if (marketCapBySymbol) {
    let sum = 0;
    let any = false;
    for (const symbol of symbols) {
      const cap = marketCapBySymbol[symbol];
      if (cap != null && Number.isFinite(cap) && cap > 0) {
        sum += cap;
        any = true;
      }
    }
    totalMarketCapNpr = any ? sum : null;
  }

  const payload: NepseIndexCompositionPayload = {
    indexKey: option.key,
    indexName: option.displayName,
    companyCount: symbols.length,
    symbols,
    totalMarketCapNpr,
    lastUpdated,
    membershipSource: source,
    options,
  };
  if (!marketCapBySymbol) cache.set(cacheKey, payload, COMPOSITION_TTL_MS);
  return payload;
}

export async function listMarketIndexOptions(): Promise<{ key: string; displayName: string }[]> {
  return NEPSE_MARKET_INDEX_OPTIONS.map((row) => ({ key: row.key, displayName: row.displayName }));
}
