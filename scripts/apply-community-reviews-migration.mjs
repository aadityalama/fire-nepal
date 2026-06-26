#!/usr/bin/env node
/**
 * Apply community reviews migration to production.
 *
 * Requires ONE of:
 *   - SUPABASE_DB_URL in .env.local
 *   - SUPABASE_ACCESS_TOKEN in .env.local + NEXT_PUBLIC_SUPABASE_URL
 */
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadDotEnvLocal } from "./load-dotenv-local.mjs";

const root = join(fileURLToPath(new URL(".", import.meta.url)), "..");
loadDotEnvLocal();

process.env.SUPABASE_CLI_DISABLE_TELEMETRY = "1";
process.env.DO_NOT_TRACK = "1";

const dbUrl = (process.env.SUPABASE_DB_URL ?? "").trim();
const accessToken = (process.env.SUPABASE_ACCESS_TOKEN ?? "").trim();
const projectUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim().replace(/\/+$/, "");
const projectRef = projectUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] ?? "";

const migrations = ["20260626120000_community_reviews.sql"];

console.log("\n--- Community reviews production migration apply ---\n");
for (const m of migrations) console.log("  -", m);

if (dbUrl.length >= 20) {
  console.log("\nMethod: supabase db push (--db-url)\n");
  const push = spawnSync(
    "npx",
    ["--yes", "supabase@latest", "db", "push", "--db-url", dbUrl, "--yes"],
    { cwd: root, encoding: "utf8", env: process.env, stdio: "pipe" },
  );
  process.stdout.write(push.stdout ?? "");
  process.stderr.write(push.stderr ?? "");
  if (push.status !== 0) {
    console.error("\nFAIL: db push exit", push.status);
    process.exit(push.status ?? 1);
  }
  console.log("\nOK: db push completed.\n");
  process.exit(0);
}

if (accessToken.length >= 20 && projectRef.length === 20) {
  console.log("\nMethod: Supabase Management API (/database/migrations)\n");
  for (const file of migrations) {
    const sql = readFileSync(join(root, "supabase", "migrations", file), "utf8");
    const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/migrations`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: file.replace(".sql", ""), query: sql }),
    });
    const body = await res.text();
    console.log(`${file}: HTTP ${res.status}`);
    if (!res.ok) {
      console.error(body);
      process.exit(1);
    }
  }
  console.log("\nOK: migrations applied via Management API.\n");
  process.exit(0);
}

console.error(`
FAIL: Cannot apply migrations — set ONE of these in .env.local:

  SUPABASE_DB_URL=postgresql://...
  SUPABASE_ACCESS_TOKEN=... + NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
`);
process.exit(1);
