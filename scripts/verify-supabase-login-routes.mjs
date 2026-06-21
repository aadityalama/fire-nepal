#!/usr/bin/env node
/**
 * End-to-end: verify Supabase auth env, sign in via UI, and probe protected routes.
 * Usage: node scripts/verify-supabase-login-routes.mjs [baseUrl]
 */
import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";
import { loadDotEnvLocal } from "./load-dotenv-local.mjs";

const baseUrl = (process.argv[2] || "http://localhost:3000").replace(/\/$/, "");
loadDotEnvLocal();

const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim().replace(/\/+$/, "");
const anon = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();
const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();
const testEmail = `login-verify-${Date.now()}@firenepal.test`;
const testPassword = "LoginVerify!234";

function pass(msg) {
  console.log(`OK   ${msg}`);
}
function fail(msg) {
  console.error(`FAIL ${msg}`);
  process.exitCode = 1;
}

const health = await fetch(`${url}/auth/v1/health`, { headers: { apikey: anon } });
if (!health.ok) {
  fail(`Supabase Auth rejected anon key (HTTP ${health.status})`);
  process.exit(1);
}
pass("Supabase Auth accepts NEXT_PUBLIC_SUPABASE_ANON_KEY");

const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
const created = await admin.auth.admin.createUser({ email: testEmail, password: testPassword, email_confirm: true });
if (created.error) {
  fail(`createUser: ${created.error.message}`);
  process.exit(1);
}

const client = createClient(url, anon, { auth: { persistSession: false } });
const signIn = await client.auth.signInWithPassword({ email: testEmail, password: testPassword });
if (signIn.error || !signIn.data.session) {
  fail(`signInWithPassword: ${signIn.error?.message ?? "no session"}`);
  process.exit(1);
}
pass(`signInWithPassword for ${testEmail}`);

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(`${baseUrl}/login?next=%2Fhub`, { waitUntil: "networkidle", timeout: 120_000 });
await page.locator('input[type="email"]').fill(testEmail);
await page.locator('input[type="password"]').fill(testPassword);
await page.getByRole("button", { name: /continue/i }).click();
await page.waitForURL(/\/hub/, { timeout: 120_000, waitUntil: "commit" });
await page.getByRole("heading", { name: /welcome to your hub/i }).waitFor({ timeout: 120_000 });
pass("/login → /hub after Continue");

for (const route of ["/hub", "/more", "/fire-biz"]) {
  await page.goto(`${baseUrl}${route}`, { waitUntil: "networkidle", timeout: 90_000 });
  const finalPath = new URL(page.url()).pathname;
  if (finalPath.startsWith(route)) pass(`${route} authenticated (${finalPath})`);
  else fail(`${route} expected ${route}, got ${finalPath}`);
}

await browser.close();
if (created.data.user?.id) await admin.auth.admin.deleteUser(created.data.user.id);

if (process.exitCode) process.exit(process.exitCode);
console.log("\nAll login route checks passed.");
