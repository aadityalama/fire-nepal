import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import type { NepalEconomyDashboardData } from "@/types/nepal-economy";

const CACHE_DIR = path.join(process.cwd(), ".cache");
const CACHE_FILE = path.join(CACHE_DIR, "nepal-economy-dashboard.json");
const CACHE_TTL_MS = 15 * 60 * 1000;

type CacheEnvelope = {
  savedAt: string;
  payload: NepalEconomyDashboardData;
};

let memoryCache: CacheEnvelope | null = null;

export async function readDashboardCache(): Promise<NepalEconomyDashboardData | null> {
  if (memoryCache) return memoryCache.payload;

  try {
    const raw = await readFile(CACHE_FILE, "utf8");
    const envelope = JSON.parse(raw) as CacheEnvelope;
    memoryCache = envelope;
    return envelope.payload;
  } catch {
    return null;
  }
}

export async function writeDashboardCache(payload: NepalEconomyDashboardData) {
  const envelope: CacheEnvelope = { savedAt: new Date().toISOString(), payload };
  memoryCache = envelope;
  await mkdir(CACHE_DIR, { recursive: true });
  await writeFile(CACHE_FILE, JSON.stringify(envelope, null, 2), "utf8");
}

export function isCacheFresh(savedAt: string | undefined, ttlMs = CACHE_TTL_MS) {
  if (!savedAt) return false;
  const age = Date.now() - new Date(savedAt).getTime();
  return age >= 0 && age < ttlMs;
}

export function getCacheFilePath() {
  return CACHE_FILE;
}
