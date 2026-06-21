/**
 * Client-safe Supabase configuration. Uses NEXT_PUBLIC_* so the browser can connect.
 */

function trimEnv(value: string | undefined): string {
  return (value ?? "").trim();
}

/** Strip wrapping quotes and trailing slashes from dashboard copy/paste values. */
export function normalizeSupabaseUrl(raw: string | undefined): string {
  let value = trimEnv(raw);
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1).trim();
  }
  return value.replace(/\/+$/, "");
}

/** Trim whitespace from dashboard copy/paste values. */
export function normalizeSupabaseKey(raw: string | undefined): string {
  let value = trimEnv(raw);
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1).trim();
  }
  return value;
}

export function isSupabaseConfigured(): boolean {
  const url = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const anon = normalizeSupabaseKey(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  return url.length > 8 && anon.length > 20;
}

export function getSupabaseUrl(): string {
  const u = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  if (!u) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
  return u;
}

export function getSupabaseAnonKey(): string {
  const k = normalizeSupabaseKey(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  if (!k) throw new Error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY");
  return k;
}

/** True for Supabase publishable keys (`sb_publishable_...`) or legacy JWT anon keys (`eyJ...`). */
export function looksLikeSupabaseAnonKey(key: string): boolean {
  return key.startsWith("sb_publishable_") || key.startsWith("eyJ");
}
