import { NextRequest, NextResponse } from "next/server";
import { createMemoryTtlCache } from "@/lib/api/memory-ttl-cache";
import { guardPublicApi } from "@/lib/api/public-api-guard";
import { buildMarketSnapshot } from "@/services/market/build-snapshot";
import { projectMarketSnapshot } from "@/services/market/project-market-snapshot";
import type { MarketSnapshot } from "@/types/market";

export const runtime = "nodejs";

const snapshotCache = createMemoryTtlCache();
const SNAPSHOT_TTL_MS = 45_000;
const inflight = new Map<string, Promise<MarketSnapshot>>();

/** Shared hub board — safe for CDN (no per-user symbol lists). */
const CACHE_HEADERS_PUBLIC_FULL = {
  "Cache-Control": "public, max-age=30, s-maxage=60, stale-while-revalidate=180",
} as const;

/**
 * Lite / personalized responses encode holdings in the query string.
 * Keep private so CDN does not store or share portfolio-shaped URLs.
 */
const CACHE_HEADERS_PRIVATE = {
  "Cache-Control": "private, max-age=20, stale-while-revalidate=40",
} as const;

const CORE_BUILD_KEY = "market-summary:board-full-core";

function parseList(raw: string | null): string[] {
  if (!raw) return [];
  return raw
    .split(/[,\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

async function getOrBuildSnapshot(buildKey: string, symbols: string[], crypto: string[]): Promise<MarketSnapshot> {
  const hit = snapshotCache.get<MarketSnapshot>(buildKey);
  if (hit) return hit;

  let pending = inflight.get(buildKey);
  if (!pending) {
    pending = buildMarketSnapshot({ extraSymbols: symbols, cryptoIds: crypto }).finally(() => {
      inflight.delete(buildKey);
    });
    inflight.set(buildKey, pending);
  }
  const snapshot = await pending;
  snapshotCache.set(buildKey, snapshot, SNAPSHOT_TTL_MS);
  return snapshot;
}

export async function GET(req: NextRequest) {
  const blocked = guardPublicApi(req, { keyPrefix: "market-summary", max: 60, botMax: 8 });
  if (blocked) return blocked;

  const boardParam = req.nextUrl.searchParams.get("board");
  const board: "full" | "lite" = boardParam === "0" || boardParam === "lite" ? "lite" : "full";
  const symbols = parseList(req.nextUrl.searchParams.get("symbols")).map((s) => s.toUpperCase());
  const crypto = parseList(req.nextUrl.searchParams.get("crypto")).map((s) => s.toLowerCase());
  const nepse = parseList(req.nextUrl.searchParams.get("nepse")).map((s) => s.toUpperCase());

  const hasPersonal = symbols.length > 0 || crypto.length > 0;
  const canUseSharedPublicFull = board === "full" && !hasPersonal;

  const buildKey = canUseSharedPublicFull
    ? CORE_BUILD_KEY
    : hasPersonal
      ? `market-summary:personal:${symbols.slice().sort().join(",")}|${crypto.slice().sort().join(",")}`
      : CORE_BUILD_KEY;

  const snapshot = await getOrBuildSnapshot(buildKey, symbols, crypto);
  const body = projectMarketSnapshot(snapshot, { board, nepseSymbols: nepse });
  const headers = canUseSharedPublicFull ? CACHE_HEADERS_PUBLIC_FULL : CACHE_HEADERS_PRIVATE;

  return NextResponse.json(body, { headers });
}
