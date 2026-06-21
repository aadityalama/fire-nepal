#!/usr/bin/env node
/**
 * Verify NEXT_PUBLIC_SUPABASE_URL + anon/publishable key against Supabase Auth.
 *
 * Usage: node scripts/verify-supabase-auth-env.mjs
 */
import { loadDotEnvLocal } from "./load-dotenv-local.mjs";

loadDotEnvLocal();

const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim().replace(/\/+$/, "");
const anon = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();

if (!url || url.length < 12) {
  console.error("FAIL: NEXT_PUBLIC_SUPABASE_URL is missing or too short.");
  process.exit(1);
}
if (!anon || anon.length < 20) {
  console.error("FAIL: NEXT_PUBLIC_SUPABASE_ANON_KEY is missing or too short.");
  process.exit(1);
}

const health = await fetch(`${url}/auth/v1/health`, { headers: { apikey: anon } });
const body = await health.text();
if (health.ok) {
  console.log("OK   Supabase Auth accepts NEXT_PUBLIC_SUPABASE_ANON_KEY");
  console.log(`     URL: ${url}`);
  console.log(`     Key prefix: ${anon.slice(0, 16)}… (${anon.length} chars)`);
  process.exit(0);
}

console.error("FAIL: Supabase Auth rejected NEXT_PUBLIC_SUPABASE_ANON_KEY");
console.error(`     HTTP ${health.status}: ${body}`);
console.error("     Fix: Dashboard → Project Settings → API → copy Publishable key (sb_publishable_…) or legacy anon JWT exactly.");
console.error("     Common mistake: an extra trailing character when pasting (compare with production bundle or `npm run env:sync:supabase`).");
process.exit(1);
