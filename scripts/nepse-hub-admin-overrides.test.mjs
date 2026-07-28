/**
 * Static + unit verification for NEPSE Hub Admin override persistence + visual CMS.
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
const CMS_AUDIT = "20260728140000_nepse_hub_admin_cms_audit_actions.sql";

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

const REQUIRED_CMS_TABS = [
  "Overview",
  "Price & Chart",
  "Key Metrics",
  "Intelligence",
  "Financials",
  "Dividends",
  "Actions",
  "Ownership",
  "News",
  "AI Analysis",
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

describe("CMS audit action migration", () => {
  const sql = readFileSync(join(root, "supabase", "migrations", CMS_AUDIT), "utf8");

  it("expands audit action check for CMS ops", () => {
    assert.match(sql, /create_record/);
    assert.match(sql, /delete_record/);
    assert.match(sql, /restore_record/);
    assert.match(sql, /undo/);
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

  it("catalog includes company-page CMS tabs", () => {
    for (const label of REQUIRED_CMS_TABS) {
      assert.ok(fieldsSrc.includes(label), `missing CMS tab: ${label}`);
    }
  });

  it("client is a visual CMS without manual Record Key forms", () => {
    assert.match(clientSrc, /NEPSE_HUB_CMS_TABS/);
    assert.match(clientSrc, /Add Row/);
    assert.match(clientSrc, /Restore Official/);
    assert.match(clientSrc, /Restore Official Data \(Company\)/);
    assert.match(clientSrc, /appToast/);
    assert.match(clientSrc, /Undo/);
    assert.doesNotMatch(clientSrc, /Record key/);
    assert.doesNotMatch(clientSrc, /setRecordKey/);
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

  it("supports CMS record CRUD + undo", () => {
    assert.match(service, /createCmsRecord/);
    assert.match(service, /deleteCmsRecord/);
    assert.match(service, /restoreCmsRecord/);
    assert.match(service, /undoLastCmsChange/);
    assert.match(service, /mergeCmsRows/);
    assert.match(route, /create_record/);
    assert.match(route, /delete_record/);
    assert.match(route, /restore_record/);
    assert.match(route, /set_fields/);
    assert.match(route, /undo/);
  });

  it("apply script targets both base + ensure migrations", () => {
    const apply = readFileSync(join(root, "scripts/apply-nepse-hub-admin-overrides-migration.mjs"), "utf8");
    assert.match(apply, /20260727140000_nepse_hub_admin_overrides\.sql/);
    assert.match(apply, /20260728030400_nepse_hub_admin_overrides_ensure\.sql/);
    assert.match(apply, /notify pgrst/);
  });
});
