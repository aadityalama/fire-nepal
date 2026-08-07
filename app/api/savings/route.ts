import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { sanitizeSavingsWorkspaceState } from "@/lib/savings/savings-storage";
import { getSupabaseAnonKey, getSupabaseUrl, isSupabaseConfigured } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { loadSavingsWorkspaceForUser, saveSavingsWorkspaceForUser } from "@/services/savings-supabase";
import type { Database } from "@/types/supabase-database";

function bad(msg: string, status = 400) {
  return NextResponse.json({ ok: false, error: msg }, { status });
}

async function resolveAuthedClient(req?: Request): Promise<{
  client: SupabaseClient<Database>;
  user: User | null;
}> {
  const auth = req?.headers.get("authorization") ?? "";
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
    if (!user) return bad("Please sign in to view your savings workspace.", 401);

    const snapshot = await loadSavingsWorkspaceForUser(client, user.id);
    return NextResponse.json({ ok: true, snapshot });
  } catch (e) {
    return bad(e instanceof Error ? e.message : "Could not load savings workspace.", 500);
  }
}

async function save(req: Request) {
  if (!isSupabaseConfigured()) return bad("Supabase is not configured", 503);
  try {
    const { client, user } = await resolveAuthedClient(req);
    if (!user) return bad("Please sign in to save your savings workspace.", 401);

    const body = await req.json();
    const state = sanitizeSavingsWorkspaceState((body as { state?: unknown })?.state);
    const snapshot = await saveSavingsWorkspaceForUser(client, user.id, state);
    return NextResponse.json({ ok: true, snapshot });
  } catch (e) {
    return bad(e instanceof Error ? e.message : "Could not save savings workspace.", 500);
  }
}

export async function PUT(req: Request) {
  return save(req);
}

export async function POST(req: Request) {
  return save(req);
}
