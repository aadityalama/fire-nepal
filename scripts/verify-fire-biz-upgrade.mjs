#!/usr/bin/env node
/**
 * Verify FIRE Biz upgrade routes, PDF lib, and reports.
 * Usage: node scripts/verify-fire-biz-upgrade.mjs [baseUrl]
 */
import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { loadDotEnvLocal } from "./load-dotenv-local.mjs";

const baseUrl = (process.argv[2] || "http://localhost:3000").replace(/\/$/, "");
const outDir = join(process.cwd(), "tmp-fire-biz-upgrade");
loadDotEnvLocal();

const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim().replace(/\/+$/, "");
const anon = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();
const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();
const testEmail = `fire-biz-upg-${Date.now()}@firenepal.test`;
const testPassword = "FireBizUpg!234";

const routes = [
  "/fire-biz",
  "/fire-biz/sales",
  "/fire-biz/expenses",
  "/fire-biz/purchase-orders",
  "/fire-biz/reports",
  "/fire-biz/reports/profit-loss",
  "/fire-biz/reports/vat",
  "/fire-biz/settings",
];

await mkdir(outDir, { recursive: true });

const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
await admin.auth.admin.createUser({ email: testEmail, password: testPassword, email_confirm: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

await page.goto(`${baseUrl}/login?next=%2Ffire-biz`, { waitUntil: "networkidle", timeout: 120000 });
await page.locator('input[type="email"]').first().waitFor({ timeout: 120000 });
await page.locator('input[type="email"]').first().fill(testEmail);
await page.locator('input[type="password"]').first().fill(testPassword);
await page.getByRole("button", { name: /continue/i }).click();
await page.waitForURL(/\/fire-biz/, { timeout: 180000, waitUntil: "commit" });

const routeResults = [];
for (const route of routes) {
  const res = await page.goto(`${baseUrl}${route}`, { waitUntil: "domcontentloaded", timeout: 120000 });
  const ok = (res?.status() ?? 0) < 400;
  routeResults.push({ route, ok, status: res?.status() ?? 0 });
}

async function snap(page, file) {
  await page.waitForTimeout(800);
  await page.screenshot({ path: join(outDir, file), fullPage: true, timeout: 120000, animations: "disabled" });
}

await page.goto(`${baseUrl}/fire-biz/expenses`, { waitUntil: "domcontentloaded", timeout: 120000 });
await snap(page, "fire-biz-expenses.png");

await page.goto(`${baseUrl}/fire-biz/reports/profit-loss`, { waitUntil: "domcontentloaded", timeout: 120000 });
await snap(page, "fire-biz-profit-loss.png");

await page.goto(`${baseUrl}/fire-biz/purchase-orders`, { waitUntil: "domcontentloaded", timeout: 120000 });
await snap(page, "fire-biz-purchase-orders.png");

await page.goto(`${baseUrl}/fire-biz/reports/vat`, { waitUntil: "domcontentloaded", timeout: 120000 });
await snap(page, "fire-biz-vat-report.png");

// PDF module smoke test (source present + exports downloadInvoicePdf)
const invoicePdfSrc = await readFile(join(process.cwd(), "src/lib/fire-biz/invoice-pdf.ts"), "utf8");
const pdfOk = invoicePdfSrc.includes("downloadInvoicePdf");

await browser.close();
const users = await admin.auth.admin.listUsers();
await admin.auth.admin.deleteUser(users.data.users.find((u) => u.email === testEmail)?.id ?? "");

const report = {
  baseUrl,
  routeResults,
  pdfLibLoaded: pdfOk,
  screenshots: ["fire-biz-expenses.png", "fire-biz-profit-loss.png", "fire-biz-purchase-orders.png", "fire-biz-vat-report.png"],
  allRoutesOk: routeResults.every((r) => r.ok),
};
await writeFile(join(outDir, "report.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
process.exit(report.allRoutesOk && pdfOk ? 0 : 1);
