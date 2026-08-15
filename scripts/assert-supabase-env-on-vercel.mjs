#!/usr/bin/env node
/**
 * Fail Vercel Production/Preview builds when public Supabase auth env is missing.
 *
 * Local `next build` (no VERCEL) is unaffected so developers can build without cloud keys.
 * Vercel Development (`vercel dev`) is also skipped.
 *
 * This restores the production invariant: review deployments must use the same
 * NEXT_PUBLIC_SUPABASE_* configuration as Production, not silent legacy-auth 503s.
 */
const vercel = (process.env.VERCEL ?? "").trim();
const vercelEnv = (process.env.VERCEL_ENV ?? "").trim();

if (!vercel) {
  process.exit(0);
}

if (vercelEnv !== "production" && vercelEnv !== "preview") {
  process.exit(0);
}

function normalizeUrl(raw) {
  let value = (raw ?? "").trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1).trim();
  }
  return value.replace(/\/+$/, "");
}

function normalizeKey(raw) {
  let value = (raw ?? "").trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1).trim();
  }
  return value;
}

const url = normalizeUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
const anon = normalizeKey(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

if (url.length > 8 && anon.length > 20) {
  console.log(`[assert-supabase-env] OK for Vercel ${vercelEnv}`);
  process.exit(0);
}

console.error(
  `[assert-supabase-env] Missing NEXT_PUBLIC_SUPABASE_URL and/or NEXT_PUBLIC_SUPABASE_ANON_KEY for Vercel ${vercelEnv}.`,
);
console.error(
  "Set both in Vercel → Project → Settings → Environment Variables for Production AND Preview, then redeploy.",
);
console.error(
  "Without them, NODE_ENV=production blocks legacy auth and login shows a Supabase configuration error.",
);
process.exit(1);
