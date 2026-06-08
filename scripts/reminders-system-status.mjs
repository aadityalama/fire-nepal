#!/usr/bin/env node
/**
 * Reports exact status for Smart Reminders + Supabase setup.
 * Loads `.env.local` without overriding existing env (same rule as Next.js precedence for shell exports).
 *
 * Usage:
 *   node scripts/reminders-system-status.mjs           # status only
 *   node scripts/reminders-system-status.mjs --push  # run `npm run db:push:remote` after status
 *   node scripts/reminders-system-status.mjs --verify-insert
 */

import { spawnSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";
import { loadDotEnvLocal, getRepoRoot } from "./load-dotenv-local.mjs";

function line(label, ok, detail) {
  const mark = ok ? "OK" : "FAIL";
  console.log(`[${mark}] ${label}${detail ? `: ${detail}` : ""}`);
}

function mask(s) {
  if (!s || s.length < 12) return s ? "(set, hidden)" : "";
  return `${s.slice(0, 8)}…${s.slice(-4)} (${s.length} chars)`;
}

function envPresent(name, minLen) {
  const v = process.env[name]?.trim();
  return { ok: Boolean(v && v.length >= minLen), value: v };
}

const args = new Set(process.argv.slice(2));
const doPush = args.has("--push");
const verifyInsert = args.has("--verify-insert");

console.log("=== Smart Reminders / Supabase — status ===\n");

const { path: envPath, loaded: envLoaded } = loadDotEnvLocal();
line(".env.local file", envLoaded, envLoaded ? envPath : `missing — create from .env.example (${getRepoRoot()}/.env.local)`);

const url = envPresent("NEXT_PUBLIC_SUPABASE_URL", 12);
line("NEXT_PUBLIC_SUPABASE_URL", url.ok, url.ok ? mask(url.value) : "not set or too short — copy Project URL from Supabase → Settings → API");

const anon = envPresent("NEXT_PUBLIC_SUPABASE_ANON_KEY", 20);
line(
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  anon.ok,
  anon.ok ? mask(anon.value) : "not set or too short — copy anon public key from Settings → API",
);

const service = envPresent("SUPABASE_SERVICE_ROLE_KEY", 20);
line(
  "SUPABASE_SERVICE_ROLE_KEY",
  service.ok,
  service.ok
    ? `${mask(service.value)} (not required for user save; required for cron + db:verify:reminders)`
    : "not set — optional for saving reminders in the app; required for /api/cron/scheduled-reminders and verify-insert",
);

const dbUrl = envPresent("SUPABASE_DB_URL", 24);
if (dbUrl.ok) {
  line("SUPABASE_DB_URL", true, "set (for npm run db:push:remote only; optional if you use SQL Editor)");
} else {
  console.log(
    `[SKIP] SUPABASE_DB_URL: not set (optional) — use for CLI migrations, or run SQL from supabase/migrations/ in the Supabase SQL Editor instead`,
  );
}

let tableOk = false;
let tableSkipped = !url.ok || !service.ok;
let tableDetail = tableSkipped
  ? "skipped — set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to probe (anon key alone cannot prove the table exists under RLS)"
  : "";

if (url.ok && service.ok) {
  const sb = createClient(url.value, service.value, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const probe = await sb.from("scheduled_reminders").select("id").limit(1);
  if (probe.error) {
    tableDetail = probe.error.message;
    tableOk = false;
    tableSkipped = false;
  } else {
    tableOk = true;
    tableDetail = "relation reachable via PostgREST (select ok)";
    tableSkipped = false;
  }
}
if (tableSkipped) {
  console.log(`[SKIP] public.scheduled_reminders (API): ${tableDetail}`);
} else {
  line("public.scheduled_reminders (API)", tableOk, tableDetail);
}

let insertProbeOk = null;
if (verifyInsert) {
  if (!url.ok || !service.ok) {
    console.log(
      `[SKIP] INSERT smoke test: need NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (same as table probe)`,
    );
  } else {
    const sbVerify = createClient(url.value, service.value, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: listData, error: listErr } = await sbVerify.auth.admin.listUsers({ page: 1, perPage: 1 });
    if (listErr) {
      line("INSERT smoke test", false, listErr.message);
      insertProbeOk = false;
    } else {
      const userId = listData?.users?.[0]?.id;
      if (!userId) {
        line("INSERT smoke test", false, "no users in auth.users — create a user first, then re-run with --verify-insert");
        insertProbeOk = false;
      } else {
        const row = {
          user_id: userId,
          title: "__reminders_status_probe__",
          amount: null,
          due_date: new Date().toISOString().slice(0, 10),
          due_time: "09:00",
          timezone: "Asia/Kathmandu",
          email: "probe@example.invalid",
          repeat_frequency: "once",
          notify_7d: false,
          notify_3d: false,
          notify_1d: false,
          notify_at_due: false,
          notify_overdue: false,
          reminder_type: "room_rent",
          notes: null,
          shared_with_family: false,
          is_completed: false,
        };
        const ins = await sbVerify.from("scheduled_reminders").insert(row).select("id").single();
        if (ins.error) {
          line("INSERT smoke test", false, ins.error.message);
          insertProbeOk = false;
        } else {
          const id = ins.data?.id;
          const del = await sbVerify.from("scheduled_reminders").delete().eq("id", id);
          const ok = !del.error;
          line("INSERT smoke test", ok, del.error ? del.error.message : "insert + delete ok");
          insertProbeOk = ok;
        }
      }
    }
  }
}
const appConfigured = url.ok && anon.ok;
const tableConfigured = !tableSkipped && tableOk;
console.log("\n--- Summary ---");
console.log(`  App cloud save (URL + anon): ${appConfigured ? "OK" : "FAIL"}`);
console.log(`  Service role + table probe: ${tableSkipped ? "SKIP" : tableConfigured ? "OK" : "FAIL"}`);
console.log(`  Migrations CLI (SUPABASE_DB_URL): ${dbUrl.ok ? "OK" : "SKIP (optional)"}`);
if (verifyInsert) {
  console.log(
    `  INSERT smoke test: ${!url.ok || !service.ok ? "SKIP" : insertProbeOk === true ? "OK" : insertProbeOk === false ? "FAIL" : "not run"}`,
  );
}
console.log(
  "\nNext.js loads variables from .env.local when you run `npm run dev` (and from Vercel env in production).",
);
console.log("CLI scripts load the same file via this script (without overriding already-exported vars).\n");

let exitCode = 0;
if (!appConfigured) exitCode = 1;
if (!tableSkipped && !tableOk) exitCode = 1;
if (verifyInsert && url.ok && service.ok && insertProbeOk === false) exitCode = 1;

if (doPush) {
  if (!dbUrl.ok) {
    console.log(
      "[SKIP] --push: SUPABASE_DB_URL not set. Apply pending files under supabase/migrations/ in the Supabase SQL Editor (in timestamp order), or set SUPABASE_DB_URL and run again.\n",
    );
  } else {
  console.log("Running: npm run db:push:remote …\n");
  const r = spawnSync("npm", ["run", "db:push:remote"], {
    stdio: "inherit",
    shell: false,
    cwd: getRepoRoot(),
    env: process.env,
  });
  if (r.status !== 0) {
    console.log("\n[FAIL] db push exited non-zero.\n");
    process.exit(r.status ?? 1);
  }
  console.log("\n[OK] db push finished. Re-run: npm run reminders:status\n");
  if (appConfigured) exitCode = 0;
  }
}

process.exit(exitCode);