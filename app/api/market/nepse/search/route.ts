import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { getCachedNepseYonepseBundle } from "@/services/market/nepse-bundle-cache";
import { filterNepseDirectory } from "@/services/market/nepse-search-filter";

export const runtime = "nodejs";

const HEADERS = {
  "Cache-Control": "private, max-age=12, stale-while-revalidate=24",
} as const;

export async function GET(req: NextRequest) {
  const rl = checkRateLimit(req, { windowMs: 60_000, max: 90, keyPrefix: "nepse-search" });
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many requests", retryAfterSec: rl.retryAfterSec },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }

  const q = req.nextUrl.searchParams.get("q") ?? "";
  const limitRaw = Number(req.nextUrl.searchParams.get("limit") ?? "24");
  const limit = Number.isFinite(limitRaw) ? Math.min(60, Math.max(1, Math.floor(limitRaw))) : 24;

  const bundle = await getCachedNepseYonepseBundle();
  const hits = filterNepseDirectory(bundle.bySymbol, q, limit);

  return NextResponse.json({ hits, fetchedAt: new Date().toISOString() }, { headers: HEADERS });
}
