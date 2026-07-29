/**
 * Official NEPSE synchronization: fetch one atomic validated closing snapshot → persist → serve.
 * Stores at most one official snapshot per Kathmandu trading day.
 * On fetch failure, continues serving the latest previously stored valid snapshot.
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

export function kathmanduTradeDate(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kathmandu" }).format(now);
}

export type NepseLiveServeMeta = {
  source: "official";
  lastSuccessfulSyncAt: string | null;
  stale: boolean;
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

function isValidOfficialBundle(value: unknown): value is NepseOfficialBundle {
  if (!value || typeof value !== "object") return false;
  const bundle = value as Partial<NepseOfficialBundle>;
  return Boolean(
    bundle.syncMeta &&
      typeof bundle.syncMeta.syncedAt === "string" &&
      bundle.index &&
      typeof bundle.index.value === "number" &&
      bundle.bySymbol &&
      typeof bundle.bySymbol === "object" &&
      bundle.summaryStats &&
      bundle.officialBreadth,
  );
}

export async function findOfficialSnapshotForTradeDate(
  sb: SupabaseClient,
  tradeDate: string,
): Promise<PersistedSnapshotRow | null> {
  const { data, error } = await sb
    .from("nepse_market_snapshots")
    .select(
      "synced_at,trade_date,is_market_open,market_as_of,generated_time,index_name,index_value,index_change_npr,index_change_pct,previous_close,total_turnover_npr,total_volume,total_trades,scrips_traded,advancing,declining,unchanged,upper_circuit,lower_circuit,payload_json",
    )
    .eq("trade_date", tradeDate)
    .eq("source", "official")
    .order("synced_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error("[nepse-official-sync] trade-date lookup failed:", error.message);
    return null;
  }
  return (data as PersistedSnapshotRow | null) ?? null;
}

export async function loadLatestOfficialSnapshotBundle(
  sb: SupabaseClient,
): Promise<{ bundle: NepseOfficialBundle; row: PersistedSnapshotRow } | null> {
  const { data, error } = await sb
    .from("nepse_market_snapshots")
    .select(
      "synced_at,trade_date,is_market_open,market_as_of,generated_time,index_name,index_value,index_change_npr,index_change_pct,previous_close,total_turnover_npr,total_volume,total_trades,scrips_traded,advancing,declining,unchanged,upper_circuit,lower_circuit,payload_json",
    )
    .eq("source", "official")
    .order("synced_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error("[nepse-official-sync] latest snapshot load failed:", error.message);
    return null;
  }
  const row = (data as PersistedSnapshotRow | null) ?? null;
  if (!row || !isValidOfficialBundle(row.payload_json)) return null;
  return { bundle: row.payload_json, row };
}

export async function persistOfficialMarketSnapshot(
  sb: SupabaseClient,
  bundle: NepseOfficialBundle,
): Promise<"inserted" | "skipped" | "failed"> {
  const tradeDate = kathmanduTradeDate(new Date(bundle.syncMeta.syncedAt));
  const existing = await findOfficialSnapshotForTradeDate(sb, tradeDate);
  if (existing) {
    console.info(
      `[nepse-official-sync] skip persist — official snapshot already exists for ${tradeDate} (${existing.synced_at})`,
    );
    return "skipped";
  }

  const row = {
    synced_at: bundle.syncMeta.syncedAt,
    trade_date: tradeDate,
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
    console.error("[nepse-official-sync] persist failed:", error.message);
    return "failed";
  }
  return "inserted";
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
 * Serve the latest atomic official snapshot.
 * Prefer a fresh validated fetch; on failure, serve the latest stored closing snapshot.
 */
