#!/usr/bin/env node
/**
 * Apply / verify public.finance_insurance_policies on production.
 *
 * Requires ONE of:
 *   - SUPABASE_DB_URL
 *   - DATABASE_URL / POSTGRES_URL
 *   - SUPABASE_ACCESS_TOKEN + NEXT_PUBLIC_SUPABASE_URL
 *
 * Usage:
 *   node scripts/apply-ensure-insurance-schema.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadDotEnvLocal } from "./load-dotenv-local.mjs";

const root = join(fileURLToPath(new URL(".", import.meta.url)), "..");
loadDotEnvLocal();

const sqlPath = join(root, "scripts/ensure-finance-insurance-policies-production.sql");
const sql = readFileSync(sqlPath, "utf8");
const projectUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim().replace(/\/+$/, "");
const projectRef = projectUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] ?? "mnxxcewvgnohsavojdzu";

function resolveDbUrl() {
  for (const key of ["SUPABASE_DB_URL", "DATABASE_URL", "POSTGRES_URL", "POSTGRES_PRISMA_URL"]) {
    const value = (process.env[key] ?? "").trim();
    if (value.length >= 20) return value;
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

function poolerFallbackUrls(dbUrl) {
  try {
    const u = new URL(dbUrl);
    const ref = u.hostname.match(/^db\.([^.]+)\.supabase\.co$/)?.[1];
    if (!ref) return [];
    const password = u.password;
    const user = `postgres.${ref}`;
    const regions = ["ap-southeast-1", "ap-south-1", "ap-southeast-2", "us-east-1"];
    const urls = [];
    for (const region of regions) {
      for (const cluster of [1, 0, 2]) {
        urls.push(
          `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@aws-${cluster}-${region}.pooler.supabase.com:6543/postgres`,
        );
      }
    }
    return urls;
  } catch {
    return [];
  }
}

async function applyWithPg(dbUrl) {
  const pg = (await import("pg")).default;
  const attempts = [dbUrl, ...poolerFallbackUrls(dbUrl)];
  let lastErr = null;
  for (const url of attempts) {
    const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
    try {
      console.log(`Trying ${url.includes("pooler") ? "pooler" : "direct"}…`);
      await client.connect();
      await client.query(sql);
      await client.end();
      console.log("OK: public.finance_insurance_policies ensured via pg");
      return true;
    } catch (e) {
      lastErr = e;
      try {
        await client.end();
      } catch {
        /* ignore */
      }
      console.error(`pg failed: ${e.message}`);
    }
  }
  console.error(lastErr?.message ?? "pg failed");
  return false;
}

async function applyWithManagementApi(accessToken) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: sql }),
  });
  const body = await res.text();
  console.log(`Management API HTTP ${res.status}`);
  if (!res.ok) {
    console.error(body);
    return false;
  }
  console.log("OK: public.finance_insurance_policies ensured via Management API");
  return true;
}

async function probeRest() {
  const anon = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();
  const url = projectUrl || `https://${projectRef}.supabase.co`;
  if (!anon) {
    console.log("Skip REST probe (no anon key)");
    return;
  }
  const res = await fetch(`${url}/rest/v1/finance_insurance_policies?select=id&limit=1`, {
    headers: { apikey: anon, Authorization: `Bearer ${anon}` },
  });
  const text = await res.text();
  console.log(`REST probe HTTP ${res.status}: ${text.slice(0, 180)}`);
}

console.log("--- ensure finance_insurance_policies ---");
console.log(`project: ${projectRef}`);
console.log(`supabase: ${projectUrl || `https://${projectRef}.supabase.co`}`);
console.log(`table: public.finance_insurance_policies`);

const dbUrl = resolveDbUrl();
const accessToken = (process.env.SUPABASE_ACCESS_TOKEN ?? "").trim();

if (dbUrl) {
  const ok = await applyWithPg(dbUrl);
  await probeRest();
  process.exit(ok ? 0 : 1);
}

if (accessToken) {
  const ok = await applyWithManagementApi(accessToken);
  await probeRest();
  process.exit(ok ? 0 : 1);
}

console.error("FAIL: set SUPABASE_DB_URL or SUPABASE_ACCESS_TOKEN in .env.local");
process.exit(1);
