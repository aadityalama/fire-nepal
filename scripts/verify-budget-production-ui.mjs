#!/usr/bin/env node
import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { loadDotEnvLocal } from "./load-dotenv-local.mjs";

loadDotEnvLocal();

const baseUrl = (process.argv[2] ?? process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.firenepal.com").replace(/\/+$/, "");
const outDir = join(process.cwd(), "tmp-budget-production-verify");
await mkdir(outDir, { recursive: true });

const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
const anonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();
const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();

if (!supabaseUrl || !anonKey || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

const email = `budget-ui-verify-${Date.now()}@firenepal.test`;
const password = "BudgetUiVerify!234";

let createdUserId = null;
let browser = null;

const report = {
  baseUrl,
  createdUserId: null,
  add: { ok: false, response: null, toast: null, error: null },
  edit: { ok: false, response: null, toast: null, error: null },
  delete: { ok: false, response: null, toast: null, error: null },
  reload: { ok: false, persisted: false, countAfterReload: 0, error: null },
};

try {
  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (created.error || !created.data.user?.id) {
    throw new Error(`Could not create auth test user: ${created.error?.message ?? "unknown"}`);
  }
  createdUserId = created.data.user.id;
  report.createdUserId = createdUserId;

  browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  let lastBudgetResponse = null;
  page.on("response", async (response) => {
    const url = response.url();
    if (!url.includes("/api/budgets")) return;
    let body = null;
    try {
      body = await response.json();
    } catch {
      body = await response.text().catch(() => null);
    }
    lastBudgetResponse = {
      url,
      status: response.status(),
      body,
    };
  });

  await page.goto(`${baseUrl}/login?next=%2Fbudget`, { waitUntil: "networkidle", timeout: 120_000 });
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Continue" }).click();
  await page.waitForURL(/\/budget(?:\?|$)/, { timeout: 120_000 });
  await page.waitForLoadState("networkidle");

  const addName = `Automation Budget ${Date.now()}`;
  await page.getByLabel("Add budget").click();
  await page.getByLabel("Budget amount in NPR").fill("12000");
  await page.locator('input[placeholder="Food, Living, Transport..."]').fill(addName);
  await page.getByRole("button", { name: "Save" }).click();
  await page.waitForTimeout(2500);

  report.add.response = lastBudgetResponse;
  report.add.toast = await page.locator("[data-sonner-toast]").allTextContents().catch(() => []);
  report.add.ok = await page.getByText(addName, { exact: false }).first().isVisible().catch(() => false);
  if (!report.add.ok) {
    report.add.error = "Budget row not visible after add.";
  }

  const updatedName = `${addName} Updated`;
  await page.getByLabel(`Budget actions for ${addName}`).click();
  await page.getByRole("button", { name: "Edit Budget" }).click();
  await page.locator('input[placeholder="Food, Living, Transport..."]').fill(updatedName);
  await page.getByRole("button", { name: "Update Budget" }).click();
  await page.waitForTimeout(2500);

  report.edit.response = lastBudgetResponse;
  report.edit.toast = await page.locator("[data-sonner-toast]").allTextContents().catch(() => []);
  report.edit.ok = await page.getByText(updatedName, { exact: false }).first().isVisible().catch(() => false);
  if (!report.edit.ok) {
    report.edit.error = "Updated budget row not visible after edit.";
  }

  await page.reload({ waitUntil: "networkidle", timeout: 120_000 });
  report.reload.countAfterReload = await page.locator(`text=${updatedName}`).count().catch(() => 0);
  report.reload.persisted = report.reload.countAfterReload > 0;
  report.reload.ok = report.reload.persisted;
  if (!report.reload.ok) {
    report.reload.error = "Updated budget did not persist after reload.";
  }

  await page.getByLabel(`Budget actions for ${updatedName}`).click();
  await page.getByRole("button", { name: "Delete Budget" }).click();
  await page.getByRole("button", { name: "Delete" }).click();
  await page.waitForTimeout(2500);

  report.delete.response = lastBudgetResponse;
  report.delete.toast = await page.locator("[data-sonner-toast]").allTextContents().catch(() => []);
  report.delete.ok = (await page.locator(`text=${updatedName}`).count().catch(() => 0)) === 0;
  if (!report.delete.ok) {
    report.delete.error = "Budget row still visible after delete.";
  }

  await page.screenshot({ path: join(outDir, "budget-production-ui.png"), fullPage: true });
  await writeFile(join(outDir, "report.json"), JSON.stringify(report, null, 2), "utf8");

  const allOk = report.add.ok && report.edit.ok && report.delete.ok && report.reload.ok;
  console.log(JSON.stringify({ ok: allOk, reportPath: join(outDir, "report.json"), report }, null, 2));
  process.exit(allOk ? 0 : 1);
} catch (error) {
  report.error = error instanceof Error ? error.message : String(error);
  await writeFile(join(outDir, "report.json"), JSON.stringify(report, null, 2), "utf8");
  console.error(JSON.stringify(report, null, 2));
  process.exit(1);
} finally {
  if (browser) await browser.close().catch(() => undefined);
  if (createdUserId) {
    await admin.auth.admin.deleteUser(createdUserId).catch(() => undefined);
  }
}
