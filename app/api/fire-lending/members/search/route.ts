import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { isP2PDiscoveryAuthorized } from "@/lib/fire-lending/p2p-member-privacy";
import {
  isP2PSearchQueryReady,
  matchStateForHits,
  normalizeP2PSearchQuery,
} from "@/lib/fire-lending/p2p-member-profile";
import { searchP2PMembers } from "@/lib/fire-lending/p2p-member-search-server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const NO_STORE = { "Cache-Control": "no-store" } as const;

export async function GET(req: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, error: "Service unavailable" }, { status: 503, headers: NO_STORE });
  }

  const sb = await createServerSupabaseClient();
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401, headers: NO_STORE });
  }

  if (!isP2PDiscoveryAuthorized({ authenticated: true })) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403, headers: NO_STORE });
  }

  const rl = checkRateLimit(req, {
    windowMs: 60_000,
    max: 30,
    keyPrefix: `p2p-member-search:${auth.user.id}`,
  });
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, error: "Too many requests", retryAfterSec: rl.retryAfterSec },
      { status: 429, headers: { ...NO_STORE, "Retry-After": String(rl.retryAfterSec) } },
    );
  }

  const query = normalizeP2PSearchQuery(req.nextUrl.searchParams.get("q") ?? "");
  const limitRaw = Number(req.nextUrl.searchParams.get("limit") ?? "8");
  const limit = Number.isFinite(limitRaw) ? Math.min(12, Math.max(1, Math.floor(limitRaw))) : 8;

  if (!isP2PSearchQueryReady(query)) {
    return NextResponse.json(
      { ok: true, query, matches: [], matchState: "empty_query" },
      { headers: NO_STORE },
    );
  }

  try {
    const matches = await searchP2PMembers(query, limit);
    return NextResponse.json(
      {
        ok: true,
        query,
        matches,
        matchState: matchStateForHits(query, matches.length),
      },
      { headers: NO_STORE },
    );
  } catch (e) {
    console.error("[p2p-member-search]", e);
    return NextResponse.json({ ok: false, error: "Search failed" }, { status: 500, headers: NO_STORE });
  }
}
