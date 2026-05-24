import { createMemoryTtlCache } from "@/lib/api/memory-ttl-cache";
import { fetchNepseYonepseBundle, type NepseBundle } from "@/services/market/nepse-yonepse";

const cache = createMemoryTtlCache();
const CACHE_KEY = "nepse-yonepse-bundle-v1";
/** Shared TTL keeps search + summary on one upstream pull per window (anti-spam). */
const DEFAULT_TTL_MS = 16_000;

/**
 * Process-local cached NEPSE mirror (Yonepse). Use from API routes and `buildMarketSnapshot`.
 */
export async function getCachedNepseYonepseBundle(ttlMs = DEFAULT_TTL_MS): Promise<NepseBundle> {
  const hit = cache.get<NepseBundle>(CACHE_KEY);
  if (hit) return hit;
  const bundle = await fetchNepseYonepseBundle();
  cache.set(CACHE_KEY, bundle, ttlMs);
  return bundle;
}
