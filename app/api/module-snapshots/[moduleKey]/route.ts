import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { isModuleSnapshotKey, type ModuleSnapshotKey } from "@/lib/module-snapshots/keys";
import { getSupabaseAnonKey, getSupabaseUrl, isSupabaseConfigured } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { loadModuleSnapshot, saveModuleSnapshot } from "@/services/module-snapshots-supabase";
import type { Database } from "@/types/supabase-database";

/** Private browser cache — user-specific; short TTL cuts Fluid Active CPU on remount storms. */
const GET_CACHE_HEADERS = {
  "Cache-Control": "private, max-age=30, stale-while-revalidate=60",
  Vary: "Cookie, Authorization",
} as const;

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store",
} as const;

function bad(msg: string, status = 400) {
  return NextResponse.json({ ok: false, error: msg }, { status, headers: NO_STORE_HEADERS });
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

function parseModuleKey(raw: string): ModuleSnapshotKey | null {
  const key = decodeURIComponent(raw).trim();
  return isModuleSnapshotKey(key) ? key : null;
}

export async function GET(req: Request, ctx: { params: Promise<{ moduleKey: string }> }) {
  if (!isSupabaseConfigured()) return bad("Supabase is not configured", 503);
  try {
    const { moduleKey: raw } = await ctx.params;
    const moduleKey = parseModuleKey(raw);
    if (!moduleKey) return bad("Unknown module key", 404);

    const { client, user } = await resolveAuthedClient(req);
    if (!user) return bad("Unauthorized", 401);

    const snapshot = await loadModuleSnapshot(client, user.id, moduleKey);
    return NextResponse.json({ ok: true, snapshot }, { headers: GET_CACHE_HEADERS });
  } catch (e) {
    return bad(e instanceof Error ? e.message : "Server error", 500);
  }
}

export async function PUT(req: Request, ctx: { params: Promise<{ moduleKey: string }> }) {
  if (!isSupabaseConfigured()) return bad("Supabase is not configured", 503);

  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return bad("Invalid JSON");
  }

  try {
    const { moduleKey: raw } = await ctx.params;
    const moduleKey = parseModuleKey(raw);
    if (!moduleKey) return bad("Unknown module key", 404);

    const { client, user } = await resolveAuthedClient(req);
    if (!user) return bad("Unauthorized", 401);

    const state = (rawBody as { state?: unknown })?.state;
    if (state === undefined) return bad("Missing state");

    const result = await saveModuleSnapshot(client, user.id, moduleKey, state);
    if (!result.ok) return bad(result.error, 500);
    return NextResponse.json({ ok: true, updatedAt: result.updatedAt });
  } catch (e) {
    return bad(e instanceof Error ? e.message : "Server error", 500);
  }
}
