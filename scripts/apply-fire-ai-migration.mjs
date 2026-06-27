#!/usr/bin/env node
/**
 * Apply FIRE AI conversations migration to production.
 *
 * Requires ONE of:
 *   - SUPABASE_DB_URL in .env.local (Postgres URI)
 *   - SUPABASE_ACCESS_TOKEN in .env.local + NEXT_PUBLIC_SUPABASE_URL
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

const migrationFile = "20260627120000_fire_ai_conversations.sql";

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
  const projectRef = projectUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] ?? "";
  if (password.length >= 4 && projectRef.length === 20) {
    return `postgresql://postgres:${encodeURIComponent(password)}@db.${projectRef}.supabase.co:5432/postgres`;
  }

  for (const file of [join(root, ".env.local"), join(root, ".env.production.local"), join(root, ".env.vercel")]) {
    if (!existsSync(file)) continue;
    for (const line of readFileSync(file, "utf8").split("\n")) {
      const match = line.match(/postgresql:\/\/[^\s'"]+/);
      if (match?.[0]) return match[0];
    }
  }
  return "";
}

const dbUrl = resolveDbUrl();
if (!dbUrl) {
  console.error("Missing SUPABASE_DB_URL (or DATABASE_URL) in .env.local");
  process.exit(1);
}

const sqlPath = join(root, "supabase", "migrations", migrationFile);
if (!existsSync(sqlPath)) {
  console.error(`Migration file not found: ${sqlPath}`);
  process.exit(1);
}

console.log(`Applying ${migrationFile}…`);
const result = spawnSync(
  "npx",
  ["--yes", "supabase@latest", "db", "push", "--db-url", dbUrl, "--yes"],
  { cwd: root, stdio: "inherit", env: { ...process.env } },
);

if (result.status !== 0) {
  console.error("Migration failed. You can also paste the SQL into Supabase SQL Editor.");
  process.exit(result.status ?? 1);
}

console.log("FIRE AI migration applied successfully.");
