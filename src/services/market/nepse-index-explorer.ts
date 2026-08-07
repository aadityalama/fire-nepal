import "server-only";

import { createMemoryTtlCache } from "@/lib/api/memory-ttl-cache";
import {
  listOfficialNepseMarketIndices,
  type NepseMarketIndexOption,
} from "@/lib/market/nepse-market-indices";
import { indexKeyFromName } from "@/services/market/nepse-index-eod";
import { getIndexComposition, ingestIndexComposition } from "@/services/market/nepse-index-composition";
import { createMarketDataServiceClient } from "@/services/market/nepse-market-data-engine";
import { getCachedNepseYonepseBoard } from "@/services/market/nepse-yonepse";
import type { IndexExplorerCard, IndexExplorerPayload, IndexExplorerTrend } from "@/types/market/nepse-index-explorer";

const cache = createMemoryTtlCache();
const EXPLORER_TTL_MS = 20_000;

/** Official NEPSE indices shown in the Index Explorer (excludes All Listed). */
export const NEPSE_OFFICIAL_EXPLORER_INDICES: NepseMarketIndexOption[] = listOfficialNepseMarketIndices();

function trendFromChange(changePct: number | null): IndexExplorerTrend {
  if (changePct == null || !Number.isFinite(changePct)) return "unknown";
  if (changePct > 0.005) return "up";
  if (changePct < -0.005) return "down";
  return "flat";
}

function normalizeIndexLabel(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/sub[\s-]?index/g, "index")
    .replace(/ind\.?/g, "index")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Map a live/EOD index name onto an official explorer key. */
export function matchOfficialIndexKey(name: string): string | null {
  const fromHelper = indexKeyFromName(name);
  if (NEPSE_OFFICIAL_EXPLORER_INDICES.some((row) => row.key === fromHelper)) return fromHelper;

  const needle = normalizeIndexLabel(name);
  for (const option of NEPSE_OFFICIAL_EXPLORER_INDICES) {
    if (normalizeIndexLabel(option.displayName) === needle) return option.key;
    if (option.sectorNames.some((sector) => normalizeIndexLabel(sector) === needle)) return option.key;
  }

  // Loose contains for Banking / Hydro / Hotels naming variants.
  for (const option of NEPSE_OFFICIAL_EXPLORER_INDICES) {
    const display = normalizeIndexLabel(option.displayName.replace(/ index$/i, ""));
    if (display && (needle.includes(display) || display.includes(needle))) return option.key;
  }
  return null;
}

type EodCloseRow = {
  index_key: string;
  close_value: number;
  change_pct: number | null;
  previous_close: number | null;
  trade_date: string;
};

async function loadLatestIndexEod(): Promise<Map<string, EodCloseRow>> {
  const sb = createMarketDataServiceClient();
  const out = new Map<string, EodCloseRow>();
  if (!sb) return out;

  const { data, error } = await sb
    .from("nepse_index_eod")
    .select("index_key,close_value,change_pct,previous_close,trade_date")
    .order("trade_date", { ascending: false })
    .limit(400);
  if (error) return out;

  for (const row of (data as EodCloseRow[] | null) ?? []) {
    const key = String(row.index_key ?? "").toUpperCase();
    if (!key || out.has(key)) continue;
    out.set(key, {
      index_key: key,
      close_value: Number(row.close_value),
      change_pct: row.change_pct == null ? null : Number(row.change_pct),
      previous_close: row.previous_close == null ? null : Number(row.previous_close),
      trade_date: String(row.trade_date),
    });
  }
  return out;
}

async function ensureCompositionWarm(): Promise<void> {
  const sb = createMarketDataServiceClient();
  if (!sb) return;
  // Sample one sector index — if empty, rebuild all membership from Company Master / NEPSE.
  const sample = await getIndexComposition("COMMERCIAL_BANKS");
  if (sample.companyCount === 0) {
    try {
      await ingestIndexComposition(sb);
    } catch {
      /* keep empty; UI shows 0 */
    }
  }
}

/**
 * Build the Index Explorer board: every official NEPSE index with live/EOD levels
 * and Company Master–backed constituent counts.
 */
