#!/usr/bin/env node
/**
 * Insert missing `revenue_events` rows for approved `membership_requests`, using each
 * request's stored `amount_npr` (not catalog prices at script run time).
 *
 * Skips a request if a ledger row already exists with the same `membership_request_id`
 * or legacy `external_ref` = `membership_request:<id>`.
 *
 * Usage:
 *   node scripts/backfill-membership-revenue-events.mjs           # apply + verification summary
 *   node scripts/backfill-membership-revenue-events.mjs --dry-run
 *   node scripts/backfill-membership-revenue-events.mjs --verify-only
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.
 * Loads `.env.local` first; then fills any still-empty keys from `.env.production.local` if present.
 * Production (Node 20+): you may still use `node --env-file=.env.production.local scripts/...`.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { loadDotEnvLocal, getRepoRoot } from "./load-dotenv-local.mjs";

const dryRun = process.argv.includes("--dry-run");
const verifyOnly = process.argv.includes("--verify-only");

/** Must match `src/lib/membership-payment.ts` MEMBERSHIP_PLAN_PRICE_NPR (list-price sanity check). */
const CATALOG_PREMIUM_NPR = 500;
const CATALOG_ELITE_NPR = 800;

/** Fill `process.env` keys that are still missing or empty (same line format as `.env.local`). */
function applyEnvFileMissingKeys(relPath) {
  const full = join(getRepoRoot(), relPath);
  if (!existsSync(full)) return;
  const text = readFileSync(full, "utf8");
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    const cur = process.env[key];
    const curEmpty = cur === undefined || cur === null || String(cur).trim() === "";
    if (curEmpty && val) process.env[key] = val;
  }
}

loadDotEnvLocal();
applyEnvFileMissingKeys(".env.production.local");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const service = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!url || !service) {
  console.error(
    "Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (set in .env.local and/or .env.production.local at repo root, or export in shell).",
  );
  process.exit(1);
}

const sb = createClient(url, service, {
  auth: { persistSession: false, autoRefreshToken: false },
});

try {
  const host = new URL(url).hostname;
  console.log(`Supabase host: ${host} (verify this is the project you intend to modify)`);
} catch {
  console.warn("Could not parse NEXT_PUBLIC_SUPABASE_URL for logging.");
}

async function printRevenueVerification() {
  const { count: revTotalCount, error: cErr } = await sb.from("revenue_events").select("*", { count: "exact", head: true });
  if (cErr) {
    console.error("revenue_events count failed:", cErr.message);
    return;
  }

  const { data: revRows, error: revErr } = await sb.from("revenue_events").select("amount_npr, membership_request_id, event_type");
  if (revErr) {
    console.error("revenue_events select failed:", revErr.message);
    return;
  }

  let sumAllLedger = 0;
  let sumMembershipLinked = 0;
  let membershipLinkedRows = 0;
  for (const row of revRows ?? []) {
    const a = Number(row.amount_npr) || 0;
    sumAllLedger += a;
    if (row.membership_request_id) {
      sumMembershipLinked += a;
      membershipLinkedRows += 1;
    }
  }

  const { data: approved, error: appErr } = await sb.from("membership_requests").select("plan_type, amount_npr").eq("status", "approved");
  if (appErr) {
    console.error("membership_requests approved select failed:", appErr.message);
    return;
  }

  let nPremium = 0;
  let nElite = 0;
  let sumApprovedAmounts = 0;
  let offCatalog = 0;
  for (const r of approved ?? []) {
    const amt = Number(r.amount_npr) || 0;
    sumApprovedAmounts += amt;
    if (r.plan_type === "premium") {
      nPremium += 1;
      if (Math.abs(amt - CATALOG_PREMIUM_NPR) > 0.01) offCatalog += 1;
    } else if (r.plan_type === "elite") {
      nElite += 1;
      if (Math.abs(amt - CATALOG_ELITE_NPR) > 0.01) offCatalog += 1;
    }
  }

  const catalogListPriceTotal = nPremium * CATALOG_PREMIUM_NPR + nElite * CATALOG_ELITE_NPR;
  const listPriceMatchesApprovedSum = Math.abs(sumApprovedAmounts - catalogListPriceTotal) < 0.01;
  const ledgerMatchesApprovedSum = Math.abs(sumMembershipLinked - sumApprovedAmounts) < 0.01;

  console.log("");
  console.log("--- verification (admin dashboard uses sum of all revenue_events.amount_npr) ---");
  console.log(`revenue_events row count: ${revTotalCount ?? 0}`);
  console.log(`revenue_events sum(amount_npr) [all rows]: ${sumAllLedger.toFixed(2)} NPR`);
  console.log(
    `revenue_events sum(amount_npr) [membership_request_id set]: ${sumMembershipLinked.toFixed(2)} NPR (${membershipLinkedRows} rows)`,
  );
  console.log(`approved membership_requests: ${nPremium} premium, ${nElite} elite (total ${(approved ?? []).length})`);
  console.log(`sum(amount_npr) on approved requests: ${sumApprovedAmounts.toFixed(2)} NPR`);
  console.log(
    `catalog list-price total (${CATALOG_PREMIUM_NPR}×${nPremium} + ${CATALOG_ELITE_NPR}×${nElite}): ${catalogListPriceTotal.toFixed(2)} NPR`,
  );
  if (offCatalog > 0) {
    console.log(
      `Note: ${offCatalog} approved row(s) have amount_npr ≠ current list price for their plan; ledger should match per-request amounts, not catalog total.`,
    );
  }
  if (!listPriceMatchesApprovedSum && offCatalog === 0 && (approved ?? []).length > 0) {
    console.log("Note: approved amount_npr totals differ from catalog list-price total (unexpected if all rows use list price).");
  }
  if (ledgerMatchesApprovedSum && (approved ?? []).length === membershipLinkedRows) {
    console.log("OK: membership-linked ledger sum matches sum of approved request amounts, and row counts align.");
  } else if (!ledgerMatchesApprovedSum) {
    console.log("WARN: membership-linked ledger sum does not match sum(approved membership_requests.amount_npr) — run backfill or inspect mismatches.");
  } else if ((approved ?? []).length !== membershipLinkedRows) {
    console.log(
      `WARN: approved request count (${(approved ?? []).length}) ≠ revenue_events rows with membership_request_id (${membershipLinkedRows}).`,
    );
  }
  if (listPriceMatchesApprovedSum && offCatalog === 0 && (approved ?? []).length > 0) {
    console.log("OK: sum of approved amounts equals catalog list price (500 NPR × premium + 800 NPR × elite).");
  }
}

if (verifyOnly) {
  console.log("[verify-only] no inserts");
  await printRevenueVerification();
  process.exit(0);
}

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

await printRevenueVerification();
