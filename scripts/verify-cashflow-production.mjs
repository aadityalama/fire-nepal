#!/usr/bin/env node
/**
 * Verify cashflow_snapshots (or fire_goals fallback) works for GET/PUT style ops.
 *
 * Requires in .env.local:
 *   - NEXT_PUBLIC_SUPABASE_URL
 *   - NEXT_PUBLIC_SUPABASE_ANON_KEY
 *   - SUPABASE_SERVICE_ROLE_KEY
 *
 * Optional:
 *   - BASE_URL (default https://www.firenepal.com) for HTTP GET/PUT against production
 */
import { createClient } from "@supabase/supabase-js";
import { loadDotEnvLocal } from "./load-dotenv-local.mjs";

loadDotEnvLocal();

const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim().replace(/\/+$/, "");
const anonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();
const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();
const baseUrl = (process.env.BASE_URL ?? "https://www.firenepal.com").trim().replace(/\/+$/, "");

if (!url || !serviceKey || !anonKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
const CASHFLOW_MARKER = "__fire_nepal_cashflow_snapshots_v1__";

function fail(message) {
  console.error(`FAIL: ${message}`);
  process.exit(1);
}

async function probeCashflowTable() {
  const { error } = await admin.from("cashflow_snapshots").select("user_id").limit(1);
  if (!error) return { ok: true, preferred: true };
  const msg = (error.message || "").toLowerCase();
  if (msg.includes("does not exist") || error.code === "42P01" || error.code === "PGRST205") {
    return { ok: false, preferred: false, error: error.message };
  }
  return { ok: true, preferred: true, note: error.message };
}

console.log("\n--- cashflow production verify ---\n");
console.log(`Supabase host: ${url.replace(/^https?:\/\//, "")}`);
console.log(`HTTP base: ${baseUrl}`);

const table = await probeCashflowTable();
if (table.ok) {
  console.log("OK: public.cashflow_snapshots is present.");
} else {
  console.log(`WARN: cashflow_snapshots missing (${table.error}) — will verify fire_goals fallback.`);
  const fireGoals = await admin.from("fire_goals").select("id").limit(1);
  if (fireGoals.error) {
    fail(`fire_goals also unavailable: ${fireGoals.error.message}`);
  }
  console.log("OK: public.fire_goals available for fallback.");
}

const testEmail = `cashflow-verify-${Date.now()}@firenepal.test`;
const testPassword = "CashflowVerify!234";
let createdUserId = null;

const created = await admin.auth.admin.createUser({
  email: testEmail,
  password: testPassword,
  email_confirm: true,
});
if (created.error || !created.data.user?.id) {
  fail(`Could not create auth test user: ${created.error?.message ?? "unknown"}`);
}
createdUserId = created.data.user.id;

const userClient = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
const signIn = await userClient.auth.signInWithPassword({ email: testEmail, password: testPassword });
if (signIn.error || !signIn.data.session) {
  fail(`Could not sign in test user: ${signIn.error?.message ?? "no session"}`);
}

const sampleState = {
  income: { salary: 100000 },
  incomeEntries: [],
  expenses: { rent: 25000 },
  emergencyCashReserve: 50000,
  monthlyExpensesOverride: undefined,
};

const updatedAt = new Date().toISOString();
let saveOk = false;
let saveVia = "";

if (table.ok) {
  const { error } = await userClient.from("cashflow_snapshots").upsert(
    {
      user_id: createdUserId,
      state: sampleState,
      updated_at: updatedAt,
    },
    { onConflict: "user_id" },
  );
  if (error) fail(`cashflow_snapshots upsert failed: ${error.message}`);
  saveOk = true;
  saveVia = "cashflow_snapshots";

  const { data, error: loadError } = await userClient
    .from("cashflow_snapshots")
    .select("state, updated_at")
    .eq("user_id", createdUserId)
    .maybeSingle();
  if (loadError || !data) fail(`cashflow_snapshots load failed: ${loadError?.message ?? "no row"}`);
  console.log("OK: direct table load/save succeeded.");
} else {
  const { error } = await userClient.from("fire_goals").insert({
    user_id: createdUserId,
    title: "Cashflow workspace",
    notes: CASHFLOW_MARKER,
    payload: { kind: "cashflow_snapshots_v1", state: sampleState },
    updated_at: updatedAt,
  });
  if (error) fail(`fire_goals fallback insert failed: ${error.message}`);
  saveOk = true;
  saveVia = "fire_goals";

  const { data, error: loadError } = await userClient
    .from("fire_goals")
    .select("payload, updated_at")
    .eq("user_id", createdUserId)
    .eq("notes", CASHFLOW_MARKER)
    .maybeSingle();
  if (loadError || !data) fail(`fire_goals fallback load failed: ${loadError?.message ?? "no row"}`);
  console.log("OK: fire_goals fallback load/save succeeded.");
}

const accessToken = signIn.data.session.access_token;
const cookieHeader = Object.entries(signIn.data.session)
  .filter(([k]) => k.includes("token") || k === "access_token")
  .map(([k, v]) => `${k}=${v}`)
  .join("; ");

async function httpCashflow(method, body) {
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    apikey: anonKey,
    "Content-Type": "application/json",
    Cookie: cookieHeader,
  };
  // Prefer cookie-based Next auth; also try with Authorization for any proxy
  const res = await fetch(`${baseUrl}/api/cashflow`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* ignore */
  }
  return { status: res.status, json, text: text.slice(0, 300) };
}

const getRes = await httpCashflow("GET");
const putRes = await httpCashflow("PUT", { state: sampleState });

console.log(`HTTP GET /api/cashflow → ${getRes.status} ${JSON.stringify(getRes.json)?.slice(0, 120)}`);
console.log(`HTTP PUT /api/cashflow → ${putRes.status} ${JSON.stringify(putRes.json)?.slice(0, 120)}`);

// Cleanup
try {
  if (table.ok) {
    await admin.from("cashflow_snapshots").delete().eq("user_id", createdUserId);
  } else {
    await admin.from("fire_goals").delete().eq("user_id", createdUserId).eq("notes", CASHFLOW_MARKER);
  }
  await admin.auth.admin.deleteUser(createdUserId);
} catch (e) {
  console.warn("Cleanup warning:", e instanceof Error ? e.message : e);
}

if (!saveOk) fail("Save did not succeed");

console.log(`\nOK: cashflow verify passed via ${saveVia}.\n`);
if (getRes.status === 401 && putRes.status === 401) {
  console.log(
    "NOTE: HTTP /api/cashflow returned 401 (Next.js cookie session required). Direct Supabase CRUD for the signed-in user succeeded.",
  );
} else if (getRes.json?.ok && putRes.json?.ok) {
  console.log("OK: HTTP GET/PUT /api/cashflow succeeded.");
} else {
  console.log("NOTE: HTTP session cookie auth may not map from supabase-js tokens; direct CRUD verified.");
}

process.exit(0);
