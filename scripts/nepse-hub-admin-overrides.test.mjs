/**
 * Static + unit verification for NEPSE Hub Admin override persistence.
 * Run: node --test scripts/nepse-hub-admin-overrides.test.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(new URL(".", import.meta.url)), "..");

const ENSURE = "20260728030400_nepse_hub_admin_overrides_ensure.sql";
const BASE = "20260727140000_nepse_hub_admin_overrides.sql";

const REQUIRED_DOMAINS = [
  "Company Profile",
  "Financial Statements",
  "Ratios",
  "Dividends",
  "Ownership",
  "Corporate Actions",
  "Technical Data",
  "AI Analysis",
  "News",
  "Market Data",
  "Custom",
];

describe("nepse_hub_admin_overrides migration", () => {
  const sql = readFileSync(join(root, "supabase", "migrations", ENSURE), "utf8");
  const base = readFileSync(join(root, "supabase", "migrations", BASE), "utf8");

  it("is present in supabase/migrations (auto-included)", () => {
    assert.match(ENSURE, /^20\d{12}_.+\.sql$/);
    assert.ok(sql.length > 500);
    assert.ok(base.includes("nepse_hub_admin_overrides"));
  });

  it("creates required tables", () => {
    assert.match(sql, /create table if not exists public\.nepse_hub_admin_overrides/i);
    assert.match(sql, /create table if not exists public\.nepse_hub_admin_audit_log/i);
  });

  it("defines timestamps", () => {
    assert.match(sql, /created_at timestamptz/i);
    assert.match(sql, /updated_at timestamptz/i);
  });

  it("defines required indexes", () => {
    assert.match(sql, /nepse_hub_admin_overrides_symbol_idx/);
    assert.match(sql, /nepse_hub_admin_overrides_updated_at_idx/);
    assert.match(sql, /nepse_hub_admin_overrides_updated_by_idx/);
    assert.match(sql, /nepse_hub_admin_audit_log_symbol_idx/);
    assert.match(sql, /nepse_hub_admin_audit_log_actor_idx/);
  });

  it("defines foreign keys to auth.users", () => {
    assert.match(sql, /nepse_hub_admin_overrides_updated_by_fkey/);
    assert.match(sql, /references auth\.users/);
    assert.match(sql, /nepse_hub_admin_audit_log_actor_user_id_fkey/);
  });

  it("enables RLS and creates service_role policies", () => {
    assert.match(sql, /enable row level security/i);
    assert.match(sql, /nepse_hub_admin_overrides_service_select/);
    assert.match(sql, /nepse_hub_admin_overrides_service_insert/);
    assert.match(sql, /nepse_hub_admin_overrides_service_update/);
    assert.match(sql, /nepse_hub_admin_overrides_service_delete/);
    assert.match(sql, /nepse_hub_admin_audit_log_service_select/);
    assert.match(sql, /nepse_hub_admin_audit_log_service_insert/);
    assert.match(sql, /to service_role/);
  });

  it("reloads PostgREST schema", () => {
    assert.match(sql, /notify pgrst,\s*'reload schema'/i);
  });

  it("unique constraint supports upsert onConflict", () => {
    assert.match(sql, /unique \(symbol, domain, record_key, field_key\)/i);
  });
});

describe("Admin UI domain coverage", () => {
  const fieldsSrc = readFileSync(join(root, "src/lib/market/nepse-hub-admin-fields.ts"), "utf8");
  const clientSrc = readFileSync(join(root, "src/components/admin/NepseHubAdminClient.tsx"), "utf8");

  it("catalog includes all required admin sections", () => {
    for (const label of REQUIRED_DOMAINS) {
      assert.ok(fieldsSrc.includes(label), `missing domain label: ${label}`);
    }
  });

  it("client renders domain tabs and save/restore actions", () => {
    assert.match(clientSrc, /NEPSE_HUB_ADMIN_DOMAIN_LABELS/);
    assert.match(clientSrc, /Save override/);
    assert.match(clientSrc, /Restore Official Data \(Field\)/);
    assert.match(clientSrc, /Restore Official Data \(Company\)/);
    assert.match(clientSrc, /mutate\("set"\)/);
    assert.match(clientSrc, /mutate\("restore_field"\)/);
    assert.match(clientSrc, /mutate\("restore_company"\)/);
  });
});

describe("Save Override / Restore Official Data service contract", () => {
  const service = readFileSync(join(root, "src/services/market/nepse-hub-admin-overrides.ts"), "utf8");
  const route = readFileSync(join(root, "app/api/admin/nepse-hub/[symbol]/route.ts"), "utf8");

  it("Save Override upserts (insert when missing, update when present)", () => {
    assert.match(service, /\.upsert\(/);
    assert.match(service, /onConflict:\s*"symbol,domain,record_key,field_key"/);
    assert.match(service, /Insert when no override exists; update when one already exists/);
    assert.match(service, /maybeSingle\(\)/);
    assert.match(service, /action:\s*"set"/);
    assert.match(route, /setFieldOverride/);
  });

  it("Restore Official Data deletes the override row", () => {
    assert.match(service, /\.delete\(\)/);
    assert.match(service, /action:\s*"restore_field"/);
    assert.match(service, /action:\s*"restore_company"/);
    assert.match(route, /restoreFieldOverride/);
    assert.match(route, /restoreCompanyOverrides/);
  });

  it("apply script targets both base + ensure migrations", () => {
    const apply = readFileSync(join(root, "scripts/apply-nepse-hub-admin-overrides-migration.mjs"), "utf8");
    assert.match(apply, /20260727140000_nepse_hub_admin_overrides\.sql/);
    assert.match(apply, /20260728030400_nepse_hub_admin_overrides_ensure\.sql/);
    assert.match(apply, /notify pgrst/);
  });
});
