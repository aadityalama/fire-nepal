import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { createMemoryTtlCache } from "@/lib/api/memory-ttl-cache";
import { buildMarketSnapshot } from "@/services/market/build-snapshot";

export const runtime = "nodejs";

const snapshotCache = createMemoryTtlCache();
const SNAPSHOT_TTL_MS = 25_000;
const inflight = new Map<string, Promise<Awaited<ReturnType<typeof buildMarketSnapshot>>>>();

const CACHE_HEADERS = {
  "Cache-Control": "public, max-age=15, s-maxage=25, stale-while-revalidate=60",
} as const;

function cacheKey(symbols: string[], crypto: string[]): string {
  return `market-summary:${symbols.slice().sort().join(",")}|${crypto.slice().sort().join(",")}`;
}

export async function GET(req: NextRequest) {
  const rl = checkRateLimit(req, { windowMs: 60_000, max: 45, keyPrefix: "market-summary" });
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many requests", retryAfterSec: rl.retryAfterSec } satisfies { error: string; retryAfterSec: number },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }

  const symbols =
    req.nextUrl.searchParams
      .get("symbols")
      ?.split(/[,\s]+/)
      .map((s) => s.trim())
      .filter(Boolean) ?? [];
  const crypto =
    req.nextUrl.searchParams
      .get("crypto")
      ?.split(/[,\s]+/)
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean) ?? [];

  const key = cacheKey(symbols, crypto);
  const hit = snapshotCache.get<Awaited<ReturnType<typeof buildMarketSnapshot>>>(key);
  if (hit) {
    return NextResponse.json(hit, { headers: CACHE_HEADERS });
  }

  let pending = inflight.get(key);
  if (!pending) {
    pending = buildMarketSnapshot({ extraSymbols: symbols, cryptoIds: crypto }).finally(() => {
      inflight.delete(key);
    });
    inflight.set(key, pending);
  }
  const snapshot = await pending;
  snapshotCache.set(key, snapshot, SNAPSHOT_TTL_MS);

  return NextResponse.json(snapshot, {
    headers: CACHE_HEADERS,
  });
}
