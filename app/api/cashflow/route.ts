import { NextResponse } from "next/server";
import { sanitizeCashflowState } from "@/components/cashflow/cashflow-storage";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { loadCashflowFromSupabase, saveCashflowToSupabase } from "@/services/cashflow-supabase";

function bad(msg: string, status = 400) {
  return NextResponse.json({ ok: false, error: msg }, { status });
}

export async function GET() {
  if (!isSupabaseConfigured()) return bad("Supabase is not configured", 503);
  try {
    const sb = await createServerSupabaseClient();
    const { data } = await sb.auth.getUser();
    if (!data.user) return bad("Unauthorized", 401);

    const snapshot = await loadCashflowFromSupabase(sb, data.user.id);
    return NextResponse.json({ ok: true, snapshot });
  } catch (e) {
    return bad(e instanceof Error ? e.message : "Server error", 500);
  }
}

export async function PUT(req: Request) {
  if (!isSupabaseConfigured()) return bad("Supabase is not configured", 503);

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return bad("Invalid JSON");
  }

  try {
    const sb = await createServerSupabaseClient();
    const { data } = await sb.auth.getUser();
    if (!data.user) return bad("Unauthorized", 401);

    const state = sanitizeCashflowState((raw as { state?: unknown })?.state);
    const result = await saveCashflowToSupabase(sb, data.user.id, state);
    if (!result.ok) return bad(result.error, 500);
    return NextResponse.json({ ok: true, updatedAt: result.updatedAt });
  } catch (e) {
    return bad(e instanceof Error ? e.message : "Server error", 500);
  }
}
