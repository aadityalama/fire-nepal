/**
 * Official NEPSE synchronization: fetch → persist snapshot → serve with
 * last-successful fallback. Never fabricates market values.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createMemoryTtlCache } from "@/lib/api/memory-ttl-cache";
import {
  fetchNepseOfficialBundle,
  getCachedNepseOfficialBundle,
  invalidateOfficialLiveCache,
  seedOfficialLiveCache,
  OFFICIAL_LIVE_TTL_MS,
  type NepseOfficialBreadth,
  type NepseOfficialBundle,
} from "@/services/market/nepse-official-live";
import type { NepseBundle } from "@/services/market/nepse-yonepse";
import type { NepseIndexTick, NepseSecurityTick } from "@/types/market";

function createSyncServiceClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function kathmanduTradeDate(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kathmandu" }).format(now);
}

export type NepseLiveServeMeta = {
  source: "official" | "last_successful";
  lastSuccessfulSyncAt: string | null;
  stale: boolean;
  error: string | null;
};

export type NepseLiveServeResult = {
  bundle: NepseOfficialBundle;
  meta: NepseLiveServeMeta;
};

type PersistedSnapshotRow = {
  synced_at: string;
  trade_date: string;
  is_market_open: boolean | null;
  market_as_of: string | null;
  generated_time: string | null;
  index_name: string | null;
  index_value: number | null;
  index_change_npr: number | null;
  index_change_pct: number | null;
  previous_close: number | null;
  total_turnover_npr: number | null;
  total_volume: number | null;
  total_trades: number | null;
  scrips_traded: number | null;
  advancing: number | null;
  declining: number | null;
  unchanged: number | null;
  upper_circuit: number | null;
  lower_circuit: number | null;
  payload_json: unknown;
};

const processLastGood = createMemoryTtlCache();
const LAST_GOOD_KEY = "nepse-official-last-good-v1";
const LAST_GOOD_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const PERSIST_MIN_INTERVAL_MS = 45_000;
let lastPersistAt = 0;

function asOfficialBundle(bundle: NepseBundle, breadth: NepseOfficialBreadth, syncedAt: string): NepseOfficialBundle {
  return {
    ...bundle,
    officialBreadth: breadth,
    syncMeta: {
      source: "official",
      syncedAt,
      generatedTime: null,
      marketAsOf: bundle.marketStatus.checkedAt,
    },
  };
}

function rememberLastGood(bundle: NepseOfficialBundle): void {
  processLastGood.set(LAST_GOOD_KEY, bundle, LAST_GOOD_TTL_MS);
}

function readProcessLastGood(): NepseOfficialBundle | null {
  return processLastGood.get<NepseOfficialBundle>(LAST_GOOD_KEY) ?? null;
}

function payloadToBundle(row: PersistedSnapshotRow): NepseOfficialBundle | null {
  const payload = row.payload_json;
  if (payload && typeof payload === "object") {
    const o = payload as Partial<NepseOfficialBundle>;
    if (o.bySymbol && typeof o.bySymbol === "object") {
      const breadth = o.officialBreadth ?? {
        advancing: row.advancing ?? 0,
        declining: row.declining ?? 0,
        unchanged: row.unchanged ?? 0,
        upperCircuit: row.upper_circuit ?? 0,
        lowerCircuit: row.lower_circuit ?? 0,
      };
      return {
        index: o.index,
        indices: Array.isArray(o.indices) ? o.indices : [],
        bySymbol: o.bySymbol as Record<string, NepseSecurityTick>,
        marketStatus: o.marketStatus ?? {
          isOpen: row.is_market_open,
          checkedAt: row.market_as_of,
        },
        summaryStats: o.summaryStats ?? {
          totalTurnoverNpr: row.total_turnover_npr,
          totalVolume: row.total_volume,
          totalTrades: row.total_trades,
          scripsTraded: row.scrips_traded,
        },
        topStocks: o.topStocks ?? {
          topGainers: [],
          topLosers: [],
          topTurnover: [],
          topVolume: [],
          topTransactions: [],
        },
        officialBreadth: breadth,
        syncMeta: {
          source: "official",
          syncedAt: row.synced_at,
          generatedTime: row.generated_time,
          marketAsOf: row.market_as_of,
        },
      };
    }
  }

  // Column-only fallback (never invent index/summary numbers that were not stored).
  if (row.index_value == null && row.total_turnover_npr == null) return null;
  const index: NepseIndexTick | undefined =
    row.index_value != null
      ? {
          name: row.index_name ?? "NEPSE Index",
          value: Number(row.index_value),
          changePct: row.index_change_pct != null ? Number(row.index_change_pct) : undefined,
          changeNpr: row.index_change_npr != null ? Number(row.index_change_npr) : undefined,
          previousClose: row.previous_close != null ? Number(row.previous_close) : undefined,
        }
      : undefined;

  return asOfficialBundle(
    {
      index,
      indices: index
        ? [
            {
              name: index.name,
              value: index.value,
              changePct: index.changePct ?? null,
              changeNpr: index.changeNpr ?? null,
              high: null,
              low: null,
              previousClose: index.previousClose ?? null,
            },
          ]
        : [],
      bySymbol: {},
      marketStatus: { isOpen: row.is_market_open, checkedAt: row.market_as_of },
      summaryStats: {
        totalTurnoverNpr: row.total_turnover_npr != null ? Number(row.total_turnover_npr) : null,
        totalVolume: row.total_volume != null ? Number(row.total_volume) : null,
        totalTrades: row.total_trades != null ? Number(row.total_trades) : null,
        scripsTraded: row.scrips_traded != null ? Number(row.scrips_traded) : null,
      },
      topStocks: {
        topGainers: [],
        topLosers: [],
        topTurnover: [],
        topVolume: [],
        topTransactions: [],
      },
    },
    {
      advancing: row.advancing ?? 0,
      declining: row.declining ?? 0,
      unchanged: row.unchanged ?? 0,
      upperCircuit: row.upper_circuit ?? 0,
      lowerCircuit: row.lower_circuit ?? 0,
    },
    row.synced_at,
  );
}

async function loadLastSnapshotFromDb(sb: SupabaseClient): Promise<NepseOfficialBundle | null> {
  const { data, error } = await sb
    .from("nepse_market_snapshots")
    .select(
      "synced_at,trade_date,is_market_open,market_as_of,generated_time,index_name,index_value,index_change_npr,index_change_pct,previous_close,total_turnover_npr,total_volume,total_trades,scrips_traded,advancing,declining,unchanged,upper_circuit,lower_circuit,payload_json",
    )
    .order("synced_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return payloadToBundle(data as PersistedSnapshotRow);
}

export async function persistOfficialMarketSnapshot(
  sb: SupabaseClient,
  bundle: NepseOfficialBundle,
): Promise<void> {
  const row = {
    synced_at: bundle.syncMeta.syncedAt,
    trade_date: kathmanduTradeDate(new Date(bundle.syncMeta.syncedAt)),
    source: "official",
    is_market_open: bundle.marketStatus.isOpen,
    market_as_of: bundle.syncMeta.marketAsOf,
    generated_time: bundle.syncMeta.generatedTime,
    index_name: bundle.index?.name ?? null,
    index_value: bundle.index?.value ?? null,
    index_change_npr: bundle.index?.changeNpr ?? null,
    index_change_pct: bundle.index?.changePct ?? null,
    previous_close: bundle.index?.previousClose ?? null,
    total_turnover_npr: bundle.summaryStats.totalTurnoverNpr,
    total_volume: bundle.summaryStats.totalVolume,
    total_trades: bundle.summaryStats.totalTrades,
    scrips_traded: bundle.summaryStats.scripsTraded,
    advancing: bundle.officialBreadth.advancing,
    declining: bundle.officialBreadth.declining,
    unchanged: bundle.officialBreadth.unchanged,
    upper_circuit: bundle.officialBreadth.upperCircuit,
    lower_circuit: bundle.officialBreadth.lowerCircuit,
    payload_json: bundle,
  };
  const { error } = await sb.from("nepse_market_snapshots").insert(row);
  if (error) {
    // Table may not be applied yet in some environments — keep process cache only.
    console.error("[nepse-official-sync] persist failed:", error.message);
  }
}

async function maybePersist(bundle: NepseOfficialBundle): Promise<void> {
  const now = Date.now();
  if (now - lastPersistAt < PERSIST_MIN_INTERVAL_MS) return;
  lastPersistAt = now;
  const sb = createSyncServiceClient();
  if (!sb) return;
  await persistOfficialMarketSnapshot(sb, bundle);
}

async function logOfficialSync(
  sb: SupabaseClient | null,
  status: "ok" | "partial" | "error",
  items: number,
  message: string,
  startedAt: Date,
): Promise<void> {
  if (!sb) return;
  const { error } = await sb.from("nepse_ingestion_runs").insert({
    kind: "official_live",
    status,
    items,
    message: message.slice(0, 500),
    started_at: startedAt.toISOString(),
  });
  if (error) console.error("[nepse-official-sync] run log failed:", error.message);
}

/**
 * Serve official live data, or the last successfully synchronized official snapshot.
 */
