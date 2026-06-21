#!/usr/bin/env node
/**
 * Apply FIRE Biz invoicing migration to production and verify schema, RLS, CRUD, routes.
 *
 * Requires `.env.local`:
 *   - NEXT_PUBLIC_SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY
 *   - NEXT_PUBLIC_SUPABASE_ANON_KEY
 *   - SUPABASE_DB_URL (optional but required for db push)
 *
 * Usage:
 *   node scripts/verify-fire-biz-production-migration.mjs [baseUrl]
 */
import { spawnSync } from "node:child_process";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";
import { loadDotEnvLocal } from "./load-dotenv-local.mjs";

const root = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const migrationFile = "20260621140000_fire_biz_invoicing_reports.sql";
const baseUrl = (process.argv[2] || "http://localhost:3000").replace(/\/$/, "");
const outDir = join(root, "tmp-fire-biz-production-verify");

loadDotEnvLocal();

const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim().replace(/\/+$/, "");
const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();
const anonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();
const dbUrl = (process.env.SUPABASE_DB_URL ?? "").trim();

if (!url || !serviceKey || !anonKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  process.exit(1);
}

await mkdir(outDir, { recursive: true });

const report = {
  migrationFile,
  migrationPush: null,
  tablesVerified: {},
  columnsVerified: {},
  rlsVerified: {},
  crudVerified: {},
  invoiceFeatures: {},
  routesVerified: [],
  typecheck: null,
  build: null,
  productionReady: false,
};

/** @param {import('@supabase/supabase-js').SupabaseClient} admin */
async function probeColumn(admin, table, column) {
  const { error } = await admin.from(table).select(column).limit(1);
  if (!error) return { ok: true };
  const msg = (error.message || "").toLowerCase();
  if (msg.includes("does not exist") || msg.includes("column") || error.code === "42703" || error.code === "PGRST204") {
    return { ok: false, error: error.message };
  }
  return { ok: true, note: error.message };
}

/** @param {import('@supabase/supabase-js').SupabaseClient} admin */
async function probeTable(admin, table) {
  const { error } = await admin.from(table).select("*").limit(1);
  if (!error) return { ok: true };
  const msg = (error.message || "").toLowerCase();
  if (msg.includes("does not exist") || error.code === "42P01" || error.code === "PGRST205") {
    return { ok: false, error: error.message };
  }
  return { ok: true, note: error.message };
}

// --- 1) Apply migration ---
if (dbUrl.length >= 20) {
  process.env.SUPABASE_CLI_DISABLE_TELEMETRY = "1";
  process.env.DO_NOT_TRACK = "1";
  console.log("\n--- Applying migration via supabase db push ---\n");
  const push = spawnSync(
    "npx",
    ["--yes", "supabase@latest", "db", "push", "--db-url", dbUrl, "--yes"],
    { stdio: "pipe", encoding: "utf8", cwd: root, env: process.env },
  );
  report.migrationPush = {
    exitCode: push.status ?? 1,
    stdout: push.stdout?.slice(-4000) ?? "",
    stderr: push.stderr?.slice(-4000) ?? "",
  };
  console.log(push.stdout || push.stderr || "(no output)");
  if (push.status !== 0) {
    console.error("db push failed");
  }
} else {
  report.migrationPush = {
    skipped: true,
    reason: "SUPABASE_DB_URL not set — probing remote schema only (apply migration in SQL Editor or set SUPABASE_DB_URL)",
  };
  console.log("\n--- SKIP db push: SUPABASE_DB_URL not set ---\n");
}

const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

// --- 2) Verify tables ---
const tables = [
  "business_profiles",
  "customers",
  "suppliers",
  "sales",
  "purchases",
  "inventory_items",
  "transactions",
  "credit_reminders",
  "expense_categories",
  "purchase_orders",
];

console.log("\n--- Table verification ---\n");
for (const table of tables) {
  const r = await probeTable(admin, table);
  report.tablesVerified[table] = r;
  console.log(`${r.ok ? "OK" : "MISSING"}: ${table}${r.error ? " — " + r.error : ""}`);
}

