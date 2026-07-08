#!/usr/bin/env node
/**
 * Verify finance_budget_records table exists, RLS works for authenticated users,
 * and service role CRUD succeeds.
 */
import { createClient } from "@supabase/supabase-js";
import { loadDotEnvLocal } from "./load-dotenv-local.mjs";

loadDotEnvLocal();

const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim().replace(/\/+$/, "");
const anonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();
const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();

if (!url || !serviceKey || !anonKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

function fail(message) {
  console.error(message);
  process.exit(1);
}

async function probeTable() {
  const { error } = await admin.from("finance_budget_records").select("id").limit(1);
  if (!error) return { ok: true };
  const msg = (error.message || "").toLowerCase();
  if (msg.includes("does not exist") || error.code === "42P01" || error.code === "PGRST205") {
    return { ok: false, error: error.message };
  }
  return { ok: true, note: error.message };
}

const table = await probeTable();
if (!table.ok) {
  fail(`finance_budget_records table missing: ${table.error}`);
}

console.log("finance_budget_records table exists.");

const testUserId = "00000000-0000-4000-8000-000000000001";
const testEmail = `budget-verify-${Date.now()}@firenepal.test`;
const testPassword = "BudgetVerify!234";
let createdUserId = null;
let insertedId = null;

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

const payload = {
  user_id: createdUserId,
  name: "Verify Budget",
  category: "Food",
  icon: "🍔",
  gradient: "from-emerald-300 to-lime-300",
  period: "Monthly",
  amount_npr: 10000,
  monthly_budget_npr: 10000,
  monthly_spent_npr: 0,
  days_remaining: 30,
  notification_settings: {
    "50% used": true,
    "75% used": true,
    "90% used": true,
    "100% used": true,
    "Overspend Alert": true,
  },
  ai_recommendation: null,
  sort_order: 0,
};

const { data: userInserted, error: userInsertError } = await userClient
  .from("finance_budget_records")
  .insert({
    name: payload.name,
    category: payload.category,
    icon: payload.icon,
    gradient: payload.gradient,
    period: payload.period,
    amount_npr: payload.amount_npr,
    monthly_budget_npr: payload.monthly_budget_npr,
    monthly_spent_npr: payload.monthly_spent_npr,
    days_remaining: payload.days_remaining,
    notification_settings: payload.notification_settings,
    ai_recommendation: payload.ai_recommendation,
    sort_order: payload.sort_order,
    user_id: createdUserId,
  })
  .select("id")
  .single();

if (userInsertError || !userInserted?.id) {
  fail(`Authenticated insert failed: ${userInsertError?.message ?? "unknown"}`);
}
insertedId = userInserted.id;
console.log("Authenticated insert OK:", insertedId);

const { data: userRows, error: userReadError } = await userClient
  .from("finance_budget_records")
  .select("id,name")
  .eq("id", insertedId)
  .maybeSingle();
if (userReadError || userRows?.name !== payload.name) {
  fail(`Authenticated read failed: ${userReadError?.message ?? "row mismatch"}`);
}
console.log("Authenticated read OK");

const { error: userUpdateError } = await userClient
  .from("finance_budget_records")
  .update({ name: "Verify Budget Updated", updated_at: new Date().toISOString() })
  .eq("id", insertedId);
if (userUpdateError) {
  fail(`Authenticated update failed: ${userUpdateError.message}`);
}
console.log("Authenticated update OK");

const { error: userDeleteError } = await userClient.from("finance_budget_records").delete().eq("id", insertedId);
if (userDeleteError) {
  fail(`Authenticated delete failed: ${userDeleteError.message}`);
}
console.log("Authenticated delete OK");
insertedId = null;

const { data: inserted, error: insertError } = await admin.from("finance_budget_records").insert(payload).select("id").single();
if (insertError || !inserted?.id) {
  fail(`Service role insert failed: ${insertError?.message ?? "unknown"}`);
}
insertedId = inserted.id;
console.log("Service role insert OK:", insertedId);

const { error: updateError } = await admin
  .from("finance_budget_records")
  .update({ name: "Verify Budget Updated", updated_at: new Date().toISOString() })
  .eq("id", insertedId);
if (updateError) {
  fail(`Service role update failed: ${updateError.message}`);
}
console.log("Service role update OK");

const { data: rows, error: readError } = await admin
  .from("finance_budget_records")
  .select("id,name")
  .eq("id", insertedId)
  .maybeSingle();
if (readError || rows?.name !== "Verify Budget Updated") {
  fail(`Service role read failed: ${readError?.message ?? "row mismatch"}`);
}
console.log("Service role read OK");

const { error: deleteError } = await admin.from("finance_budget_records").delete().eq("id", insertedId);
if (deleteError) {
  fail(`Service role delete failed: ${deleteError.message}`);
}
console.log("Service role delete OK");
insertedId = null;

if (createdUserId) {
  await admin.auth.admin.deleteUser(createdUserId);
}

console.log("finance_budget_records CRUD + RLS verification passed.");
