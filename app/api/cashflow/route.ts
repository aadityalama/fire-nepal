import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { sanitizeCashflowState } from "@/components/cashflow/cashflow-storage";
import { getSupabaseAnonKey, getSupabaseUrl, isSupabaseConfigured } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ensureCashflowSnapshotsSchema } from "@/services/ensure-cashflow-schema";
import {
  isMissingCashflowTableError,
  loadCashflowFromSupabase,
  saveCashflowToSupabase,
} from "@/services/cashflow-supabase";
import type { Database } from "@/types/supabase-database";

function bad(msg: string, status = 400) {
  return NextResponse.json({ ok: false, error: msg }, { status });
}

async function resolveAuthedClient(req: Request): Promise<{
  client: SupabaseClient<Database>;
  user: User | null;
}> {
  const auth = req.headers.get("authorization") ?? "";
  if (auth.toLowerCase().startsWith("bearer ")) {
    const client = createClient<Database>(getSupabaseUrl(), getSupabaseAnonKey(), {
      global: { headers: { Authorization: auth } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data } = await client.auth.getUser();
    return { client, user: data.user };
  }

  const client = await createServerSupabaseClient();
  const { data } = await client.auth.getUser();
  return { client, user: data.user };
}

export async function GET(req: Request) {
  if (!isSupabaseConfigured()) return bad("Supabase is not configured", 503);
  try {
    const { client, user } = await resolveAuthedClient(req);
    if (!user) return bad("Unauthorized", 401);

    const snapshot = await loadCashflowFromSupabase(client, user.id);
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
    const { client, user } = await resolveAuthedClient(req);
    if (!user) return bad("Unauthorized", 401);

    const state = sanitizeCashflowState((raw as { state?: unknown })?.state);
    let result = await saveCashflowToSupabase(client, user.id, state);

    if (!result.ok && isMissingCashflowTableError({ message: result.error })) {
      const ensure = await ensureCashflowSnapshotsSchema();
      if (ensure.ok) {
        result = await saveCashflowToSupabase(client, user.id, state);
      }
    }

    if (!result.ok) return bad(result.error, 500);
    return NextResponse.json({ ok: true, updatedAt: result.updatedAt });
  } catch (e) {
    return bad(e instanceof Error ? e.message : "Server error", 500);
  }
}