// Note: expenses = transactions (type expense); QR/payments on sales + business_profiles
const expectedMissing = ["invoice_payments", "invoice_qr_codes"];
for (const table of expectedMissing) {
  const r = await probeTable(admin, table);
  report.tablesVerified[table] = { ok: false, expectedAbsent: true, error: r.error };
  console.log(`${r.ok ? "UNEXPECTED" : "OK (not used)"}: ${table} — app uses sales.payment_method + business_profiles QR fields`);
}

// --- 3) Verify new columns ---
const columns = [
  ["business_profiles", "default_vat_rate"],
  ["business_profiles", "vat_registered"],
  ["business_profiles", "esewa_merchant_id"],
  ["business_profiles", "khalti_merchant_id"],
  ["business_profiles", "esewa_qr_url"],
  ["business_profiles", "khalti_qr_url"],
  ["sales", "payment_method"],
  ["sales", "vat_rate"],
  ["sales", "is_tax_invoice"],
  ["transactions", "expense_category_id"],
];

console.log("\n--- Column verification ---\n");
let columnsOk = true;
for (const [table, column] of columns) {
  const r = await probeColumn(admin, table, column);
  report.columnsVerified[`${table}.${column}`] = r;
  if (!r.ok) columnsOk = false;
  console.log(`${r.ok ? "OK" : "MISSING"}: ${table}.${column}${r.error ? " — " + r.error : ""}`);
}

// --- 4) RLS verification via authenticated user CRUD smoke test ---
console.log("\n--- RLS + CRUD verification ---\n");
const testEmail = `fire-biz-prod-${Date.now()}@firenepal.test`;
const testPassword = "FireBizProd!234";
const { data: createdUser, error: createErr } = await admin.auth.admin.createUser({
  email: testEmail,
  password: testPassword,
  email_confirm: true,
});

if (createErr || !createdUser.user) {
  console.error("Failed to create test user:", createErr?.message);
  process.exit(1);
}

const userId = createdUser.user.id;
const userClient = createClient(url, anonKey, { auth: { persistSession: false } });
const { error: signInErr } = await userClient.auth.signInWithPassword({ email: testEmail, password: testPassword });
if (signInErr) {
  console.error("Sign-in failed:", signInErr.message);
  process.exit(1);
}

async function crud(label, fn) {
  try {
    await fn();
    report.crudVerified[label] = { ok: true };
    console.log(`OK: ${label}`);
    return true;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    report.crudVerified[label] = { ok: false, error: msg };
    console.log(`FAIL: ${label} — ${msg}`);
    return false;
  }
}

const profileRes = await userClient
  .from("business_profiles")
  .insert({ user_id: userId, business_name: "Prod Verify Biz", vat_registered: true, default_vat_rate: 13 })
  .select("id")
  .single();
const profileId = profileRes.data?.id ?? null;

await crud("customers insert/select/delete", async () => {
  const { data, error } = await userClient.from("customers").insert({ user_id: userId, name: "CRUD Customer" }).select("id").single();
  if (error) throw new Error(error.message);
  const { error: e2 } = await userClient.from("customers").select("id").eq("id", data.id).single();
  if (e2) throw new Error(e2.message);
  const { error: e3 } = await userClient.from("customers").delete().eq("id", data.id);
  if (e3) throw new Error(e3.message);
});

await crud("suppliers insert/select/delete", async () => {
  const { data, error } = await userClient.from("suppliers").insert({ user_id: userId, name: "CRUD Supplier" }).select("id").single();
  if (error) throw new Error(error.message);
  const { error: e3 } = await userClient.from("suppliers").delete().eq("id", data.id);
  if (e3) throw new Error(e3.message);
});

