#!/usr/bin/env node
/**
 * Apply nepse_company_statements migration to production.
 *
 * Requires ONE of:
 *   - SUPABASE_DB_URL in .env.local (Postgres URI)
 *   - SUPABASE_DB_PASSWORD + NEXT_PUBLIC_SUPABASE_URL
 *   - SUPABASE_ACCESS_TOKEN + NEXT_PUBLIC_SUPABASE_URL (Management API)
 *
 * Usage: node scripts/apply-nepse-company-statements-migration.mjs
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

const migrationFile = "20260727120000_nepse_company_statements.sql";

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
      console.log(`OK: applied ${migrationFile}`);
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

const dbUrl = resolveDbUrl();
if (!dbUrl) {
  console.error(
    "Missing DB credentials. Set SUPABASE_DB_URL (or SUPABASE_DB_PASSWORD + NEXT_PUBLIC_SUPABASE_URL) in .env.local",
  );
  process.exit(1);
}

if (process.argv.includes("--cli")) {
  applyWithCli(dbUrl);
} else {
  await applyWithPg(dbUrl);
}
