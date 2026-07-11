#!/usr/bin/env node
/**
 * Verify Group Expenses History production persistence through PostgREST.
 *
 * Checks:
 *   - group_expenses is visible to PostgREST
 *   - required columns are selectable
 *   - pre-existing history count is preserved
 *   - authenticated save -> fresh client refresh -> history load works
 *   - authenticated RLS blocks another user from reading the probe row
 */
import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { loadDotEnvLocal, getRepoRoot } from "./load-dotenv-local.mjs";

loadDotEnvLocal();

const root = getRepoRoot();
const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim().replace(/\/+$/, "");
const anonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();
const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();

const report = { ok: false, steps: [] };
let ownerUserId = null;
let otherUserId = null;
let probeId = null;

function step(name, ok, detail) {
  report.steps.push({ name, ok, detail });
  console.log(`${ok ? "OK" : "FAIL"} ${name}${detail ? `: ${detail}` : ""}`);
}

function fail(name, detail) {
  step(name, false, detail);
  report.ok = false;
  console.log("\n" + JSON.stringify(report, null, 2));
  process.exit(1);
}

function resolveDbUrl() {
  const direct = (
    process.env.SUPABASE_DB_URL ??
    process.env.DATABASE_URL ??
    process.env.POSTGRES_URL ??
    ""
  ).trim();
  if (direct.length >= 20) return direct;

  const password = (process.env.SUPABASE_DB_PASSWORD ?? "").trim();
  const projectRef = url.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] ?? "";
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

async function verifyPolicyDefinitions(dbUrl) {
  if (!dbUrl) {
    step("RLS policy catalog check", true, "skipped catalog query; no Postgres URL provided");
    return;
  }

  let pg;
  try {
    pg = (await import("pg")).default;
  } catch {
    step("RLS policy catalog check", true, "skipped catalog query; pg package unavailable");
    return;
  }

  const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  try {
    await client.connect();
    const table = await client.query(
      "select relrowsecurity from pg_class where oid = 'public.group_expenses'::regclass",
    );
    const policies = await client.query(
      "select policyname, cmd from pg_policies where schemaname = 'public' and tablename = 'group_expenses' order by policyname",
    );
    await client.end();

    const names = policies.rows.map((row) => row.policyname);
    const required = [
      "group_expenses_select",
      "group_expenses_insert",
      "group_expenses_update",
      "group_expenses_delete",
    ];
    const missing = required.filter((name) => !names.includes(name));
    const rlsEnabled = table.rows[0]?.relrowsecurity === true;
    step("RLS enabled on group_expenses", rlsEnabled);
    step("RLS policies exist", missing.length === 0, missing.length ? `missing: ${missing.join(", ")}` : names.join(", "));
  } catch (e) {
    try {
      await client.end();
    } catch {
      /* ignore */
    }
    step("RLS policy catalog check", false, e.message);
  }
}

async function createSignedInUser(admin, label) {
  const email = `group-expenses-${label}-${Date.now()}-${Math.random().toString(16).slice(2)}@firenepal.test`;
  const password = "GroupExpensesVerify!234";
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (created.error || !created.data.user?.id) {
    throw new Error(`create ${label} user failed: ${created.error?.message ?? "no user id"}`);
  }

  const userId = created.data.user.id;
  const client = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const signIn = await client.auth.signInWithPassword({ email, password });
  if (signIn.error || !signIn.data.session) {
    throw new Error(`sign in ${label} user failed: ${signIn.error?.message ?? "no session"}`);
  }

  return { client, email, password, userId };
}

async function ensureWorkspace(client, userId) {
  const existing = await client.from("workspaces").select("id,user_id").eq("user_id", userId).maybeSingle();
  if (existing.error) throw new Error(`workspace read failed: ${existing.error.message}`);
  if (existing.data?.id) return existing.data.id;

  const created = await client.from("workspaces").insert({ user_id: userId }).select("id").single();
  if (created.error || !created.data?.id) {
    throw new Error(`workspace create failed: ${created.error?.message ?? "no workspace id"}`);
  }
  return created.data.id;
}

async function cleanup(admin) {
  if (probeId) {
    await admin.from("group_expenses").delete().eq("id", probeId);
    probeId = null;
  }
  if (ownerUserId) {
    await admin.auth.admin.deleteUser(ownerUserId);
    ownerUserId = null;
  }
  if (otherUserId) {
    await admin.auth.admin.deleteUser(otherUserId);
    otherUserId = null;
  }
}

