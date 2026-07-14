#!/usr/bin/env node
/**
 * Production membership verification — abort if any paid plan would regress.
 * Exit 1 on regression → callers must abort commit/push.
 */
import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadDotEnvLocal } from "./load-dotenv-local.mjs";

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  const text = readFileSync(path, "utf8");
  for (const line of text.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    const key = t.slice(0, i).trim();
    let val = t.slice(i + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

loadDotEnvLocal();
loadEnvFile(resolve(process.cwd(), ".env.production.local"));

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing Supabase URL or service role key");
  process.exit(1);
}

const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const PLANS = new Set(["free", "premium", "elite"]);

let rows = [];
{
  const full = await sb
    .from("user_profiles")
    .select(
      "id, full_name, membership_plan, membership_start, membership_expiry, membership_suspended_at, membership_archived_at",
    );
  if (!full.error) {
    rows = full.data ?? [];
  } else {
    const fallback = await sb
      .from("user_profiles")
      .select("id, full_name, membership_plan, membership_start, membership_expiry");
    if (fallback.error) {
      console.error("Failed to load user_profiles:", full.error.message);
      process.exit(1);
    }
    console.warn("membership access flag columns missing — verifying plan columns only.");
    rows = fallback.data ?? [];
  }
}

const ids = new Set();
const regressions = [];

for (const row of rows) {
  if (ids.has(row.id)) {
    regressions.push({ userId: row.id, issue: "duplicate user_profiles row" });
  }
  ids.add(row.id);

  const plan = typeof row.membership_plan === "string" ? row.membership_plan.trim().toLowerCase() : null;
  if (!plan || !PLANS.has(plan)) {
    regressions.push({
      userId: row.id,
      issue: `invalid membership_plan=${JSON.stringify(row.membership_plan)}`,
    });
  }
}

const byPlan = { free: 0, premium: 0, elite: 0 };
for (const row of rows) {
  const plan = String(row.membership_plan || "").toLowerCase();
  if (plan in byPlan) byPlan[plan] += 1;
}

const paidUsers = rows
  .filter((r) => r.membership_plan === "premium" || r.membership_plan === "elite")
  .map((r) => ({
    id: r.id,
    name: r.full_name,
    plan: r.membership_plan,
    start: r.membership_start,
    expiry: r.membership_expiry,
    suspended: r.membership_suspended_at ?? null,
    archived: r.membership_archived_at ?? null,
  }));

console.log(
  JSON.stringify(
    {
      ok: regressions.length === 0,
      users: rows.length,
      uniqueUsers: ids.size,
      byPlan,
      paidUsers,
      regressions,
    },
    null,
    2,
  ),
);

if (regressions.length > 0) {
  console.error(`ABORT: ${regressions.length} membership regression(s) detected.`);
  process.exit(1);
}

console.log("Production membership verification passed — no regressions.");
