#!/usr/bin/env node
/**
 * Apply NEPSE Hub Admin overrides ensure-migration to production.
 *
 * Creates / repairs:
 *   - public.nepse_hub_admin_overrides
 *   - public.nepse_hub_admin_audit_log
 *   - indexes, timestamps, FKs, RLS policies
 *   - PostgREST schema reload
 *
 * Requires ONE of:
 *   - SUPABASE_DB_URL in .env.local (Postgres URI)
 *   - SUPABASE_DB_PASSWORD + NEXT_PUBLIC_SUPABASE_URL
 *   - SUPABASE_ACCESS_TOKEN + NEXT_PUBLIC_SUPABASE_URL (Management API)
 *
 * Usage: node scripts/apply-nepse-hub-admin-overrides-migration.mjs
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

const migrationFiles = [
  "20260727140000_nepse_hub_admin_overrides.sql",
  "20260728030400_nepse_hub_admin_overrides_ensure.sql",
];

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
      for (const migrationFile of migrationFiles) {
        const sql = readFileSync(join(root, "supabase", "migrations", migrationFile), "utf8");
        console.log(`Applying ${migrationFile}…`);
        await client.query(sql);
      }
      await client.query("notify pgrst, 'reload schema'");
      console.log("OK: nepse_hub_admin_overrides migrations applied + schema reloaded");
      await client.end();
      return;
    } catch (error) {
      lastErr = error;
      try {
        await client.end();
      } catch {
        /* ignore */
      }
    }
  }
  console.error("FAIL: pg apply failed:", lastErr?.message ?? lastErr);
  process.exit(1);
}

function applyWithCli(dbUrl) {
  console.log("\nMethod: supabase db push\n");
  const r = spawnSync(
    "npx",
    ["--yes", "supabase@latest", "db", "push", "--db-url", dbUrl, "--yes"],
    { cwd: root, encoding: "utf8", env: process.env },
  );
  if (r.status !== 0) {
    console.error(r.stderr || r.stdout || "supabase db push failed");
    process.exit(r.status ?? 1);
  }
  console.log(r.stdout || "OK");
}

async function applyWithManagementApi() {
  const token = (process.env.SUPABASE_ACCESS_TOKEN ?? "").trim();
  const projectUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim().replace(/\/+$/, "");
  const projectRef = projectUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] ?? "";
  if (!token || projectRef.length !== 20) return false;

  console.log("\nMethod: Supabase Management API (/database/migrations)\n");
  for (const file of migrationFiles) {
    const sql = readFileSync(join(root, "supabase", "migrations", file), "utf8");
    const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/migrations`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: file.replace(/\.sql$/, ""), query: sql }),
    });
    const text = await res.text();
    console.log(`${file}: HTTP ${res.status}`);
    if (!res.ok) {
      console.error(text);
      process.exit(1);
    }
  }
  console.log("\nOK: migrations applied via Management API.\n");
  return true;
}

console.log("\n--- NEPSE Hub Admin overrides production migration apply ---\n");
for (const m of migrationFiles) console.log("  -", m);

const dbUrl = resolveDbUrl();
if (process.argv.includes("--cli")) {
  if (!dbUrl) {
    console.error("Missing SUPABASE_DB_URL for --cli");
    process.exit(1);
  }
  applyWithCli(dbUrl);
} else if (dbUrl) {
  await applyWithPg(dbUrl);
} else if (await applyWithManagementApi()) {
  /* done */
} else {
  console.error(`
FAIL: Cannot apply migrations — set ONE of these in .env.local:
  - SUPABASE_DB_URL (or DATABASE_URL / POSTGRES_URL)
  - SUPABASE_DB_PASSWORD + NEXT_PUBLIC_SUPABASE_URL
  - SUPABASE_ACCESS_TOKEN + NEXT_PUBLIC_SUPABASE_URL

Or paste in order in the Supabase SQL Editor:
  supabase/migrations/${migrationFiles[0]}
  supabase/migrations/${migrationFiles[1]}
`);
  process.exit(1);
}
