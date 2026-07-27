import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { NepseHubAdminDomain } from "@/lib/market/nepse-hub-admin-fields";
import { createMarketDataServiceClient } from "@/services/market/nepse-market-data-engine";

export type NepseHubAdminOverrideRow = {
  id: string;
  symbol: string;
  domain: string;
  record_key: string;
  field_key: string;
  value_json: unknown;
  official_snapshot_json: unknown;
  note: string | null;
  updated_by: string;
  updated_by_email: string;
  updated_at: string;
};

export type NepseHubAdminAuditRow = {
  id: string;
  symbol: string;
  domain: string;
  record_key: string;
  field_key: string | null;
  action: string;
  old_value_json: unknown;
  new_value_json: unknown;
  actor_user_id: string;
  actor_email: string;
  note: string | null;
  created_at: string;
};

function unwrapValue(valueJson: unknown): unknown {
  if (valueJson && typeof valueJson === "object" && !Array.isArray(valueJson) && "v" in (valueJson as object)) {
    return (valueJson as { v: unknown }).v;
  }
  return valueJson;
}

function wrapValue(value: unknown): { v: unknown } {
  return { v: value };
}

export function overrideMapKey(domain: string, recordKey: string, fieldKey: string): string {
  return `${domain}|${recordKey}|${fieldKey}`;
}

export async function listOverridesForSymbol(
  symbol: string,
  sb: SupabaseClient | null = createMarketDataServiceClient(),
): Promise<NepseHubAdminOverrideRow[]> {
  if (!sb) return [];
  const { data, error } = await sb
    .from("nepse_hub_admin_overrides")
    .select("*")
    .eq("symbol", symbol.toUpperCase())
    .order("updated_at", { ascending: false });
  if (error) {
    if (/nepse_hub_admin_overrides|schema cache|does not exist/i.test(error.message)) return [];
    console.error("[nepse-hub-admin] listOverrides:", error.message);
    return [];
  }
  return (data as NepseHubAdminOverrideRow[] | null) ?? [];
}

export async function listAuditForSymbol(
  symbol: string,
  limit = 100,
  sb: SupabaseClient | null = createMarketDataServiceClient(),
): Promise<NepseHubAdminAuditRow[]> {
  if (!sb) return [];
  const { data, error } = await sb
    .from("nepse_hub_admin_audit_log")
    .select("*")
    .eq("symbol", symbol.toUpperCase())
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    if (/nepse_hub_admin_audit_log|schema cache|does not exist/i.test(error.message)) return [];
    console.error("[nepse-hub-admin] listAudit:", error.message);
    return [];
  }
  return (data as NepseHubAdminAuditRow[] | null) ?? [];
}

/** Build lookup of active overrides for a symbol. */
export function indexOverrides(rows: NepseHubAdminOverrideRow[]): Map<string, unknown> {
  const map = new Map<string, unknown>();
  for (const row of rows) {
    map.set(overrideMapKey(row.domain, row.record_key, row.field_key), unwrapValue(row.value_json));
  }
  return map;
}

/**
 * Apply field overrides onto a plain object.
 * Only keys present in overrides for (domain, recordKey) are replaced.
 */
export function applyFieldOverrides<T extends Record<string, unknown>>(
  target: T,
  overrides: Map<string, unknown>,
  domain: NepseHubAdminDomain | string,
  recordKey = "_",
): T {
  if (!overrides.size) return target;
  let changed = false;
  const next: Record<string, unknown> = { ...target };
  for (const [key, value] of overrides) {
    const prefix = `${domain}|${recordKey}|`;
    if (!key.startsWith(prefix)) continue;
    const fieldKey = key.slice(prefix.length);
    if (!fieldKey) continue;
    next[fieldKey] = value as never;
    changed = true;
  }
  return (changed ? next : target) as T;
}