await crud("sales insert/select/delete (invoice fields)", async () => {
  const { data, error } = await userClient
    .from("sales")
    .insert({
      user_id: userId,
      business_profile_id: profileId,
      invoice_number: "INV-PROD-001",
      subtotal: 1000,
      tax_amount: 130,
      total_amount: 1130,
      payment_method: "esewa",
      vat_rate: 13,
      is_tax_invoice: true,
      line_items: [{ name: "Item A", quantity: 1, unitPrice: 1000 }],
    })
    .select("id, payment_method, is_tax_invoice")
    .single();
  if (error) throw new Error(error.message);
  if (data.payment_method !== "esewa" || !data.is_tax_invoice) throw new Error("invoice columns not persisted");
  const { error: e3 } = await userClient.from("sales").delete().eq("id", data.id);
  if (e3) throw new Error(e3.message);
});

await crud("purchases insert/delete", async () => {
  const { data, error } = await userClient
    .from("purchases")
    .insert({ user_id: userId, bill_number: "BILL-1", total_amount: 500, line_items: [] })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  const { error: e3 } = await userClient.from("purchases").delete().eq("id", data.id);
  if (e3) throw new Error(e3.message);
});

await crud("inventory insert/delete", async () => {
  const { data, error } = await userClient
    .from("inventory_items")
    .insert({ user_id: userId, name: "Stock Item", quantity: 10, cost_price: 50, selling_price: 80 })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  const { error: e3 } = await userClient.from("inventory_items").delete().eq("id", data.id);
  if (e3) throw new Error(e3.message);
});

await crud("transactions (cash & bank) insert/delete", async () => {
  const { data, error } = await userClient
    .from("transactions")
    .insert({ user_id: userId, transaction_type: "income", amount: 100, account_type: "cash" })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  const { error: e3 } = await userClient.from("transactions").delete().eq("id", data.id);
  if (e3) throw new Error(e3.message);
});

