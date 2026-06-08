#!/usr/bin/env node
/**
 * Grant /admin access by inserting into public.admin_users (requires service role).
 * Loads `.env.local` the same way as other repo scripts.
 *
 * Usage:
 *   node scripts/grant-admin.mjs --list
 *   node scripts/grant-admin.mjs --email you@example.com
 *   node scripts/grant-admin.mjs --user-id <uuid>
 */

import { createClient } from "@supabase/supabase-js";
import { loadDotEnvLocal, getRepoRoot } from "./load-dotenv-local.mjs";

function usage() {
  console.log(`Usage:
  node scripts/grant-admin.mjs --list
  node scripts/grant-admin.mjs --email <auth_email>
  node scripts/grant-admin.mjs --user-id <uuid>

Repo: ${getRepoRoot()}
`);
}

function argValue(flag) {
  const i = process.argv.indexOf(flag);
  if (i === -1 || i + 1 >= process.argv.length) return null;
  return process.argv[i + 1]?.trim() || null;
}

loadDotEnvLocal();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const service = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!url || !service) {
  console.error("Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local (or exported).");
  process.exit(1);
}

const sb = createClient(url, service, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const list = process.argv.includes("--list");
const email = argValue("--email");
const userId = argValue("--user-id");

if (!list && !email && !userId) {
  usage();
  process.exit(1);
}

if (list) {
  const perPage = 50;
  const { data, error } = await sb.auth.admin.listUsers({ page: 1, perPage });
  if (error) {
    console.error("listUsers failed:", error.message);
    process.exit(1);
  }
  console.log(`Auth users (page 1, up to ${perPage}):\n`);
  for (const u of data.users) {
    console.log(`${u.id}\t${u.email ?? "(no email)"}`);
  }
  console.log(`\nTotal on this page: ${data.users.length}`);
  process.exit(0);
}

let targetId = userId;
if (email) {
  const { data, error } = await sb.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) {
    console.error("listUsers failed:", error.message);
    process.exit(1);
  }
  const match = data.users.find((u) => (u.email || "").toLowerCase() === email.toLowerCase());
  if (!match) {
    console.error(`No auth user with email: ${email}`);
    process.exit(1);
  }
  targetId = match.id;
  console.log(`Resolved email → user_id: ${targetId}`);
}

if (!targetId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(targetId)) {
  console.error("Invalid or missing user UUID.");
  process.exit(1);
}

const { error: insErr } = await sb.from("admin_users").upsert(
  { user_id: targetId, role: "admin" },
  { onConflict: "user_id" },
);

if (insErr) {
  console.error("admin_users upsert failed:", insErr.message);
  if (insErr.message.includes("relation") || insErr.message.includes("does not exist")) {
    console.error("\nApply migration: supabase/migrations/20250602160000_admin_dashboard.sql (SQL Editor or supabase db push).");
  }
  process.exit(1);
}

const { data: row, error: selErr } = await sb.from("admin_users").select("user_id, role").eq("user_id", targetId).maybeSingle();
if (selErr || !row) {
  console.error("Verify select failed:", selErr?.message ?? "no row");
  process.exit(1);
}

console.log("OK — admin_users row:", row);
console.log("\nNext: sign in as that user and open /admin (production: ensure this project’s DB is the one backing www.firenepal.com).");
