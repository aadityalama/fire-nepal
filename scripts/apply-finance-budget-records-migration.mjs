#!/usr/bin/env node
/**
 * Apply finance_budget_records migration to production.
 *
 * Requires ONE of:
 *   - SUPABASE_DB_URL in .env.local (Postgres URI)
 *   - SUPABASE_DB_PASSWORD + NEXT_PUBLIC_SUPABASE_URL
 *   - SUPABASE_ACCESS_TOKEN in .env.local + NEXT_PUBLIC_SUPABASE_URL
 *
 * Alternative: run combined SQL in Supabase SQL Editor:
 *   scripts/finance-budget-records-production-migration-combined.sql
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

const migrationFile = "20260708190000_finance_budget_records.sql";
const migrations = [migrationFile];

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

function poolerFallbackUrls(dbUrl) {
  try {
    const u = new URL(dbUrl);
    const ref = u.hostname.match(/^db\.([^.]+)\.supabase\.co$/)?.[1];
    if (!ref) return [];
    const password = u.password;
    const user = `postgres.${ref}`;
    const regions = [
      "ap-southeast-2",
      "ap-south-1",
      "ap-southeast-1",
      "us-east-1",
      "us-east-2",
      "us-west-1",
      "eu-west-1",
      "eu-central-1",
    ];
    const urls = [];
    for (const region of regions) {
      for (const cluster of [1, 0, 2]) {
        urls.push(
          `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@aws-${cluster}-${region}.pooler.supabase.com:6543/postgres`,
          `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@aws-${cluster}-${region}.pooler.supabase.com:5432/postgres`,
        );
      }
    }
    return urls;
  } catch {
    return [];
  }
}

async function applyWithPg(dbUrl) {
  const sql = readFileSync(join(root, "supabase", "migrations", migrationFile), "utf8");
  let pg;
  try {
    pg = (await import("pg")).default;
  } catch {
    console.error("FAIL: pg package not installed. Run: npm install pg");
    process.exit(1);
  }

  const attempts = [dbUrl, ...poolerFallbackUrls(dbUrl)];
  let lastErr = null;
  for (const url of attempts) {
    const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
    try {
      console.log(`\nMethod: pg direct SQL (${url.includes("pooler") ? "pooler IPv4" : "direct"})\n`);
      await client.connect();
      await client.query(sql);
      await client.query("notify pgrst, 'reload schema'");
      await client.end();
      console.log("\nOK: migration SQL applied via pg.\n");
      return true;
    } catch (e) {
      lastErr = e;
      try {
        await client.end();
      } catch {
        /* ignore */
      }
      console.error(`pg attempt failed: ${e.message}`);
    }
  }
  console.error(`\nFAIL: pg could not apply migration — ${lastErr?.message ?? "unknown error"}\n`);
  return false;
}

async function applyWithManagementApi(accessToken, projectRef) {
  console.log("\nMethod: Supabase Management API (/database/query)\n");
  const sql = readFileSync(join(root, "supabase", "migrations", migrationFile), "utf8");
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: sql }),
  });
  const body = await res.text();
  console.log(`${migrationFile}: HTTP ${res.status}`);
  if (!res.ok) {
    console.error(body);
    return false;
  }
  console.log("\nOK: migration applied via Management API.\n");
  return true;
}

const dbUrl = resolveDbUrl();
const accessToken = (process.env.SUPABASE_ACCESS_TOKEN ?? "").trim();
const projectUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim().replace(/\/+$/, "");
const projectRef = projectUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] ?? "";

console.log("\n--- finance_budget_records production migration apply ---\n");
for (const m of migrations) console.log("  -", m);
console.log(`  SUPABASE_DB_URL length: ${dbUrl.length}`);
console.log(`  SUPABASE_ACCESS_TOKEN length: ${accessToken.length}`);

if (dbUrl.length >= 20) {
  const ok = await applyWithPg(dbUrl);
  if (ok) process.exit(0);

  console.log("\nFallback: supabase db push (--db-url)\n");
  const push = spawnSync(
    "npx",
    ["--yes", "supabase@latest", "db", "push", "--db-url", dbUrl, "--yes"],
    { cwd: root, encoding: "utf8", env: process.env, stdio: "pipe" },
  );
  process.stdout.write(push.stdout ?? "");
  process.stderr.write(push.stderr ?? "");
  if (push.status === 0) {
    console.log("\nOK: db push completed.\n");
    process.exit(0);
  }
  process.exit(push.status ?? 1);
}

if (accessToken.length >= 20 && projectRef.length === 20) {
  const ok = await applyWithManagementApi(accessToken, projectRef);
  if (ok) process.exit(0);
  process.exit(1);
}

console.error(`
FAIL: Cannot apply migrations — set ONE of these in .env.local:

  SUPABASE_DB_URL=postgresql://postgres:YOUR_PASSWORD@db.mnxxcewvgnohsavojdzu.supabase.co:5432/postgres

  SUPABASE_DB_PASSWORD=your_database_password

  SUPABASE_ACCESS_TOKEN=sbp_...   (Dashboard → Account → Access Tokens)

Alternative: run combined SQL in Supabase SQL Editor:
  scripts/finance-budget-records-production-migration-combined.sql
`);
process.exit(1);
