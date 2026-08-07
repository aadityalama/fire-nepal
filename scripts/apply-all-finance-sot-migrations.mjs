#!/usr/bin/env node
/**
 * Apply ALL finance SoT production migrations (idempotent), then probe PostgREST.
 *
 * Requires .env.local:
 *   SUPABASE_DB_URL (or SUPABASE_ACCESS_TOKEN + NEXT_PUBLIC_SUPABASE_URL)
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */
import { spawnSync } from "node:child_process";
import { readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { loadDotEnvLocal } from "./load-dotenv-local.mjs";

const root = join(fileURLToPath(new URL(".", import.meta.url)), "..");
loadDotEnvLocal();

const outDir = join(root, "tmp-finance-sot-verify");
mkdirSync(outDir, { recursive: true });

const migrationFiles = [
  "supabase/migrations/20260804120000_cashflow_snapshots_ensure.sql",
  "supabase/migrations/20260801143000_finance_savings_workspace_ensure.sql",
  "scripts/ensure-finance-insurance-policies-production.sql",
  "supabase/migrations/20260807120000_user_module_snapshots.sql",
  "supabase/migrations/20260806120000_group_members_persist_names.sql",
  "supabase/migrations/20260729120000_finance_budget_notes.sql",
  "supabase/migrations/20260708190000_finance_budget_records.sql",
];

const probeTables = [
  "cashflow_snapshots",
  "finance_savings_workspace",
  "finance_insurance_policies",
  "user_module_snapshots",
  "finance_budget_records",
  "group_members",
  "group_expenses",
  "bank_accounts",
  "investments",
  "gold_assets",
  "real_estate",
];

function resolveDbUrl() {
  for (const key of ["SUPABASE_DB_URL", "DATABASE_URL", "POSTGRES_URL", "POSTGRES_URL_NON_POOLING"]) {
    const v = (process.env[key] ?? "").trim();
    if (v.length >= 20) return v;
  }
  const password = (process.env.SUPABASE_DB_PASSWORD ?? "").trim();
  const projectUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
  const ref = projectUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] ?? "mnxxcewvgnohsavojdzu";
  if (password.length >= 4) {
    return `postgresql://postgres:${encodeURIComponent(password)}@db.${ref}.supabase.co:5432/postgres`;
  }
  return "";
}

async function applyViaPg(dbUrl, sql, label) {
  const { default: pg } = await import("pg");
  const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    await client.query(sql);
    console.log(`OK pg: ${label}`);
    return true;
  } finally {
    await client.end();
  }
}

async function applyViaManagementApi(projectRef, accessToken, sql, label) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: sql }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Management API failed for ${label}: ${res.status} ${text.slice(0, 400)}`);
  }
  console.log(`OK management-api: ${label}`);
  return true;
}

const report = {
  startedAt: new Date().toISOString(),
  applied: [],
  probes: {},
  ok: false,
  error: null,
};

try {
  const dbUrl = resolveDbUrl();
  const accessToken = (process.env.SUPABASE_ACCESS_TOKEN ?? "").trim();
  const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
  const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();
  const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] ?? "mnxxcewvgnohsavojdzu";

  if (!dbUrl && !accessToken) {
    throw new Error("Missing SUPABASE_DB_URL (or SUPABASE_ACCESS_TOKEN). Cannot apply production SQL.");
  }
  if (!supabaseUrl || !serviceKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  }

  for (const rel of migrationFiles) {
    const full = join(root, rel);
    if (!existsSync(full)) {
      report.applied.push({ file: rel, ok: false, message: "file missing" });
      continue;
    }
    const sql = readFileSync(full, "utf8");
    try {
      if (dbUrl) {
        await applyViaPg(dbUrl, sql, rel);
      } else {
        await applyViaManagementApi(projectRef, accessToken, sql, rel);
      }
      report.applied.push({ file: rel, ok: true, message: "applied" });
    } catch (error) {
      // Pooler fallback for direct URL failures
      if (dbUrl) {
        try {
          const u = new URL(dbUrl);
          const ref = u.hostname.match(/^db\.([^.]+)\.supabase\.co$/)?.[1] ?? projectRef;
          const pooler = `postgresql://postgres.${ref}:${u.password}@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`;
          await applyViaPg(pooler, sql, `${rel} (pooler)`);
          report.applied.push({ file: rel, ok: true, message: "applied via pooler" });
          continue;
        } catch (e2) {
          report.applied.push({
            file: rel,
            ok: false,
            message: `${error instanceof Error ? error.message : String(error)} | pooler: ${e2 instanceof Error ? e2.message : String(e2)}`,
          });
          continue;
        }
      }
      report.applied.push({
        file: rel,
        ok: false,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // Reload schema
  if (dbUrl) {
    try {
      await applyViaPg(dbUrl, "notify pgrst, 'reload schema';", "postgrest reload");
    } catch {
      /* ignore */
    }
  }

  await new Promise((r) => setTimeout(r, 2000));

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  for (const table of probeTables) {
    const { error } = await admin.from(table).select("*").limit(1);
    if (!error) {
      report.probes[table] = { exists: true, error: null };
      console.log(`PROBE OK: ${table}`);
    } else {
      const missing =
        error.code === "PGRST205" || /does not exist|schema cache|could not find the table/i.test(error.message);
      report.probes[table] = { exists: !missing, error: `${error.code ?? ""}: ${error.message}` };
      console.log(`PROBE ${missing ? "MISSING" : "ERR"}: ${table} — ${error.message}`);
    }
  }

  const required = [
    "cashflow_snapshots",
    "finance_savings_workspace",
    "finance_insurance_policies",
    "user_module_snapshots",
    "finance_budget_records",
  ];
  const missing = required.filter((t) => !report.probes[t]?.exists);
  report.ok = missing.length === 0 && report.applied.every((a) => a.ok || a.message.includes("already"));
  if (missing.length) {
    report.error = `Missing required tables: ${missing.join(", ")}`;
  }

  // Also push via supabase CLI when DB URL present
  if (dbUrl) {
    const push = spawnSync(
      "npx",
      ["--yes", "supabase@latest", "db", "push", "--db-url", dbUrl, "--yes"],
      {
        cwd: root,
        encoding: "utf8",
        env: { ...process.env, SUPABASE_CLI_DISABLE_TELEMETRY: "1", DO_NOT_TRACK: "1" },
      },
    );
    report.cliPush = {
      status: push.status,
      stdout: (push.stdout ?? "").slice(-2000),
      stderr: (push.stderr ?? "").slice(-2000),
    };
    console.log(`CLI db push exit=${push.status}`);
  }
} catch (error) {
  report.ok = false;
  report.error = error instanceof Error ? error.message : String(error);
  console.error(report.error);
}

report.finishedAt = new Date().toISOString();
const outPath = join(outDir, "migration-report.json");
writeFileSync(outPath, JSON.stringify(report, null, 2));
console.log(`Wrote ${outPath}`);
console.log(JSON.stringify({ ok: report.ok, error: report.error, probes: report.probes }, null, 2));
process.exit(report.ok ? 0 : 1);
