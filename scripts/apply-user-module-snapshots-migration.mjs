#!/usr/bin/env node
/**
 * Apply user_module_snapshots migration to production.
 *
 * Requires ONE of:
 *   - SUPABASE_DB_URL in .env.local (Postgres URI)
 *   - SUPABASE_DB_PASSWORD + NEXT_PUBLIC_SUPABASE_URL
 *   - SUPABASE_ACCESS_TOKEN in .env.local + NEXT_PUBLIC_SUPABASE_URL
 *
 * Alternative: run combined SQL in Supabase SQL Editor:
 *   scripts/user-module-snapshots-production-migration-combined.sql
 */
import { spawnSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadDotEnvLocal } from "./load-dotenv-local.mjs";

const root = join(fileURLToPath(new URL(".", import.meta.url)), "..");
loadDotEnvLocal();

process.env.SUPABASE_CLI_DISABLE_TELEMETRY = "1";
process.env.DO_NOT_TRACK = "1";

const migrationFile = "20260807120000_user_module_snapshots.sql";
const DEFAULT_PROJECT_REF = "mnxxcewvgnohsavojdzu";

function resolveDbUrl() {
  const direct = (
    process.env.SUPABASE_DB_URL ??
    process.env.DATABASE_URL ??
    process.env.POSTGRES_URL ??
    ""
  ).trim();
  if (direct.length >= 20) return direct;

  const password = (process.env.SUPABASE_DB_PASSWORD ?? "").trim();
  const projectUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim().replace(/\/+$/, "");
  const projectRef = projectUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] ?? DEFAULT_PROJECT_REF;
  if (password.length >= 4 && projectRef.length >= 10) {
    return `postgresql://postgres:${encodeURIComponent(password)}@db.${projectRef}.supabase.co:5432/postgres`;
  }
  return "";
}

async function applyViaPg(dbUrl) {
  const { default: pg } = await import("pg");
  const sql = readFileSync(join(root, "supabase/migrations", migrationFile), "utf8");
  const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    await client.query(sql);
    console.log(`Applied ${migrationFile} via pg`);
  } finally {
    await client.end();
  }
}

const dbUrl = resolveDbUrl();
if (dbUrl) {
  applyViaPg(dbUrl).catch((error) => {
    console.error(error);
    process.exit(1);
  });
} else {
  const push = spawnSync(
    "npx",
    ["--yes", "supabase@latest", "db", "push", "--db-url", process.env.SUPABASE_DB_URL ?? "", "--yes"],
    { cwd: root, stdio: "inherit", env: process.env },
  );
  if (push.status !== 0) {
    console.error(
      "Missing SUPABASE_DB_URL / SUPABASE_DB_PASSWORD. Paste scripts/user-module-snapshots-production-migration-combined.sql in the SQL Editor.",
    );
    process.exit(1);
  }
}
