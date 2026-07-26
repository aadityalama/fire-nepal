// Verifies the Elite grid on /hub: NEPSE Hub card first, FIRE Biz second.
// Creates a temp Supabase user (service role), signs in through the UI, cleans up after.
// Usage: node scripts/verify-elite-nepse-hub.mjs [baseUrl]
import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";
import { mkdirSync, writeFileSync } from "node:fs";
import { loadDotEnvLocal } from "./load-dotenv-local.mjs";

const BASE = (process.argv[2] ?? "http://localhost:3002").replace(/\/$/, "");
const OUT = "tmp-elite-nepse-hub";
mkdirSync(OUT, { recursive: true });
loadDotEnvLocal();

const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim().replace(/\/+$/, "");
const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();
const testEmail = `elite-nepse-hub-${Date.now()}@firenepal.test`;
const testPassword = "EliteNepse!234";

const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
const created = await admin.auth.admin.createUser({ email: testEmail, password: testPassword, email_confirm: true });
const userId = created.data.user?.id;
if (!userId) throw new Error("Failed to create test user");

// Grant Elite so the card resolves to /market instead of the upgrade page.
const expiry = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString();
const upsert = await admin.from("user_profiles").upsert(
  { id: userId, membership_plan: "elite", membership_start: new Date().toISOString(), membership_expiry: expiry },
  { onConflict: "id" }
);
if (upsert.error) console.warn("user_profiles upsert warning:", upsert.error.message);

const report = { base: BASE, checks: [] };
function check(name, ok, detail) {
  report.checks.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
}

const browser = await chromium.launch();

async function login(page) {
  await page.goto(`${BASE}/login?next=%2Fhub`, { waitUntil: "networkidle", timeout: 120000 });
  await page.locator('input[type="email"]').first().fill(testEmail);
  await page.locator('input[type="password"]').first().fill(testPassword);
  await page.getByRole("button", { name: /continue/i }).click();
  await page.waitForURL(/\/hub/, { timeout: 180000, waitUntil: "commit" });
  await page.waitForTimeout(1500);
}

async function inspect(viewport, label) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  await login(page);

  const card = page.locator('[data-testid="hub-nepse-hub-card"]');
  await card.waitFor({ timeout: 30000 }).catch(() => {});
  check(`${label}: NEPSE Hub card present`, (await card.count()) === 1);

  // Membership entitlement loads asynchronously; wait for the card to unlock.
  await page
    .waitForFunction(
      () => document.querySelector('[data-testid="hub-nepse-hub-card"]')?.getAttribute("href") === "/market",
      { timeout: 20000 }
    )
    .catch(() => {});

  const info = await page.evaluate(() => {
    const el = document.querySelector('[data-testid="hub-nepse-hub-card"]');
    if (!el) return null;
    const grid = el.parentElement;
    const titles = Array.from(grid.querySelectorAll("a h2")).map((h) => h.textContent.trim());
    // Walk up to the section wrapper to read the section header text.
    const sectionText = grid.parentElement?.textContent?.slice(0, 60) ?? "";
    return { titles, sectionText, href: el.getAttribute("href"), cardText: el.textContent };
  });
  check(`${label}: NEPSE Hub is FIRST in Elite grid`, info?.titles?.[0] === "NEPSE Hub", JSON.stringify(info?.titles?.slice(0, 3)));
  check(`${label}: FIRE Biz is second`, info?.titles?.[1] === "FIRE Biz");
  check(`${label}: card lives under Elite section`, /Elite/.test(info?.sectionText ?? ""), info?.sectionText);
  check(`${label}: card opens NEPSE Hub for Elite member`, info?.href === "/market", `href=${info?.href}`);

  await card.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/hub-elite-${label}.png`, fullPage: false, animations: "disabled" });
  await page.screenshot({ path: `${OUT}/hub-full-${label}.png`, fullPage: true, animations: "disabled" });

  // Click-through: where does the card take the user?
  await card.click();
  await page.waitForTimeout(2500);
  const dest = new URL(page.url()).pathname;
  check(`${label}: click opens Premium NEPSE Hub`, dest === "/market", `dest=${dest}`);
  if (dest === "/market") {
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${OUT}/nepse-hub-after-click-${label}.png`, fullPage: false, animations: "disabled" });
  }
  await context.close();
}

try {
  await inspect({ width: 1440, height: 900 }, "desktop");
  await inspect({ width: 390, height: 844 }, "mobile");
} finally {
  await browser.close();
  const users = await admin.auth.admin.listUsers();
  const u = users.data.users.find((x) => x.email === testEmail);
  if (u) await admin.auth.admin.deleteUser(u.id);
}

const failed = report.checks.filter((c) => !c.ok);
writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 2));
console.log(failed.length === 0 ? "ALL CHECKS PASSED" : `FAILED: ${failed.length}`);
process.exit(failed.length === 0 ? 0 : 1);
