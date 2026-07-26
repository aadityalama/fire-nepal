#!/usr/bin/env node
/**
 * Apply nepse_index_eod migration to production.
 * Requires SUPABASE_DB_URL or SUPABASE_DB_PASSWORD (+ NEXT_PUBLIC_SUPABASE_URL).
 *
 * Alternative: paste supabase/migrations/20260726200000_nepse_index_eod.sql
 * into the Supabase SQL Editor, then run:
 *   node scripts/verify-portfolio-analytics.mjs
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadDotEnvLocal } from "./load-dotenv-local.mjs";

const root = join(fileURLToPath(new URL(".", import.meta.url)), "..");
loadDotEnvLocal();
process.env.SUPABASE_CLI_DISABLE_TELEMETRY = "1";
process.env.DO_NOT_TRACK = "1";

const migrationFile = "20260726200000_nepse_index_eod.sql";

function resolveDbUrl() {
  const direct = (process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? "").trim();
  if (direct.length >= 20) return direct;
  const password = (process.env.SUPABASE_DB_PASSWORD ?? "").trim();
  const projectUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim().replace(/\/+$/, "");
  const projectRef = projectUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] ?? "";
  if (password.length >= 4 && projectRef) {
    return `postgresql://postgres:${encodeURIComponent(password)}@db.${projectRef}.supabase.co:5432/postgres`;
  }
  for (const file of [join(root, ".env.local"), join(root, ".env.production.local")]) {
    if (!existsSync(file)) continue;
    for (const line of readFileSync(file, "utf8").split("\n")) {
      const match = line.match(/postgresql:\/\/[^\s'"]+/);
      if (match?.[0]) return match[0];
    }
  }
  return "";
}

async function applyWithPg(dbUrl) {
  const sql = readFileSync(join(root, "supabase", "migrations", migrationFile), "utf8");
  let pg;
  try {
    pg = (await import("pg")).default;
  } catch {
    console.error("FAIL: pg not installed. Run: npm install pg");
    process.exit(1);
  }
  const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();
  await client.query(sql);
  await client.end();
  console.log("OK: applied via pg");
}

async function main() {
  const dbUrl = resolveDbUrl();
  if (!dbUrl) {
    console.error(`
FAIL: Cannot apply migration — set ONE of:
  SUPABASE_DB_URL=postgresql://postgres:...@db.PROJECT.supabase.co:5432/postgres
  SUPABASE_DB_PASSWORD=...

Or run in Supabase SQL Editor:
  supabase/migrations/${migrationFile}
`);
    process.exit(1);
  }
  try {
    await applyWithPg(dbUrl);
  } catch (err) {
    console.error(`pg apply failed: ${err.message}`);
    console.log("Fallback: supabase db push");
    const r = spawnSync(
      "npx",
      ["--yes", "supabase@latest", "db", "push", "--db-url", dbUrl, "--yes"],
      { cwd: root, stdio: "inherit", env: process.env },
    );
    if (r.status !== 0) process.exit(r.status ?? 1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
