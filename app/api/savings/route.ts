import { NextResponse } from "next/server";
import { sanitizeSavingsWorkspaceState } from "@/lib/savings/savings-storage";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { loadSavingsWorkspaceForUser, saveSavingsWorkspaceForUser } from "@/services/savings-supabase";

function bad(msg: string, status = 400) {
  return NextResponse.json({ ok: false, error: msg }, { status });
}

export async function GET() {
  if (!isSupabaseConfigured()) return bad("Supabase is not configured", 503);
  try {
    const sb = await createServerSupabaseClient();
    const { data } = await sb.auth.getUser();
    if (!data.user) return bad("Please sign in to view your savings workspace.", 401);

    const snapshot = await loadSavingsWorkspaceForUser(sb, data.user.id);
    return NextResponse.json({ ok: true, snapshot });
  } catch (e) {
    return bad(e instanceof Error ? e.message : "Could not load savings workspace.", 500);
  }
}

export async function PUT(req: Request) {
  if (!isSupabaseConfigured()) return bad("Supabase is not configured", 503);
  try {
    const sb = await createServerSupabaseClient();
    const { data } = await sb.auth.getUser();
    if (!data.user) return bad("Please sign in to save your savings workspace.", 401);

    const body = await req.json();
    const state = sanitizeSavingsWorkspaceState((body as { state?: unknown })?.state);
    const snapshot = await saveSavingsWorkspaceForUser(sb, data.user.id, state);
    return NextResponse.json({ ok: true, snapshot });
  } catch (e) {
    return bad(e instanceof Error ? e.message : "Could not save savings workspace.", 500);
  }
}