export async function getOfficialNepseLiveBundle(options?: {
  ttlMs?: number;
  force?: boolean;
}): Promise<NepseLiveServeResult> {
  const ttlMs = options?.ttlMs ?? OFFICIAL_LIVE_TTL_MS;
  try {
    if (options?.force) invalidateOfficialLiveCache();
    const bundle = options?.force
      ? await fetchNepseOfficialBundle()
      : await getCachedNepseOfficialBundle(ttlMs);
    if (options?.force) seedOfficialLiveCache(bundle, ttlMs);

    rememberLastGood(bundle);
    void maybePersist(bundle);
    return {
      bundle,
      meta: {
        source: "official",
        lastSuccessfulSyncAt: bundle.syncMeta.syncedAt,
        stale: false,
        error: null,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Official NEPSE sync failed";
    const processHit = readProcessLastGood();
    if (processHit) {
      return {
        bundle: processHit,
        meta: {
          source: "last_successful",
          lastSuccessfulSyncAt: processHit.syncMeta.syncedAt,
          stale: true,
          error: message,
        },
      };
    }

    const sb = createSyncServiceClient();
    const dbHit = sb ? await loadLastSnapshotFromDb(sb).catch(() => null) : null;
    if (dbHit) {
      rememberLastGood(dbHit);
      return {
        bundle: dbHit,
        meta: {
          source: "last_successful",
          lastSuccessfulSyncAt: dbHit.syncMeta.syncedAt,
          stale: true,
          error: message,
        },
      };
    }

    throw error instanceof Error ? error : new Error(message);
  }
}

/** Admin / cron force sync against the official NEPSE website. */
export async function forceSyncOfficialNepseMarket(): Promise<{
  ok: boolean;
  status: "ok" | "error";
  lastSuccessfulSyncAt: string | null;
  indexValue: number | null;
  message: string;
  breadth: NepseOfficialBreadth | null;
  summary: NepseOfficialBundle["summaryStats"] | null;
}> {
  const startedAt = new Date();
  const sb = createSyncServiceClient();
  try {
    invalidateOfficialLiveCache();
    const bundle = await fetchNepseOfficialBundle();
    seedOfficialLiveCache(bundle);
    rememberLastGood(bundle);
    if (sb) await persistOfficialMarketSnapshot(sb, bundle);
    lastPersistAt = Date.now();
    await logOfficialSync(
      sb,
      "ok",
      Object.keys(bundle.bySymbol).length,
      `Force sync ok — NEPSE ${bundle.index?.value ?? "n/a"} @ ${bundle.syncMeta.syncedAt}`,
      startedAt,
    );
    return {
      ok: true,
      status: "ok",
      lastSuccessfulSyncAt: bundle.syncMeta.syncedAt,
      indexValue: bundle.index?.value ?? null,
      message: `Synchronized from nepalstock.com.np at ${bundle.syncMeta.syncedAt}`,
      breadth: bundle.officialBreadth,
      summary: bundle.summaryStats,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Force sync failed";
    await logOfficialSync(sb, "error", 0, message, startedAt);
    const last = readProcessLastGood();
    return {
      ok: false,
      status: "error",
      lastSuccessfulSyncAt: last?.syncMeta.syncedAt ?? null,
      indexValue: last?.index?.value ?? null,
      message,
      breadth: last?.officialBreadth ?? null,
      summary: last?.summaryStats ?? null,
    };
  }
}

/** Cron helper: sync official live board and preserve a historical snapshot. */
export async function ingestOfficialLiveMarket(sb: SupabaseClient): Promise<{
  kind: "official_live";
  status: "ok" | "partial" | "error";
  items: number;
  message: string;
  lastSuccessfulSyncAt: string | null;
}> {
  const startedAt = new Date();
  try {
    invalidateOfficialLiveCache();
    const bundle = await fetchNepseOfficialBundle();
    seedOfficialLiveCache(bundle);
    rememberLastGood(bundle);
    await persistOfficialMarketSnapshot(sb, bundle);
    lastPersistAt = Date.now();
    const result = {
      kind: "official_live" as const,
      status: "ok" as const,
      items: Object.keys(bundle.bySymbol).length,
      message: `Official live sync — index ${bundle.index?.value ?? "n/a"}, turnover ${bundle.summaryStats.totalTurnoverNpr ?? "n/a"}`,
      lastSuccessfulSyncAt: bundle.syncMeta.syncedAt,
    };
    await logOfficialSync(sb, result.status, result.items, result.message, startedAt);
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Official live sync failed";
    const result = {
      kind: "official_live" as const,
      status: "error" as const,
      items: 0,
      message,
      lastSuccessfulSyncAt: readProcessLastGood()?.syncMeta.syncedAt ?? null,
    };
    await logOfficialSync(sb, result.status, result.items, result.message, startedAt);
    return result;
  }
}

export async function getLatestOfficialSyncInfo(sb: SupabaseClient): Promise<{
  latestSnapshot: PersistedSnapshotRow | null;
  latestRun: Record<string, unknown> | null;
}> {
  const [snap, run] = await Promise.all([
    sb
      .from("nepse_market_snapshots")
      .select(
        "synced_at,trade_date,is_market_open,market_as_of,generated_time,index_name,index_value,index_change_npr,index_change_pct,previous_close,total_turnover_npr,total_volume,total_trades,scrips_traded,advancing,declining,unchanged,upper_circuit,lower_circuit,payload_json",
      )
      .order("synced_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    sb
      .from("nepse_ingestion_runs")
      .select("*")
      .eq("kind", "official_live")
      .order("finished_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  return {
    latestSnapshot: (snap.data as PersistedSnapshotRow | null) ?? null,
    latestRun: (run.data as Record<string, unknown> | null) ?? null,
  };
}
