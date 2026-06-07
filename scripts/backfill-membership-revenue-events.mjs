#!/usr/bin/env node
/**
 * Insert missing `revenue_events` rows for approved `membership_requests`, using each
 * request's stored `amount_npr` (not catalog prices at script run time).
 *
 * Skips a request if a ledger row already exists with the same `membership_request_id`
 * or legacy `external_ref` = `membership_request:<id>`.
 *
 * Usage:
 *   node scripts/backfill-membership-revenue-events.mjs           # apply
 *   node scripts/backfill-membership-revenue-events.mjs --dry-run
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (.env.local via loadDotEnvLocal).
 */

import { createClient } from "@supabase/supabase-js";
import { loadDotEnvLocal, getRepoRoot } from "./load-dotenv-local.mjs";

const dryRun = process.argv.includes("--dry-run");

loadDotEnvLocal();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const service = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!url || !service) {
  console.error("Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const sb = createClient(url, service, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function externalRefForRequest(id) {
  return `membership_request:${id}`;
}

function parseAmount(v) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

const { data: requests, error: reqErr } = await sb
  .from("membership_requests")
  .select("id, user_id, plan_type, payment_method, amount_npr, reviewed_at, created_at, status")
  .eq("status", "approved");

if (reqErr) {
  console.error("Failed to load membership_requests:", reqErr.message);
  process.exit(1);
}

const list = requests ?? [];
let inserted = 0;
let skipped = 0;
let skippedBad = 0;

for (const req of list) {
  const id = req.id;
  const ref = externalRefForRequest(id);

  const { data: byId, error: e1 } = await sb
    .from("revenue_events")
    .select("id")
    .eq("membership_request_id", id)
    .limit(1)
    .maybeSingle();

  if (e1) {
    console.error("Lookup by membership_request_id failed:", e1.message);
    process.exit(1);
  }
  if (byId) {
    skipped += 1;
    continue;
  }

  const { data: byRef, error: e2 } = await sb.from("revenue_events").select("id").eq("external_ref", ref).limit(1).maybeSingle();

  if (e2) {
    console.error("Lookup by external_ref failed:", e2.message);
    process.exit(1);
  }
  if (byRef) {
    skipped += 1;
    continue;
  }

  const amountNpr = parseAmount(req.amount_npr);
  if (!amountNpr) {
    console.warn(`Skip ${id}: invalid or missing amount_npr`);
    skippedBad += 1;
    continue;
  }

  const pm = req.payment_method;
  if (pm !== "khalti_qr" && pm !== "esewa_qr" && pm !== "global_ime_qr") {
    console.warn(`Skip ${id}: invalid payment_method`);
    skippedBad += 1;
    continue;
  }

  const plan = req.plan_type;
  if (plan !== "premium" && plan !== "elite") {
    console.warn(`Skip ${id}: invalid plan_type`);
    skippedBad += 1;
    continue;
  }

  const createdAt = req.reviewed_at || req.created_at || new Date().toISOString();

  const row = {
    user_id: req.user_id,
    membership_request_id: id,
    plan_type: plan,
    amount_npr: amountNpr,
    payment_method: pm,
    event_type: "membership_payment",
    kind: "subscription",
    created_at: createdAt,
    external_ref: ref,
  };

  if (dryRun) {
    console.log("[dry-run] would insert revenue_events for membership_request", id, row);
    inserted += 1;
    continue;
  }

  const { error: insErr } = await sb.from("revenue_events").insert(row);
  if (insErr) {
    console.error(`Insert failed for ${id}:`, insErr.message);
    process.exit(1);
  }
  inserted += 1;
}

console.log(
  dryRun ? `[dry-run] would insert: ${inserted}` : `Inserted: ${inserted}`,
  `| Already had ledger row: ${skipped} | Skipped invalid request: ${skippedBad} | Repo: ${getRepoRoot()}`,
);
