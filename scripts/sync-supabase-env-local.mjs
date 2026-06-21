#!/usr/bin/env node
/**
 * Writes NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
 * to .env.local using the Supabase CLI (same account as `supabase login` or SUPABASE_ACCESS_TOKEN).
 *
 * Usage:
 *   export SUPABASE_PROJECT_REF=your_project_ref   # from dashboard URL: app.supabase.com/project/<ref>
 *   npm run env:sync:supabase
 *
 * Or: node scripts/sync-supabase-env-local.mjs <project_ref>
 *
 * Requires: `npx supabase login` once, or SUPABASE_ACCESS_TOKEN in the environment.
 */

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const envLocalPath = join(root, ".env.local");

const projectRef = (process.argv[2] || process.env.SUPABASE_PROJECT_REF || "").trim();
if (!projectRef || projectRef.length < 10) {
  console.error(
    "Missing project ref. Set SUPABASE_PROJECT_REF or pass ref as first argument (see Supabase dashboard URL).",
  );
  process.exit(1);
}

const r = spawnSync(
  "npx",
  ["--yes", "supabase@latest", "projects", "api-keys", "--project-ref", projectRef, "-o", "json"],
  {
    cwd: root,
    encoding: "utf8",
    env: process.env,
  },
);

if (r.status !== 0) {
  console.error(r.stderr || r.stdout || "supabase projects api-keys failed");
  console.error("\nFix: run `npx supabase login` or set SUPABASE_ACCESS_TOKEN, then retry.");
  process.exit(r.status ?? 1);
}

let keys;
try {
  keys = JSON.parse(r.stdout || "[]");
} catch {
  console.error("Could not parse API keys JSON:", r.stdout?.slice(0, 200));
  process.exit(1);
}

const byName = (n) => keys.find((k) => k.name === n)?.api_key;
const anon = byName("publishable") ?? byName("anon");
const service = byName("secret") ?? byName("service_role");
if (!anon || !service) {
  console.error(
    "Unexpected api-keys payload; expected publishable/anon + secret/service_role:",
    JSON.stringify(keys, null, 2).slice(0, 500),
  );
  process.exit(1);
}

const url = `https://${projectRef}.supabase.co`;

let body = "";
if (existsSync(envLocalPath)) {
  body = readFileSync(envLocalPath, "utf8");
}

function upsertLine(text, key, value) {
  const line = `${key}=${value}`;
  const re = new RegExp(`^${key}=.*$`, "m");
  if (re.test(text)) return text.replace(re, line);
  const trimmed = text.trimEnd();
  const prefix = trimmed.length ? `${trimmed}\n` : "";
  return `${prefix}${line}\n`;
}

let next = body;
next = upsertLine(next, "NEXT_PUBLIC_SUPABASE_URL", url);
next = upsertLine(next, "NEXT_PUBLIC_SUPABASE_ANON_KEY", anon);
next = upsertLine(next, "SUPABASE_SERVICE_ROLE_KEY", service);

writeFileSync(envLocalPath, next, "utf8");
console.log(`Updated ${envLocalPath}`);
console.log(`  NEXT_PUBLIC_SUPABASE_URL=${url}`);
console.log(`  NEXT_PUBLIC_SUPABASE_ANON_KEY=(anon, ${anon.length} chars)`);
console.log(`  SUPABASE_SERVICE_ROLE_KEY=(service_role, ${service.length} chars)`);