export async function getOfficialNepseLiveBundle(options?: {
  ttlMs?: number;
  force?: boolean;
}): Promise<NepseLiveServeResult> {
  const ttlMs = options?.ttlMs ?? OFFICIAL_LIVE_TTL_MS;
  if (options?.force) invalidateOfficialLiveCache();

  try {
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
  } catch (error) {
    const message = error instanceof Error ? error.message : "Official NEPSE fetch failed";
    console.error("[nepse-official-sync] live fetch failed; serving stored snapshot if available:", message);
    const sb = createSyncServiceClient();
    if (sb) {
      const stored = await loadLatestOfficialSnapshotBundle(sb);
      if (stored) {
        seedOfficialLiveCache(stored.bundle, Math.max(ttlMs, 60_000));
        return {
          bundle: stored.bundle,
          meta: {
            source: "official",
            lastSuccessfulSyncAt: stored.bundle.syncMeta.syncedAt,
            stale: true,
            error: message,
            snapshotId: stored.bundle.syncMeta.snapshotId,
          },
        };
      }
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
    const persistStatus = sb ? await persistOfficialMarketSnapshot(sb, bundle) : "skipped";
    lastPersistAt = Date.now();
    await logOfficialSync(
      sb,
      "ok",
      Object.keys(bundle.bySymbol).length,
      `Force sync ok (${persistStatus}) — NEPSE ${bundle.index?.value ?? "n/a"} Δ${bundle.index?.changeNpr ?? "n/a"} @ ${bundle.syncMeta.syncedAt}`,
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
      message:
        persistStatus === "skipped"
          ? `Official snapshot already stored for ${kathmanduTradeDate()}; serving latest atomic fetch without duplicate persist`
          : `Synchronized atomic official snapshot ${bundle.syncMeta.snapshotId}`,
      breadth: bundle.officialBreadth,
      summary: bundle.summaryStats,
      snapshotId: bundle.syncMeta.snapshotId,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Force sync failed";
    console.error("[nepse-official-sync] force sync failed:", message);
    const stored = sb ? await loadLatestOfficialSnapshotBundle(sb) : null;
    if (stored) seedOfficialLiveCache(stored.bundle);
    await logOfficialSync(sb, "error", 0, message, startedAt);
    return {
      ok: false,
      status: "error",
      lastSuccessfulSyncAt: stored?.bundle.syncMeta.syncedAt ?? null,
      indexValue: stored?.bundle.index?.value ?? null,
      pointChange: stored?.bundle.index?.changeNpr ?? null,
      percentageChange: stored?.bundle.index?.changePct ?? null,
      previousClose: stored?.bundle.index?.previousClose ?? null,
      message: stored
        ? `${message} — continued serving stored snapshot from ${stored.row.trade_date}`
        : message,
      breadth: stored?.bundle.officialBreadth ?? null,
      summary: stored?.bundle.summaryStats ?? null,
      snapshotId: stored?.bundle.syncMeta.snapshotId ?? null,
    };
  }
}

/** Cron helper: capture one official closing snapshot per Kathmandu trading day. */
export async function ingestOfficialLiveMarket(sb: SupabaseClient): Promise<{
  kind: "official_live";
  status: "ok" | "partial" | "error";
  items: number;
  message: string;
  lastSuccessfulSyncAt: string | null;
  skipped?: boolean;
}> {
  const startedAt = new Date();
  const tradeDate = kathmanduTradeDate(startedAt);

  const existing = await findOfficialSnapshotForTradeDate(sb, tradeDate);
  if (existing && isValidOfficialBundle(existing.payload_json)) {
    seedOfficialLiveCache(existing.payload_json);
    const result = {
      kind: "official_live" as const,
      status: "ok" as const,
      items: Object.keys(existing.payload_json.bySymbol).length,
      message: `Skipped — official closing snapshot already stored for ${tradeDate}`,
      lastSuccessfulSyncAt: existing.payload_json.syncMeta.syncedAt,
      skipped: true,
    };
    await logOfficialSync(sb, result.status, result.items, result.message, startedAt);
    return result;
  }

  try {
    invalidateOfficialLiveCache();
    const bundle = await fetchNepseOfficialBundle();
    seedOfficialLiveCache(bundle);
    const persistStatus = await persistOfficialMarketSnapshot(sb, bundle);
    lastPersistAt = Date.now();
    const result = {
      kind: "official_live" as const,
      status: "ok" as const,
      items: Object.keys(bundle.bySymbol).length,
      message:
        persistStatus === "skipped"
          ? `Official sync fetched for ${tradeDate} but snapshot already existed — duplicate insert skipped`
          : `Official closing snapshot saved for ${tradeDate} — index ${bundle.index?.value ?? "n/a"}, change ${bundle.index?.changeNpr ?? "n/a"}`,
      lastSuccessfulSyncAt: bundle.syncMeta.syncedAt,
      skipped: persistStatus === "skipped",
    };
    await logOfficialSync(sb, result.status, result.items, result.message, startedAt);
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Official live sync failed";
    console.error("[nepse-official-sync] closing snapshot sync failed:", message);
    const stored = await loadLatestOfficialSnapshotBundle(sb);
    if (stored) {
      seedOfficialLiveCache(stored.bundle);
      const result = {
        kind: "official_live" as const,
        status: "partial" as const,
        items: Object.keys(stored.bundle.bySymbol).length,
        message: `${message} — kept serving previous valid snapshot from ${stored.row.trade_date}`,
        lastSuccessfulSyncAt: stored.bundle.syncMeta.syncedAt,
        skipped: false,
      };
      await logOfficialSync(sb, result.status, result.items, result.message, startedAt);
      return result;
    }
    const result = {
      kind: "official_live" as const,
      status: "error" as const,
      items: 0,
      message,
      lastSuccessfulSyncAt: null,
      skipped: false,
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
