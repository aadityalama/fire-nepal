import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { buildMarketSnapshot } from "@/services/market/build-snapshot";

export const runtime = "nodejs";

const LIVE_NO_STORE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
} as const;

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

  const snapshot = await buildMarketSnapshot({ extraSymbols: symbols, cryptoIds: crypto });

  return NextResponse.json(snapshot, {
    headers: LIVE_NO_STORE_HEADERS,
  });
}