export async function loadIndexExplorer(): Promise<IndexExplorerPayload> {
  const cacheKey = "nepse-index-explorer-v1";
  const hit = cache.get<IndexExplorerPayload>(cacheKey);
  if (hit) return hit;

  await ensureCompositionWarm();

  const [board, eodByKey, compositions] = await Promise.all([
    getCachedNepseYonepseBoard().catch(() => null),
    loadLatestIndexEod(),
    Promise.all(
      NEPSE_OFFICIAL_EXPLORER_INDICES.map(async (option) => {
        const composition = await getIndexComposition(option.key);
        return [option.key, composition] as const;
      }),
    ),
  ]);

  const compositionByKey = new Map(compositions);
  const feedByKey = new Map<string, { value: number | null; changePct: number | null; changeNpr: number | null }>();
  for (const row of board?.indices ?? []) {
    const key = matchOfficialIndexKey(row.name);
    if (!key || feedByKey.has(key)) continue;
    feedByKey.set(key, {
      value: row.value,
      changePct: row.changePct,
      changeNpr: row.changeNpr,
    });
  }

  const bySymbol = board?.bySymbol ?? {};
  const sources: string[] = [];
  if (board?.indices?.length) sources.push("Yonepse indices");
  if (Object.keys(bySymbol).length) sources.push("Yonepse live board");
  if (eodByKey.size) sources.push("nepse_index_eod");
  sources.push("nepse_index_constituents");
  sources.push("nepalstock:company-master");

  const indices: IndexExplorerCard[] = NEPSE_OFFICIAL_EXPLORER_INDICES.map((option) => {
    const composition = compositionByKey.get(option.key);
    const feed = feedByKey.get(option.key);
    const eod = eodByKey.get(option.key);

    let value: number | null = null;
    let change: number | null = null;
    let changePct: number | null = null;
    let valueSource: IndexExplorerCard["valueSource"] = "unavailable";
    let lastUpdated: string | null = composition?.lastUpdated ?? board?.marketStatus.checkedAt ?? null;

    if (feed?.value != null && Number.isFinite(feed.value)) {
      value = feed.value;
      changePct = feed.changePct;
      change = feed.changeNpr;
      if (change == null && changePct != null && value != null) {
        const prev = value / (1 + changePct / 100);
        if (Number.isFinite(prev) && prev > 0) change = value - prev;
      }
      valueSource = "index_feed";
    } else if (eod && Number.isFinite(eod.close_value)) {
      value = eod.close_value;
      changePct = eod.change_pct;
      if (eod.previous_close != null && Number.isFinite(eod.previous_close)) {
        change = eod.close_value - eod.previous_close;
      } else if (changePct != null && value != null) {
        const prev = value / (1 + changePct / 100);
        if (Number.isFinite(prev) && prev > 0) change = value - prev;
      }
      valueSource = "index_eod";
      lastUpdated = eod.trade_date ? `${eod.trade_date}T00:00:00+05:45` : lastUpdated;
    } else {
      // Sector pulse from live constituents when official level is unpublished.
      const symbols = composition?.symbols ?? [];
      let weighted = 0;
      let weight = 0;
      for (const symbol of symbols) {
        const tick = bySymbol[symbol];
        if (!tick || tick.changePct == null || !Number.isFinite(tick.changePct)) continue;
        const w = Math.max(1, tick.turnoverNpr ?? 1);
        weighted += tick.changePct * w;
        weight += w;
      }
      if (weight > 0) {
        changePct = weighted / weight;
        valueSource = "sector_pulse";
        lastUpdated = board?.marketStatus.checkedAt ?? lastUpdated;
      }
    }

    return {
      indexKey: option.key,
      displayName: option.displayName,
      nepseId: option.nepseId,
      value,
      change,
      changePct,
      trend: trendFromChange(changePct),
      lastUpdated,
      companyCount: composition?.companyCount ?? 0,
      membershipSource: composition?.membershipSource ?? "unavailable",
      valueSource,
    };
  });

  const payload: IndexExplorerPayload = {
    indices,
    loadedAt: new Date().toISOString(),
    sources,
  };
  cache.set(cacheKey, payload, EXPLORER_TTL_MS);
  return payload;
}
