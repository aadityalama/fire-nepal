/**
 * Official NEPSE synchronization: fetch one atomic validated snapshot → persist → serve.
 * Never fabricates market values. Never serves stale / mixed last-successful payloads
 * to the dashboard — a failed fetch rejects rather than displaying inconsistent data.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  fetchNepseOfficialBundle,
  getCachedNepseOfficialBundle,
  invalidateOfficialLiveCache,
  seedOfficialLiveCache,
  OFFICIAL_LIVE_TTL_MS,
  type NepseOfficialBreadth,
  type NepseOfficialBundle,
} from "@/services/market/nepse-official-live";

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
  source: "official";
  lastSuccessfulSyncAt: string | null;
  stale: false;
  error: string | null;
  snapshotId: string | null;
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

const PERSIST_MIN_INTERVAL_MS = 45_000;
let lastPersistAt = 0;

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
    // Table may not be applied yet in some environments — live serve still works.
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
 * Serve the latest atomic official snapshot only.
 * On failure: throw (do NOT fall back to stale last-successful cache).
 */
export async function getOfficialNepseLiveBundle(options?: {
  ttlMs?: number;
  force?: boolean;
}): Promise<NepseLiveServeResult> {
  const ttlMs = options?.ttlMs ?? OFFICIAL_LIVE_TTL_MS;
  if (options?.force) invalidateOfficialLiveCache();
  const bundle = options?.force
    ? await fetchNepseOfficialBundle()
    : await getCachedNepseOfficialBundle(ttlMs);
  if (options?.force) seedOfficialLiveCache(bundle, ttlMs);

  void maybePersist(bundle);
  return {
    bundle,
    meta: {
      source: "official",
      lastSuccessfulSyncAt: bundle.syncMeta.syncedAt,
      stale: false,
      error: null,
      snapshotId: bundle.syncMeta.snapshotId,
    },
  };
}

/** Admin / cron force sync against the official NEPSE website. */
export async function forceSyncOfficialNepseMarket(): Promise<{
  ok: boolean;
  status: "ok" | "error";
  lastSuccessfulSyncAt: string | null;
  indexValue: number | null;
  pointChange: number | null;
  percentageChange: number | null;
  previousClose: number | null;
  message: string;
  breadth: NepseOfficialBreadth | null;
  summary: NepseOfficialBundle["summaryStats"] | null;
  snapshotId: string | null;
}> {
  const startedAt = new Date();
  const sb = createSyncServiceClient();
  try {
    invalidateOfficialLiveCache();
    const bundle = await fetchNepseOfficialBundle();
    seedOfficialLiveCache(bundle);
    if (sb) await persistOfficialMarketSnapshot(sb, bundle);
    lastPersistAt = Date.now();
    await logOfficialSync(
      sb,
      "ok",
      Object.keys(bundle.bySymbol).length,
      `Force sync ok — NEPSE ${bundle.index?.value ?? "n/a"} Δ${bundle.index?.changeNpr ?? "n/a"} @ ${bundle.syncMeta.syncedAt}`,
      startedAt,
    );
    return {
      ok: true,
      status: "ok",
      lastSuccessfulSyncAt: bundle.syncMeta.syncedAt,
      indexValue: bundle.index?.value ?? null,
      pointChange: bundle.index?.changeNpr ?? null,
      percentageChange: bundle.index?.changePct ?? null,
      previousClose: bundle.index?.previousClose ?? null,
      message: `Synchronized atomic official snapshot ${bundle.syncMeta.snapshotId}`,
      breadth: bundle.officialBreadth,
      summary: bundle.summaryStats,
      snapshotId: bundle.syncMeta.snapshotId,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Force sync failed";
    await logOfficialSync(sb, "error", 0, message, startedAt);
    return {
      ok: false,
      status: "error",
      lastSuccessfulSyncAt: null,
      indexValue: null,
      pointChange: null,
      percentageChange: null,
      previousClose: null,
      message,
      breadth: null,
      summary: null,
      snapshotId: null,
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
    await persistOfficialMarketSnapshot(sb, bundle);
    lastPersistAt = Date.now();
    const result = {
      kind: "official_live" as const,
      status: "ok" as const,
      items: Object.keys(bundle.bySymbol).length,
      message: `Official atomic sync — index ${bundle.index?.value ?? "n/a"}, change ${bundle.index?.changeNpr ?? "n/a"}, turnover ${bundle.summaryStats.totalTurnoverNpr ?? "n/a"}`,
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
      lastSuccessfulSyncAt: null,
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