if (!url || !anonKey || !serviceKey) {
  fail("required environment", "Missing NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, or SUPABASE_SERVICE_ROLE_KEY");
}

const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
const groupExpenseColumns =
  "id,workspace_id,user_id,local_expense_id,title,amount,payer_member_id,category,split_equally,expense_date,split_among,split_percentages,amount_currency,receipt_image_url,notes,deleted_at,created_at,updated_at";

try {
  const requiredColumns = await admin
    .from("group_expenses")
    .select(groupExpenseColumns, { count: "exact", head: true });
  if (requiredColumns.error) {
    const code = requiredColumns.error.code ? ` (${requiredColumns.error.code})` : "";
    fail("group_expenses visible to PostgREST", `${requiredColumns.error.message}${code}`);
  }
  const beforeCount = requiredColumns;
  step("group_expenses visible to PostgREST", true, `${beforeCount.count ?? 0} existing rows`);
  step("required Group Expenses columns", true);

  await verifyPolicyDefinitions(resolveDbUrl());

  const owner = await createSignedInUser(admin, "owner");
  ownerUserId = owner.userId;
  const other = await createSignedInUser(admin, "other");
  otherUserId = other.userId;

  const workspaceId = await ensureWorkspace(owner.client, owner.userId);
  step("authenticated workspace ready", true, workspaceId);

  const localExpenseId = Date.now();
  const payload = {
    workspace_id: workspaceId,
    user_id: owner.userId,
    local_expense_id: localExpenseId,
    title: "Group Expenses History verify",
    amount: 1234.56,
    payer_member_id: "member-1",
    category: "Other",
    split_equally: true,
    expense_date: "2026-07-11",
    split_among: ["member-1", "member-2"],
    split_percentages: { "member-1": 50, "member-2": 50 },
    amount_currency: "NPR",
    notes: "Automated Group Expenses History verification row",
  };

  const saved = await owner.client.from("group_expenses").insert(payload).select("id,title,local_expense_id").single();
  if (saved.error || !saved.data?.id) {
    fail("authenticated save", saved.error?.message ?? "no inserted row");
  }
  probeId = saved.data.id;
  step("authenticated save", true, probeId);

  const refreshedClient = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const refreshedSignIn = await refreshedClient.auth.signInWithPassword({ email: owner.email, password: owner.password });
  if (refreshedSignIn.error || !refreshedSignIn.data.session) {
    fail("refresh sign-in", refreshedSignIn.error?.message ?? "no refreshed session");
  }

  const history = await refreshedClient
    .from("group_expenses")
    .select("id,title,local_expense_id,expense_date,created_at")
    .eq("workspace_id", workspaceId)
    .is("deleted_at", null)
    .order("expense_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(30);
  if (history.error) {
    fail("Full History loads", history.error.message);
  }
  const found = (history.data ?? []).some((row) => row.id === probeId && row.local_expense_id === localExpenseId);
  step("save -> refresh -> history", found, found ? "probe row returned in Full History query" : "probe row missing");

  const otherRead = await other.client.from("group_expenses").select("id").eq("id", probeId);
  if (otherRead.error) {
    fail("RLS blocks other user read", otherRead.error.message);
  }
  step("RLS blocks other user read", (otherRead.data ?? []).length === 0);

  const removed = await owner.client.from("group_expenses").delete().eq("id", probeId);
  if (removed.error) {
    fail("authenticated cleanup delete", removed.error.message);
  }
  probeId = null;
  step("authenticated cleanup delete", true);

  const afterCount = await admin.from("group_expenses").select("id", { count: "exact", head: true });
  if (afterCount.error) {
    fail("existing history preserved", afterCount.error.message);
  }
  step(
    "existing history preserved",
    beforeCount.count === afterCount.count,
    `before=${beforeCount.count ?? 0}, after=${afterCount.count ?? 0}`,
  );

  await cleanup(admin);
  report.ok = report.steps.every((item) => item.ok);
  console.log("\n" + JSON.stringify(report, null, 2));
  process.exit(report.ok ? 0 : 1);
} catch (e) {
  step("unexpected verifier error", false, e.message);
  await cleanup(admin);
  report.ok = false;
  console.log("\n" + JSON.stringify(report, null, 2));
  process.exit(1);
}
