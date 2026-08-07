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
  created_at?: string;
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

function isMissingOverridesRelation(message: string | undefined | null): boolean {
  if (!message) return false;
  return /nepse_hub_admin_overrides|nepse_hub_admin_audit_log|schema cache|does not exist/i.test(message);
}

const MISSING_TABLE_HINT =
  "Database table public.nepse_hub_admin_overrides is missing from the PostgREST schema cache. Apply supabase/migrations/20260728030400_nepse_hub_admin_overrides_ensure.sql (npm run db:apply:nepse-hub-admin-overrides) then reload schema.";

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
    if (isMissingOverridesRelation(error.message)) {
      console.error("[nepse-hub-admin] listOverrides:", MISSING_TABLE_HINT, error.message);
      return [];
    }
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
    if (isMissingOverridesRelation(error.message)) {
      console.error("[nepse-hub-admin] listAudit:", MISSING_TABLE_HINT, error.message);
      return [];
    }
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

  const { data: existing, error: existingError } = await sb
    .from("nepse_hub_admin_overrides")
    .select("*")
    .eq("symbol", symbol)
    .eq("domain", domain)
    .eq("record_key", recordKey)
    .eq("field_key", fieldKey)
    .maybeSingle();

  if (existingError && isMissingOverridesRelation(existingError.message)) {
    return { ok: false, error: MISSING_TABLE_HINT };
  }

  const now = new Date().toISOString();
  const payload: Record<string, unknown> = {
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
    updated_at: now,
  };

  // Insert when no override exists; update when one already exists.
  // Prefer upsert on the unique key so concurrent saves still converge.
  if (!existing) payload.created_at = now;

  const { data, error } = await sb
    .from("nepse_hub_admin_overrides")
    .upsert(payload, { onConflict: "symbol,domain,record_key,field_key" })
    .select("*")
    .single();

  if (error) {
    if (isMissingOverridesRelation(error.message)) return { ok: false, error: MISSING_TABLE_HINT };
    return { ok: false, error: error.message };
  }

  const { error: auditError } = await sb.from("nepse_hub_admin_audit_log").insert({
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
  if (auditError && !isMissingOverridesRelation(auditError.message)) {
    console.error("[nepse-hub-admin] audit set:", auditError.message);
  }

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

  const { data: existing, error: existingError } = await sb
    .from("nepse_hub_admin_overrides")
    .select("*")
    .eq("symbol", symbol)
    .eq("domain", domain)
    .eq("record_key", recordKey)
    .eq("field_key", fieldKey)
    .maybeSingle();

  if (existingError && isMissingOverridesRelation(existingError.message)) {
    return { ok: false, error: MISSING_TABLE_HINT };
  }

  if (!existing) return { ok: false, error: "No override for this field" };

  // Delete the override so read paths fall back to the official ingested value.
  const { error } = await sb
    .from("nepse_hub_admin_overrides")
    .delete()
    .eq("symbol", symbol)
    .eq("domain", domain)
    .eq("record_key", recordKey)
    .eq("field_key", fieldKey);

  if (error) {
    if (isMissingOverridesRelation(error.message)) return { ok: false, error: MISSING_TABLE_HINT };
    return { ok: false, error: error.message };
  }

  const { error: auditError } = await sb.from("nepse_hub_admin_audit_log").insert({
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
  if (auditError && !isMissingOverridesRelation(auditError.message)) {
    console.error("[nepse-hub-admin] audit restore_field:", auditError.message);
  }

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
  if (error) {
    if (isMissingOverridesRelation(error.message)) return { ok: false, error: MISSING_TABLE_HINT };
    return { ok: false, error: error.message };
  }

  const { error: auditError } = await sb.from("nepse_hub_admin_audit_log").insert({
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
  if (auditError && !isMissingOverridesRelation(auditError.message)) {
    console.error("[nepse-hub-admin] audit restore_company:", auditError.message);
  }

  return { ok: true, restored: existing.length };
}

/** Reserved field keys for record-level CMS operations. */
export const CMS_DELETED_FIELD = "__deleted__";
export const CMS_ROW_PAYLOAD_FIELD = "__row__";
export const CMS_RECORD_PREFIX = "cms:";

export function isCmsCreatedRecordKey(recordKey: string): boolean {
  return recordKey.startsWith(CMS_RECORD_PREFIX);
}

export function newCmsRecordKey(): string {
  return `${CMS_RECORD_PREFIX}${crypto.randomUUID()}`;
}

export function isRecordDeleted(overrides: Map<string, unknown>, domain: string, recordKey: string): boolean {
  return overrides.get(overrideMapKey(domain, recordKey, CMS_DELETED_FIELD)) === true;
}

export function getCmsRowPayload(
  overrides: Map<string, unknown>,
  domain: string,
  recordKey: string,
): Record<string, unknown> | null {
  const payload = overrides.get(overrideMapKey(domain, recordKey, CMS_ROW_PAYLOAD_FIELD));
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    return payload as Record<string, unknown>;
  }
  return null;
}

/** Collect CMS-created record keys for a domain (excluding deleted). */
export function listCmsCreatedRecordKeys(overrides: Map<string, unknown>, domain: string): string[] {
  const keys = new Set<string>();
  const prefix = `${domain}|${CMS_RECORD_PREFIX}`;
  for (const key of overrides.keys()) {
    if (!key.startsWith(prefix)) continue;
    const rest = key.slice(`${domain}|`.length);
    const recordKey = rest.slice(0, rest.lastIndexOf("|"));
    if (!isCmsCreatedRecordKey(recordKey)) continue;
    if (isRecordDeleted(overrides, domain, recordKey)) continue;
    keys.add(recordKey);
  }
  return [...keys];
}

/**
 * Merge official rows with field overrides, hide deleted official rows,
 * and append CMS-created rows. Backend resolves record keys — UI never asks for them.
 */
export function mergeCmsRows<T extends Record<string, unknown>>(input: {
  official: T[];
  overrides: Map<string, unknown>;
  domain: string;
  recordKeyOf: (row: T) => string;
  buildCmsRow?: (recordKey: string, payload: Record<string, unknown>) => T;
}): T[] {
  const { official, overrides, domain, recordKeyOf, buildCmsRow } = input;
  const next: T[] = [];

  for (const row of official) {
    const recordKey = recordKeyOf(row);
    if (!recordKey || isRecordDeleted(overrides, domain, recordKey)) continue;
    next.push(applyFieldOverrides({ ...row } as T, overrides, domain, recordKey));
  }

  for (const recordKey of listCmsCreatedRecordKeys(overrides, domain)) {
    const payload = getCmsRowPayload(overrides, domain, recordKey) ?? {};
    const patched = applyFieldOverrides({ ...payload } as Record<string, unknown>, overrides, domain, recordKey);
    if (buildCmsRow) {
      next.push(buildCmsRow(recordKey, patched));
    } else {
      next.push({ id: recordKey, ...patched } as unknown as T);
    }
  }

  return next;
}

export async function setRecordFields(input: {
  symbol: string;
  domain: string;
  recordKey?: string;
  fields: Record<string, unknown>;
  officialSnapshots?: Record<string, unknown>;
  note?: string | null;
  actorUserId: string;
  actorEmail: string;
  sb?: SupabaseClient | null;
}): Promise<{ ok: true; rows: NepseHubAdminOverrideRow[]; recordKey: string } | { ok: false; error: string }> {
  const recordKey = (input.recordKey ?? "_").trim() || "_";
  const entries = Object.entries(input.fields);
  if (!entries.length) return { ok: false, error: "No fields to save" };

  const saved: NepseHubAdminOverrideRow[] = [];
  for (const [fieldKey, value] of entries) {
    if (fieldKey === CMS_DELETED_FIELD || fieldKey === CMS_ROW_PAYLOAD_FIELD) continue;
    const result = await setFieldOverride({
      symbol: input.symbol,
      domain: input.domain,
      recordKey,
      fieldKey,
      value,
      officialSnapshot: input.officialSnapshots?.[fieldKey],
      note: input.note ?? null,
      actorUserId: input.actorUserId,
      actorEmail: input.actorEmail,
      sb: input.sb,
    });
    if (!result.ok) return result;
    saved.push(result.row);
  }
  return { ok: true, rows: saved, recordKey };
}

export async function createCmsRecord(input: {
  symbol: string;
  domain: string;
  fields: Record<string, unknown>;
  note?: string | null;
  actorUserId: string;
  actorEmail: string;
  preferredRecordKey?: string | null;
  sb?: SupabaseClient | null;
}): Promise<{ ok: true; recordKey: string; rows: NepseHubAdminOverrideRow[] } | { ok: false; error: string }> {
  const sb = input.sb ?? createMarketDataServiceClient();
  if (!sb) return { ok: false, error: "Database not configured" };

  const symbol = input.symbol.trim().toUpperCase();
  const domain = input.domain.trim();
  const fields = { ...input.fields };

  // Prefer fiscal year / natural id when provided so restores stay stable.
  let recordKey = (input.preferredRecordKey ?? "").trim();
  if (!recordKey) {
    const fy = typeof fields.fiscalYear === "string" ? fields.fiscalYear.trim() : "";
    recordKey = fy && domain === "dividends" ? fy : newCmsRecordKey();
  }

  const payloadResult = await setFieldOverride({
    symbol,
    domain,
    recordKey,
    fieldKey: CMS_ROW_PAYLOAD_FIELD,
    value: fields,
    officialSnapshot: null,
    note: input.note ?? "Create CMS row",
    actorUserId: input.actorUserId,
    actorEmail: input.actorEmail,
    sb,
  });
  if (!payloadResult.ok) return payloadResult;

  const fieldResult = await setRecordFields({
    symbol,
    domain,
    recordKey,
    fields,
    note: input.note ?? "Create CMS row",
    actorUserId: input.actorUserId,
    actorEmail: input.actorEmail,
    sb,
  });
  if (!fieldResult.ok) return fieldResult;

  await sb.from("nepse_hub_admin_audit_log").insert({
    symbol,
    domain,
    record_key: recordKey,
    field_key: null,
    action: "create_record",
    old_value_json: null,
    new_value_json: wrapValue(fields),
    actor_user_id: input.actorUserId,
    actor_email: input.actorEmail,
    note: input.note ?? "Create CMS row",
  });

  return { ok: true, recordKey, rows: [payloadResult.row, ...fieldResult.rows] };
}

export async function deleteCmsRecord(input: {
  symbol: string;
  domain: string;
  recordKey: string;
  actorUserId: string;
  actorEmail: string;
  note?: string | null;
  sb?: SupabaseClient | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const sb = input.sb ?? createMarketDataServiceClient();
  if (!sb) return { ok: false, error: "Database not configured" };

  const symbol = input.symbol.trim().toUpperCase();
  const domain = input.domain.trim();
  const recordKey = input.recordKey.trim();
  if (!recordKey) return { ok: false, error: "recordKey is required" };

  if (isCmsCreatedRecordKey(recordKey)) {
    // Hard-delete CMS-created overrides for this record.
    const { data: existing } = await sb
      .from("nepse_hub_admin_overrides")
      .select("*")
      .eq("symbol", symbol)
      .eq("domain", domain)
      .eq("record_key", recordKey);

    const { error } = await sb
      .from("nepse_hub_admin_overrides")
      .delete()
      .eq("symbol", symbol)
      .eq("domain", domain)
      .eq("record_key", recordKey);
    if (error) {
      if (isMissingOverridesRelation(error.message)) return { ok: false, error: MISSING_TABLE_HINT };
      return { ok: false, error: error.message };
    }

    await sb.from("nepse_hub_admin_audit_log").insert({
      symbol,
      domain,
      record_key: recordKey,
      field_key: null,
      action: "delete_record",
      old_value_json: existing ?? null,
      new_value_json: null,
      actor_user_id: input.actorUserId,
      actor_email: input.actorEmail,
      note: input.note ?? "Delete CMS row",
    });
    return { ok: true };
  }

  // Soft-hide official rows so cron data remains intact.
  const result = await setFieldOverride({
    symbol,
    domain,
    recordKey,
    fieldKey: CMS_DELETED_FIELD,
    value: true,
    officialSnapshot: false,
    note: input.note ?? "Hide official row",
    actorUserId: input.actorUserId,
    actorEmail: input.actorEmail,
    sb,
  });
  if (!result.ok) return result;

  await sb.from("nepse_hub_admin_audit_log").insert({
    symbol,
    domain,
    record_key: recordKey,
    field_key: CMS_DELETED_FIELD,
    action: "delete_record",
    old_value_json: wrapValue(false),
    new_value_json: wrapValue(true),
    actor_user_id: input.actorUserId,
    actor_email: input.actorEmail,
    note: input.note ?? "Hide official row",
  });

  return { ok: true };
}

export async function restoreCmsRecord(input: {
  symbol: string;
  domain: string;
  recordKey: string;
  actorUserId: string;
  actorEmail: string;
  note?: string | null;
  sb?: SupabaseClient | null;
}): Promise<{ ok: true; restored: number } | { ok: false; error: string }> {
  const sb = input.sb ?? createMarketDataServiceClient();
  if (!sb) return { ok: false, error: "Database not configured" };

  const symbol = input.symbol.trim().toUpperCase();
  const domain = input.domain.trim();
  const recordKey = input.recordKey.trim();

  const { data: existing, error: listError } = await sb
    .from("nepse_hub_admin_overrides")
    .select("*")
    .eq("symbol", symbol)
    .eq("domain", domain)
    .eq("record_key", recordKey);

  if (listError) {
    if (isMissingOverridesRelation(listError.message)) return { ok: false, error: MISSING_TABLE_HINT };
    return { ok: false, error: listError.message };
  }

  const rows = (existing as NepseHubAdminOverrideRow[] | null) ?? [];
  if (!rows.length) return { ok: false, error: "No overrides for this record" };

  const { error } = await sb
    .from("nepse_hub_admin_overrides")
    .delete()
    .eq("symbol", symbol)
    .eq("domain", domain)
    .eq("record_key", recordKey);

  if (error) {
    if (isMissingOverridesRelation(error.message)) return { ok: false, error: MISSING_TABLE_HINT };
    return { ok: false, error: error.message };
  }

  await sb.from("nepse_hub_admin_audit_log").insert({
    symbol,
    domain,
    record_key: recordKey,
    field_key: null,
    action: "restore_record",
    old_value_json: { count: rows.length, fields: rows.map((r) => r.field_key) },
    new_value_json: null,
    actor_user_id: input.actorUserId,
    actor_email: input.actorEmail,
    note: input.note ?? "Restore official record",
  });

  return { ok: true, restored: rows.length };
}

/**
 * Undo the most recent undoable audit event for a symbol.
 * Reverses set / create_record / delete_record when possible.
 */
export async function undoLastCmsChange(input: {
  symbol: string;
  actorUserId: string;
  actorEmail: string;
  auditId?: string | null;
  sb?: SupabaseClient | null;
}): Promise<{ ok: true; undoneAction: string } | { ok: false; error: string }> {
  const sb = input.sb ?? createMarketDataServiceClient();
  if (!sb) return { ok: false, error: "Database not configured" };

  const symbol = input.symbol.trim().toUpperCase();
  const audit = await listAuditForSymbol(symbol, 40, sb);
  const event = input.auditId
    ? audit.find((row) => row.id === input.auditId)
    : audit.find((row) => ["set", "create_record", "delete_record", "restore_field", "restore_record"].includes(row.action));

  if (!event) return { ok: false, error: "Nothing to undo" };

  if (event.action === "set") {
    const oldValue = unwrapValue(event.old_value_json);
    if (oldValue === null || oldValue === undefined) {
      const restored = await restoreFieldOverride({
        symbol,
        domain: event.domain,
        recordKey: event.record_key,
        fieldKey: event.field_key ?? "",
        actorUserId: input.actorUserId,
        actorEmail: input.actorEmail,
        note: `Undo ${event.id}`,
        sb,
      });
      if (!restored.ok) return restored;
    } else {
      const set = await setFieldOverride({
        symbol,
        domain: event.domain,
        recordKey: event.record_key,
        fieldKey: event.field_key ?? "",
        value: oldValue,
        note: `Undo ${event.id}`,
        actorUserId: input.actorUserId,
        actorEmail: input.actorEmail,
        sb,
      });
      if (!set.ok) return set;
    }
  } else if (event.action === "create_record") {
    const deleted = await deleteCmsRecord({
      symbol,
      domain: event.domain,
      recordKey: event.record_key,
      actorUserId: input.actorUserId,
      actorEmail: input.actorEmail,
      note: `Undo create ${event.id}`,
      sb,
    });
    if (!deleted.ok) return deleted;
  } else if (event.action === "delete_record") {
    if (isCmsCreatedRecordKey(event.record_key) && Array.isArray(event.old_value_json)) {
      for (const row of event.old_value_json as NepseHubAdminOverrideRow[]) {
        await setFieldOverride({
          symbol,
          domain: row.domain,
          recordKey: row.record_key,
          fieldKey: row.field_key,
          value: unwrapValue(row.value_json),
          officialSnapshot: unwrapValue(row.official_snapshot_json),
          note: `Undo delete ${event.id}`,
          actorUserId: input.actorUserId,
          actorEmail: input.actorEmail,
          sb,
        });
      }
    } else {
      const restored = await restoreCmsRecord({
        symbol,
        domain: event.domain,
        recordKey: event.record_key,
        actorUserId: input.actorUserId,
        actorEmail: input.actorEmail,
        note: `Undo delete ${event.id}`,
        sb,
      });
      if (!restored.ok) return restored;
    }
  } else if (event.action === "restore_field" && event.field_key) {
    const previous = unwrapValue(event.old_value_json);
    if (previous !== null && previous !== undefined) {
      const set = await setFieldOverride({
        symbol,
        domain: event.domain,
        recordKey: event.record_key,
        fieldKey: event.field_key,
        value: previous,
        note: `Undo restore ${event.id}`,
        actorUserId: input.actorUserId,
        actorEmail: input.actorEmail,
        sb,
      });
      if (!set.ok) return set;
    }
  } else if (event.action === "restore_record") {
    return { ok: false, error: "Cannot automatically undo a full record restore" };
  }

  await sb.from("nepse_hub_admin_audit_log").insert({
    symbol,
    domain: event.domain,
    record_key: event.record_key,
    field_key: event.field_key,
    action: "undo",
    old_value_json: wrapValue(event.id),
    new_value_json: wrapValue(event.action),
    actor_user_id: input.actorUserId,
    actor_email: input.actorEmail,
    note: `Undid ${event.action}`,
  });

  return { ok: true, undoneAction: event.action };
}
