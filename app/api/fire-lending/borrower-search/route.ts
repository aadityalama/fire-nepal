import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { searchBorrowerMembers } from "@/lib/fire-lending/search-borrower-members";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Authenticated borrower search against public.user_profiles.
 * Uses the signed-in user session to exclude self, then prefers the
 * search_fire_nepal_members RPC (or service-role fallback).
 */
export async function GET(req: NextRequest) {
  const rl = checkRateLimit(req, { windowMs: 60_000, max: 60, keyPrefix: "borrower-search" });
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many requests", retryAfterSec: rl.retryAfterSec, members: [] },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ members: [], error: "Supabase is not configured" }, { status: 503 });
  }

  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  if (q.length < 2) {
    return NextResponse.json({ members: [] });
  }

  const limitRaw = Number(req.nextUrl.searchParams.get("limit") ?? "12");
  const limit = Number.isFinite(limitRaw) ? Math.min(24, Math.max(1, Math.floor(limitRaw))) : 12;

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user?.id) {
    return NextResponse.json({ error: "Unauthorized", members: [] }, { status: 401 });
  }

  // Prefer service role so search works even before the RPC migration is applied
  // (RLS is self-only on user_profiles). Still excludes the authenticated caller.
  const admin = createSupabaseServiceRoleClient();
  const client = admin ?? supabase;

  const { members, error } = await searchBorrowerMembers(client, {
    query: q,
    excludeUserId: user.id,
    limit,
  });

  if (error) {
    return NextResponse.json({ members: [], error }, { status: 502 });
  }

  return NextResponse.json({ members });
}