await crud("credit_reminders insert/delete", async () => {
  const { data, error } = await userClient
    .from("credit_reminders")
    .insert({
      user_id: userId,
      party_type: "customer",
      party_name: "Test",
      amount_due: 100,
      due_date: "2026-07-01",
      reminder_type: "receivable",
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  const { error: e3 } = await userClient.from("credit_reminders").delete().eq("id", data.id);
  if (e3) throw new Error(e3.message);
});

await crud("expense_categories insert/delete", async () => {
  const { data, error } = await userClient
    .from("expense_categories")
    .insert({ user_id: userId, name: "Verify Rent" })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  const { error: e3 } = await userClient.from("expense_categories").delete().eq("id", data.id);
  if (e3) throw new Error(e3.message);
});

await crud("expenses (transactions) insert/delete", async () => {
  const { data, error } = await userClient
    .from("transactions")
    .insert({
      user_id: userId,
      transaction_type: "expense",
      amount: 250,
      account_type: "cash",
      reference_type: "expense",
      party_name: "Office",
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  const { error: e3 } = await userClient.from("transactions").delete().eq("id", data.id);
  if (e3) throw new Error(e3.message);
});

await crud("purchase_orders insert/delete", async () => {
  const { data, error } = await userClient
    .from("purchase_orders")
    .insert({
      user_id: userId,
      po_number: "PO-VERIFY-1",
      status: "draft",
      total_amount: 999,
      line_items: [{ name: "Goods", quantity: 1, unitPrice: 999 }],
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  const { error: e3 } = await userClient.from("purchase_orders").delete().eq("id", data.id);
  if (e3) throw new Error(e3.message);
});

report.rlsVerified.authenticatedCrud = Object.values(report.crudVerified).every((r) => r.ok);

// Invoice features (lib-level)
const invoicePdfSrc = await readFile(join(root, "src/lib/fire-biz/invoice-pdf.ts"), "utf8");
const qrSrc = await readFile(join(root, "src/lib/fire-biz/qr-payments.ts"), "utf8");
report.invoiceFeatures = {
  pdfDownload: invoicePdfSrc.includes("downloadInvoicePdf"),
  printLayout: (await readFile(join(root, "src/components/fire-biz/FireBizInvoiceView.tsx"), "utf8")).includes("@media print"),
  qrPayments: qrSrc.includes("generateQrDataUrl") && qrSrc.includes("esewa") && qrSrc.includes("khalti"),
};

console.log("\n--- Invoice features (code) ---\n");
for (const [k, v] of Object.entries(report.invoiceFeatures)) {
  console.log(`${v ? "OK" : "MISSING"}: ${k}`);
}

// Cleanup test user data
await userClient.from("business_profiles").delete().eq("user_id", userId);
await admin.auth.admin.deleteUser(userId);

// --- 5) typecheck & build ---
console.log("\n--- typecheck ---\n");
const tc = spawnSync("npm", ["run", "typecheck"], { cwd: root, encoding: "utf8", stdio: "pipe" });
report.typecheck = { ok: tc.status === 0, exitCode: tc.status ?? 1 };
console.log(tc.stdout || tc.stderr || "");
console.log(report.typecheck.ok ? "OK: typecheck" : "FAIL: typecheck");

console.log("\n--- build ---\n");
const build = spawnSync("npm", ["run", "build"], { cwd: root, encoding: "utf8", stdio: "pipe", env: { ...process.env, CI: "1" } });
report.build = { ok: build.status === 0, exitCode: build.status ?? 1 };
console.log(build.status === 0 ? "OK: build" : "FAIL: build — see stderr in report");
if (build.status !== 0) report.build.stderrTail = (build.stderr || build.stdout || "").slice(-3000);

// --- 6) Route verification ---
const routes = [
  "/fire-biz",
  "/fire-biz/sales",
  "/fire-biz/purchases",
  "/fire-biz/customers",
  "/fire-biz/suppliers",
  "/fire-biz/inventory",
  "/fire-biz/cash-bank",
  "/fire-biz/credit-reminders",
  "/fire-biz/reports",
  "/fire-biz/settings",
];

console.log("\n--- Route verification ---\n");
const browser = await chromium.launch();
const page = await browser.newPage();
const routeEmail = `fire-biz-route-${Date.now()}@firenepal.test`;
await admin.auth.admin.createUser({ email: routeEmail, password: testPassword, email_confirm: true });
await page.goto(`${baseUrl}/login?next=%2Ffire-biz`, { waitUntil: "networkidle", timeout: 180000 });
await page.locator('input[type="email"]').first().waitFor({ timeout: 120000 });
await page.locator('input[type="email"]').first().fill(routeEmail);
await page.locator('input[type="password"]').first().fill(testPassword);
await page.getByRole("button", { name: /continue/i }).click();
await page.waitForURL(/\/fire-biz/, { timeout: 180000, waitUntil: "commit" });

for (const route of routes) {
  const res = await page.goto(`${baseUrl}${route}`, { waitUntil: "domcontentloaded", timeout: 120000 });
  const ok = (res?.status() ?? 0) < 400;
  report.routesVerified.push({ route, ok, status: res?.status() ?? 0 });
  console.log(`${ok ? "OK" : "FAIL"}: ${route} (${res?.status()})`);
}

await browser.close();
const routeUsers = await admin.auth.admin.listUsers();
await admin.auth.admin.deleteUser(routeUsers.data.users.find((u) => u.email === routeEmail)?.id ?? "");

const tablesOk = tables.every((t) => report.tablesVerified[t]?.ok);
const crudOk = report.rlsVerified.authenticatedCrud;
const routesOk = report.routesVerified.every((r) => r.ok);
report.productionReady = tablesOk && columnsOk && crudOk && report.typecheck.ok && report.build.ok && routesOk;

await writeFile(join(outDir, "production-readiness-report.json"), JSON.stringify(report, null, 2));
console.log("\n--- Production readiness ---\n");
console.log(JSON.stringify({ productionReady: report.productionReady, reportPath: join(outDir, "production-readiness-report.json") }, null, 2));
process.exit(report.productionReady ? 0 : 1);
