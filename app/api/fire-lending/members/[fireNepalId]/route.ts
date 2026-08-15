import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { isP2PDiscoveryAuthorized } from "@/lib/fire-lending/p2p-member-privacy";
import { getP2PLendingProfile } from "@/lib/fire-lending/p2p-member-search-server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const NO_STORE = { "Cache-Control": "no-store" } as const;
const FIRE_ID_RE = /^FN-[\d-]{3,20}$/i;

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ fireNepalId: string }> },
) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { ok: false, error: "Service unavailable", code: "unauthorized" },
      { status: 503, headers: NO_STORE },
    );
  }

  const sb = await createServerSupabaseClient();
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized", code: "unauthorized" },
      { status: 401, headers: NO_STORE },
    );
  }

  if (!isP2PDiscoveryAuthorized({ authenticated: true })) {
    return NextResponse.json(
      { ok: false, error: "Forbidden", code: "forbidden" },
      { status: 403, headers: NO_STORE },
    );
  }

  const rl = checkRateLimit(req, {
    windowMs: 60_000,
    max: 40,
    keyPrefix: `p2p-member-profile:${auth.user.id}`,
  });
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, error: "Too many requests", code: "rate_limited", retryAfterSec: rl.retryAfterSec },
      { status: 429, headers: { ...NO_STORE, "Retry-After": String(rl.retryAfterSec) } },
    );
  }

  const { fireNepalId: raw } = await ctx.params;
  const fireNepalId = decodeURIComponent(raw ?? "").trim().toUpperCase();
  if (!FIRE_ID_RE.test(fireNepalId)) {
    return NextResponse.json(
      { ok: false, error: "Invalid FIRE Nepal ID", code: "not_found" },
      { status: 400, headers: NO_STORE },
    );
  }

  try {
    const profile = await getP2PLendingProfile(fireNepalId);
    if (!profile) {
      return NextResponse.json(
        { ok: false, error: "Member not found or not available for P2P discovery", code: "not_found" },
        { status: 404, headers: NO_STORE },
      );
    }
    return NextResponse.json({ ok: true, profile }, { headers: NO_STORE });
  } catch (e) {
    console.error("[p2p-member-profile]", e);
    return NextResponse.json({ ok: false, error: "Profile lookup failed" }, { status: 500, headers: NO_STORE });
  }
}