export async function setFieldOverride(input: {
  symbol: string;
  domain: string;
  recordKey?: string;
  fieldKey: string;
  value: unknown;
  officialSnapshot?: unknown;
  note?: string | null;
  actorUserId: string;
  actorEmail: string;
  sb?: SupabaseClient | null;
}): Promise<{ ok: true; row: NepseHubAdminOverrideRow } | { ok: false; error: string }> {
  const sb = input.sb ?? createMarketDataServiceClient();
  if (!sb) return { ok: false, error: "Database not configured" };

  const symbol = input.symbol.trim().toUpperCase();
  const domain = input.domain.trim();
  const recordKey = (input.recordKey ?? "_").trim() || "_";
  const fieldKey = input.fieldKey.trim();
  if (!symbol || !domain || !fieldKey) return { ok: false, error: "symbol, domain, and fieldKey are required" };

  const { data: existing } = await sb
    .from("nepse_hub_admin_overrides")
    .select("*")
    .eq("symbol", symbol)
    .eq("domain", domain)
    .eq("record_key", recordKey)
    .eq("field_key", fieldKey)
    .maybeSingle();

  const payload = {
    symbol,
    domain,
    record_key: recordKey,
    field_key: fieldKey,
    value_json: wrapValue(input.value),
    official_snapshot_json:
      input.officialSnapshot !== undefined
        ? wrapValue(input.officialSnapshot)
        : ((existing as NepseHubAdminOverrideRow | null)?.official_snapshot_json ?? wrapValue(null)),
    note: input.note ?? null,
    updated_by: input.actorUserId,
    updated_by_email: input.actorEmail,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await sb
    .from("nepse_hub_admin_overrides")
    .upsert(payload, { onConflict: "symbol,domain,record_key,field_key" })
    .select("*")
    .single();

  if (error) return { ok: false, error: error.message };

  await sb.from("nepse_hub_admin_audit_log").insert({
    symbol,
    domain,
    record_key: recordKey,
    field_key: fieldKey,
    action: "set",
    old_value_json: existing ? (existing as NepseHubAdminOverrideRow).value_json : null,
    new_value_json: wrapValue(input.value),
    actor_user_id: input.actorUserId,
    actor_email: input.actorEmail,
    note: input.note ?? null,
  });

  return { ok: true, row: data as NepseHubAdminOverrideRow };
}

export async function restoreFieldOverride(input: {
  symbol: string;
  domain: string;
  recordKey?: string;
  fieldKey: string;
  actorUserId: string;
  actorEmail: string;
  note?: string | null;
  sb?: SupabaseClient | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const sb = input.sb ?? createMarketDataServiceClient();
  if (!sb) return { ok: false, error: "Database not configured" };

  const symbol = input.symbol.trim().toUpperCase();
  const domain = input.domain.trim();
  const recordKey = (input.recordKey ?? "_").trim() || "_";
  const fieldKey = input.fieldKey.trim();

  const { data: existing } = await sb
    .from("nepse_hub_admin_overrides")
    .select("*")
    .eq("symbol", symbol)
    .eq("domain", domain)
    .eq("record_key", recordKey)
    .eq("field_key", fieldKey)
    .maybeSingle();

  if (!existing) return { ok: false, error: "No override for this field" };

  const { error } = await sb
    .from("nepse_hub_admin_overrides")
    .delete()
    .eq("symbol", symbol)
    .eq("domain", domain)
    .eq("record_key", recordKey)
    .eq("field_key", fieldKey);

  if (error) return { ok: false, error: error.message };

  await sb.from("nepse_hub_admin_audit_log").insert({
    symbol,
    domain,
    record_key: recordKey,
    field_key: fieldKey,
    action: "restore_field",
    old_value_json: (existing as NepseHubAdminOverrideRow).value_json,
    new_value_json: (existing as NepseHubAdminOverrideRow).official_snapshot_json,
    actor_user_id: input.actorUserId,
    actor_email: input.actorEmail,
    note: input.note ?? "Restore official data",
  });

  return { ok: true };
}

export async function restoreCompanyOverrides(input: {
  symbol: string;
  actorUserId: string;
  actorEmail: string;
  note?: string | null;
  sb?: SupabaseClient | null;
}): Promise<{ ok: true; restored: number } | { ok: false; error: string }> {
  const sb = input.sb ?? createMarketDataServiceClient();
  if (!sb) return { ok: false, error: "Database not configured" };

  const symbol = input.symbol.trim().toUpperCase();
  const existing = await listOverridesForSymbol(symbol, sb);

  const { error } = await sb.from("nepse_hub_admin_overrides").delete().eq("symbol", symbol);
  if (error) return { ok: false, error: error.message };

  await sb.from("nepse_hub_admin_audit_log").insert({
    symbol,
    domain: "custom",
    record_key: "_",
    field_key: null,
    action: "restore_company",
    old_value_json: { count: existing.length, fields: existing.map((r) => `${r.domain}.${r.record_key}.${r.field_key}`) },
    new_value_json: null,
    actor_user_id: input.actorUserId,
    actor_email: input.actorEmail,
    note: input.note ?? "Restore all official data for company",
  });

  return { ok: true, restored: existing.length };
}
