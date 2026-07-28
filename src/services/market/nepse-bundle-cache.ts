import { createMemoryTtlCache } from "@/lib/api/memory-ttl-cache";
import {
  getOfficialNepseLiveBundle,
  type NepseLiveServeMeta,
} from "@/services/market/nepse-official-sync";
import { OFFICIAL_LIVE_TTL_MS } from "@/services/market/nepse-official-live";
import type { NepseOfficialBundle } from "@/services/market/nepse-official-live";

const metaCache = createMemoryTtlCache();
const META_KEY = "nepse-official-serve-meta-v1";

/**
 * Process-local short-TTL hold of the latest atomic official NEPSE snapshot.
 * Source of truth: nepalstock.com.np. Does not serve stale last-successful payloads.
 */
export async function getCachedNepseYonepseBundle(ttlMs = OFFICIAL_LIVE_TTL_MS): Promise<NepseOfficialBundle> {
  const served = await getOfficialNepseLiveBundle({ ttlMs });
  metaCache.set(META_KEY, served.meta, Math.max(ttlMs, 60_000));
  return served.bundle;
}

/** @deprecated Alias retained for call-sites; returns official NEPSE live bundle. */
export const getCachedNepseOfficialMarketBundle = getCachedNepseYonepseBundle;

export function getLastNepseServeMeta(): NepseLiveServeMeta | null {
  return metaCache.get<NepseLiveServeMeta>(META_KEY) ?? null;
}

export async function getOfficialNepseBundleWithMeta(ttlMs = OFFICIAL_LIVE_TTL_MS): Promise<{
  bundle: NepseOfficialBundle;
  meta: NepseLiveServeMeta;
}> {
  const served = await getOfficialNepseLiveBundle({ ttlMs });
  metaCache.set(META_KEY, served.meta, Math.max(ttlMs, 60_000));
  return served;
}
