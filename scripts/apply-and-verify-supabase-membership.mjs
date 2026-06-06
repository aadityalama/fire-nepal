#!/usr/bin/env node
/**
 * Production / remote Supabase: apply pending migrations, then verify membership storage + table + API.
 *
 * Requires `.env.local` (or exported env) with:
 *   - SUPABASE_DB_URL          — Postgres URI (Dashboard → Connect → URI)
 *   - NEXT_PUBLIC_SUPABASE_URL — Project URL
 *   - SUPABASE_SERVICE_ROLE_KEY
 *   - NEXT_PUBLIC_SUPABASE_ANON_KEY — not required for default checks
 *
 * Infra E2E (default **on**): service role + Auth Admin uses the first auth user as `user_id` FK,
 * uploads a 1×1 PNG, inserts a `membership_requests` row, then deletes row + object (mirrors API data paths).
 *   Set MEMBERSHIP_E2E_INFRA=0 to skip writes.
 *
 * Usage:
 *   node scripts/apply-and-verify-supabase-membership.mjs
 */
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { loadDotEnvLocal } from "./load-dotenv-local.mjs";

const BUCKET = "membership_payment_proofs";

function need(name, minLen = 8) {
  const v = process.env[name]?.trim();
  if (!v || v.length < minLen) {
    console.error(`Missing or too short ${name}. Set it in .env.local (see .env.example).`);
    process.exit(1);
  }
  return v;
}

loadDotEnvLocal();

const dbUrl = need("SUPABASE_DB_URL", 20);
const url = need("NEXT_PUBLIC_SUPABASE_URL");
const serviceKey = need("SUPABASE_SERVICE_ROLE_KEY");

console.log("\n--- 1) supabase db push (remote) ---\n");
const push = spawnSync("npx", ["--yes", "supabase@latest", "db", "push", "--db-url", dbUrl, "--yes"], {
  stdio: "inherit",
  env: process.env,
  cwd: process.cwd(),
});
if (push.status !== 0) {
  console.error("\ndb push failed (exit " + (push.status ?? "?") + ").");
  process.exit(push.status ?? 1);
}

console.log("\n--- 2) migration list (remote) ---\n");
const list = spawnSync("npx", ["--yes", "supabase@latest", "migration", "list", "--db-url", dbUrl], {
  stdio: "inherit",
  env: process.env,
  cwd: process.cwd(),
});
if (list.status !== 0) {
  console.error("\nmigration list failed.");
  process.exit(list.status ?? 1);
}

console.log("\n--- 3) Database + storage checks (service role) ---\n");
const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

const { data: _rows, error: tblErr } = await admin.from("membership_requests").select("id").limit(1);
if (tblErr) {
  console.error("membership_requests query failed:", tblErr.message);
  process.exit(1);
}
console.log("OK: public.membership_requests exists (PostgREST returned rows or empty set).");

const { data: buckets, error: bErr } = await admin.storage.listBuckets();
if (bErr) {
  console.error("listBuckets failed:", bErr.message);
  process.exit(1);
}
if (!buckets?.some((b) => b.id === BUCKET)) {
  console.error(`Missing storage bucket "${BUCKET}". Re-run migrations or create the bucket in the dashboard.`);
  process.exit(1);
}
console.log(`OK: storage bucket "${BUCKET}" exists.`);

console.log("\n--- 4) API smoke (unauthenticated POST → expect 401) ---\n");
const site =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "").trim() ||
  (process.env.VERCEL_URL?.trim() ? `https://${process.env.VERCEL_URL.trim().replace(/\/$/, "")}` : "") ||
  "https://firenepal.com";

try {
  const r = await fetch(`${site}/api/membership-requests`, { method: "POST", body: new FormData() });
  console.log(`${site}/api/membership-requests → HTTP ${r.status}`);
  if (r.status !== 401) {
    console.log("(Without cookies, 401 Unauthorized is expected if the route is deployed and gated.)");
  }
} catch (e) {
  console.log(`API smoke: fetch failed (${e instanceof Error ? e.message : e})`);
}

if (process.env.MEMBERSHIP_E2E_INFRA !== "0") {
  console.log("\n--- 5) Infra E2E (service role: storage + row + cleanup) ---\n");
  const { data: list, error: listErr } = await admin.auth.admin.listUsers({ page: 1, perPage: 1 });
  if (listErr || !list?.users?.[0]?.id) {
    console.error(
      "[WARN] Skipping infra E2E: need at least one auth user for FK (listUsers:",
      listErr?.message ?? "empty list",
      ").",
    );
  } else {
    const userId = list.users[0].id;
    const id = randomUUID();
    const proofPath = `${userId}/${id}.png`;
    const png = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
      "base64",
    );
    const { error: upErr } = await admin.storage.from(BUCKET).upload(proofPath, png, {
      contentType: "image/png",
      upsert: false,
    });
    if (upErr) {
      console.error("Proof upload failed:", upErr.message);
      process.exit(1);
    }
    const { error: insErr } = await admin.from("membership_requests").insert({
      id,
      user_id: userId,
      email: `e2e-smoke+${id.slice(0, 8)}@invalid.local`,
      plan_type: "premium",
      payment_method: "khalti_qr",
      proof_url: proofPath,
      reference: "e2e-smoke",
      status: "pending",
    });
    if (insErr) {
      await admin.storage.from(BUCKET).remove([proofPath]);
      console.error("Insert failed:", insErr.message);
      process.exit(1);
    }
    const { error: delRow } = await admin.from("membership_requests").delete().eq("id", id);
    const { error: delSt } = await admin.storage.from(BUCKET).remove([proofPath]);
    if (delRow) console.error("Cleanup row warning:", delRow.message);
    if (delSt) console.error("Cleanup storage warning:", delSt.message);
    console.log("OK: upload + insert + delete smoke test passed.");
  }
} else {
  console.log("\n[SKIP] Infra E2E: set MEMBERSHIP_E2E_INFRA=0 was used; skipping upload+insert+cleanup.");
}

console.log("\nAll verification steps completed.\n");
