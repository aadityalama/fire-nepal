#!/usr/bin/env node
/**
 * Screenshot FIRE Biz premium dashboard (desktop + mobile).
 * Usage: node scripts/verify-fire-biz-dashboard-screenshots.mjs [baseUrl]
 */
import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { loadDotEnvLocal } from "./load-dotenv-local.mjs";

const baseUrl = (process.argv[2] || "http://localhost:3000").replace(/\/$/, "");
const outDir = join(process.cwd(), "tmp-fire-biz-dashboard");
loadDotEnvLocal();

const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim().replace(/\/+$/, "");
const anon = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();
const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();
const testEmail = `fire-biz-dash-${Date.now()}@firenepal.test`;
const testPassword = "FireBizDash!234";

await mkdir(outDir, { recursive: true });

const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
await admin.auth.admin.createUser({ email: testEmail, password: testPassword, email_confirm: true });

const browser = await chromium.launch();
const desktop = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });

for (const page of [desktop, mobile]) {
  await page.goto(`${baseUrl}/login?next=%2Ffire-biz`, { waitUntil: "networkidle", timeout: 120000 });
  await page.locator('input[type="email"]').fill(testEmail);
  await page.locator('input[type="password"]').fill(testPassword);
  await page.getByRole("button", { name: /continue/i }).click();
  await page.waitForURL(/\/fire-biz/, { timeout: 120000, waitUntil: "commit" });
}

await desktop.waitForTimeout(2000);
await desktop.screenshot({ path: join(outDir, "fire-biz-dashboard-desktop.png"), fullPage: true });
await mobile.screenshot({ path: join(outDir, "fire-biz-dashboard-mobile.png"), fullPage: true });

await mobile.goto(`${baseUrl}/fire-biz/transactions`, { waitUntil: "domcontentloaded", timeout: 120000 });
await mobile.getByText(/Transactions/i).first().waitFor({ timeout: 120000 });
await mobile.waitForTimeout(1500);
await mobile.screenshot({ path: join(outDir, "fire-biz-mobile-transactions.png"), fullPage: false });

await browser.close();
const users = await admin.auth.admin.listUsers();
await admin.auth.admin.deleteUser(users.data.users.find((u) => u.email === testEmail)?.id ?? "");

await writeFile(
  join(outDir, "report.json"),
  JSON.stringify({ baseUrl, outDir, screenshots: ["fire-biz-dashboard-desktop.png", "fire-biz-dashboard-mobile.png", "fire-biz-mobile-transactions.png"] }, null, 2),
);
console.log(`Screenshots saved to ${outDir}`);
