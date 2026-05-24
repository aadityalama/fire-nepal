import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase-database";

const MAX_SYMBOLS = 64;

function normalizeSymbols(raw: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const s of raw) {
    const u = String(s).replace(/\s+/g, "").toUpperCase();
    if (!u || seen.has(u)) continue;
    seen.add(u);
    out.push(u);
    if (out.length >= MAX_SYMBOLS) break;
  }
  return out;
}

export async function loadNepseWatchlistFromSupabase(
  client: SupabaseClient<Database>,
  userId: string,
): Promise<string[] | null> {
  const { data, error } = await client.from("nepse_watchlist").select("symbols").eq("user_id", userId).maybeSingle();
  if (error) {
    console.error("[nepse-watchlist] load", error);
    return null;
  }
  if (!data?.symbols || !Array.isArray(data.symbols)) return [];
  return normalizeSymbols(data.symbols.map(String));
}

export async function upsertNepseWatchlistToSupabase(
  client: SupabaseClient<Database>,
  userId: string,
  symbols: string[],
): Promise<boolean> {
  const cleaned = normalizeSymbols(symbols);
  const { error } = await client.from("nepse_watchlist").upsert(
    { user_id: userId, symbols: cleaned, updated_at: new Date().toISOString() },
    { onConflict: "user_id" },
  );
  if (error) {
    console.error("[nepse-watchlist] upsert", error);
    return false;
  }
  return true;
}
