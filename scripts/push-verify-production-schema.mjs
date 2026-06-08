#!/usr/bin/env node
/**
 * Apply all pending Supabase migrations to the remote DB, then verify schema + admin-read paths.
 *
 * Requires `.env.local` with:
 *   - SUPABASE_DB_URL (non-empty) — Dashboard → Connect → URI (password URL-encoded)
 *   - NEXT_PUBLIC_SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY
 *
 * Usage:
 *   node scripts/push-verify-production-schema.mjs
 *
 * Telemetry: set SUPABASE_CLI_DISABLE_TELEMETRY=1 (default in this script) to avoid CLI home-dir writes.
 */
import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { loadDotEnvLocal } from "./load-dotenv-local.mjs";

const root = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const migrationsDir = join(root, "supabase", "migrations");

function need(name, minLen = 8) {
  const v = process.env[name]?.trim();
  if (!v || v.length < minLen) {
    console.error(`Missing or too short ${name}. Set it in .env.local (see .env.example).`);
    process.exit(1);
  }
  return v;
}

function listLocalMigrationFiles() {
  return readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();
}

/** @param {import('@supabase/supabase-js').SupabaseClient} admin */
async function columnExists(admin, table, column) {
  const { error } = await admin.from(table).select(column).limit(1);
  if (!error) return true;
  const msg = (error.message || "").toLowerCase();
  if (msg.includes("does not exist") || msg.includes("column") || error.code === "42703") return false;
  throw new Error(`${table}.${column}: ${error.message}`);
}

/** @param {import('@supabase/supabase-js').SupabaseClient} admin */
async function adminDashboardProbe(admin) {
  const errors = [];
  const p1 = await admin.from("profiles").select("id, plan_type, last_active_at, suspended_at, archived_at").limit(1);
  if (p1.error) errors.push(`profiles: ${p1.error.message}`);
  const p2 = await admin.from("subscriptions").select("user_id, current_period_end").limit(1);
  if (p2.error) errors.push(`subscriptions: ${p2.error.message}`);
  const p3 = await admin.from("membership_requests").select("id", { count: "exact", head: true }).eq("status", "pending");
  if (p3.error) errors.push(`membership_requests: ${p3.error.message}`);
  const p4 = await admin.from("revenue_events").select("amount_npr").limit(1);
  if (p4.error) errors.push(`revenue_events: ${p4.error.message}`);
  const p5 = await admin.from("user_profiles").select("id").limit(1);
  if (p5.error) errors.push(`user_profiles: ${p5.error.message}`);
  return errors;
}

/** @param {import('@supabase/supabase-js').SupabaseClient} admin */
async function approvalSchemaProbe(admin) {
  const { error } = await admin
    .from("profiles")
    .select("id, plan_type, membership_activated_at, expires_at, suspended_at, archived_at, last_active_at, updated_at")
    .limit(1);
  return error ? error.message : null;
}

loadDotEnvLocal();

process.env.SUPABASE_CLI_DISABLE_TELEMETRY = process.env.SUPABASE_CLI_DISABLE_TELEMETRY ?? "1";
process.env.DO_NOT_TRACK = process.env.DO_NOT_TRACK ?? "1";

const dbUrl = need("SUPABASE_DB_URL", 20);
const url = need("NEXT_PUBLIC_SUPABASE_URL");
const serviceKey = need("SUPABASE_SERVICE_ROLE_KEY");

const localMigrations = listLocalMigrationFiles();
console.log("\n--- Local migration files (repo) ---\n");
console.log(localMigrations.join("\n"));

console.log("\n--- 1) supabase db push (remote) ---\n");
const push = spawnSync("npx", ["--yes", "supabase@latest", "db", "push", "--db-url", dbUrl, "--yes"], {
  stdio: "inherit",
  env: process.env,
  cwd: root,
});
if (push.status !== 0) {
  console.error("\ndb push failed (exit " + (push.status ?? "?") + ").");
  process.exit(push.status ?? 1);
}

console.log("\n--- 2) supabase migration list (remote) ---\n");
const list = spawnSync("npx", ["--yes", "supabase@latest", "migration", "list", "--db-url", dbUrl], {
  stdio: "inherit",
  env: process.env,
  cwd: root,
});
if (list.status !== 0) {
  console.error("\nmigration list failed.");
  process.exit(list.status ?? 1);
}

console.log("\n--- 3) Column + dashboard verification (service role) ---\n");
const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

const results = {
  "profiles.expires_at": await columnExists(admin, "profiles", "expires_at"),
  "profiles.membership_tier": await columnExists(admin, "profiles", "membership_tier"),
  "profiles.membership_status": await columnExists(admin, "profiles", "membership_status"),
};

for (const [k, ok] of Object.entries(results)) {
  console.log(`${ok ? "OK" : "MISSING"}: ${k}`);
}

const approvalCols = await approvalSchemaProbe(admin);
console.log(
  approvalCols
    ? `WARN: membership approval / profile upsert probe: ${approvalCols}`
    : "OK: profiles row readable with approval-related columns (membership_activated_at, expires_at, suspended_at, …)",
);

const dashErrs = await adminDashboardProbe(admin);
console.log(dashErrs.length === 0 ? "OK: admin dashboard read queries (profiles, subscriptions, membership_requests, revenue_events, user_profiles)" : "FAIL: " + dashErrs.join(" | "));

if (dashErrs.length) process.exit(1);

if (!results["profiles.expires_at"]) {
  console.error("\nFAIL: profiles.expires_at is required for this app.");
  process.exit(1);
}

if (!results["profiles.membership_tier"] || !results["profiles.membership_status"]) {
  console.log(
    "\nNOTE: This repo does not define `profiles.membership_tier` or `profiles.membership_status` in migrations.\n" +
      "Paid tier is `plan_type` (free | premium | elite); status is derived in app/SQL (`membershipUiBucket`, `profile_membership_ui_bucket`).\n" +
      "If you expected those columns, add a migration or adjust verification expectations.\n",
  );
}

console.log("\nDone.\n");
