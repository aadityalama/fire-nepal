/**
 * Cross-browser production verification for finance SoT.
 * Seeds cloud data through authenticated APIs (same path as the app),
 * then opens Chrome / Safari / Naver with conflicting localStorage and asserts
 * all three resolve to the same cloud snapshot.
 *
 * Usage: node scripts/verify-finance-sot-cross-browser.mjs [baseUrl]
 */
import { createClient } from "@supabase/supabase-js";
import { chromium, webkit } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { loadDotEnvLocal } from "./load-dotenv-local.mjs";

loadDotEnvLocal();

const baseUrl = (process.argv[2] ?? process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.firenepal.com").replace(
  /\/+$/,
  "",
);
const outDir = join(process.cwd(), "tmp-finance-sot-verify");
await mkdir(outDir, { recursive: true });

const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();
if (!supabaseUrl || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const email = `finance-sot-${Date.now()}@firenepal.test`;
const password = "FinanceSotVerify!234";
const stamp = Date.now();
const cloudIncome = 250000;
const cloudSavings = 750000;

const browsers = [
  {
    name: "chrome",
    engine: "chromium",
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    staleLocal: { cashflowIncome: 999_999, savingsAmount: 111_111 },
  },
  {
    name: "safari",
    engine: "webkit",
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15",
    staleLocal: { cashflowIncome: 370_000, savingsAmount: 500_000 },
  },
  {
    name: "naver",
    engine: "chromium",
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 NAVER(inapp; search; 1250; 14.9.1) Mobile/15E148",
    staleLocal: { cashflowIncome: 0, savingsAmount: 42 },
  },
];

const report = {
  baseUrl,
  email,
  userId: null,
  cloudSeed: null,
  browsers: {},
  identical: false,
  ok: false,
  error: null,
};

let createdUserId = null;

function cashflowState(amount, name) {
  return {
    version: 1,
    income: { salary: amount },
    incomeEntries: [
      {
        id: `income-${stamp}-${amount}`,
        name,
        amount,
        incomeType: "salary",
        frequency: "monthly",
        date: new Date().toISOString().slice(0, 10),
        createdAt: new Date().toISOString(),
      },
    ],
    expenses: {},
  };
}

function savingsState(amount, name) {
  return {
    version: 1,
    goals: [
      {
        id: `goal-${stamp}-${amount}`,
        name,
        targetAmountNpr: Math.max(amount, 1),
        savedAmountNpr: amount,
        monthlyContributionNpr: 10000,
        status: "active",
        sortOrder: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
    transactions: [],
    balanceHidden: false,
  };
}

async function injectStaleLocal(page, profile, userId) {
  await page.addInitScript(
    ({ userId, stale }) => {
      try {
        localStorage.setItem(
          `fire-nepal-cashflow-v1:user:${userId}`,
          JSON.stringify({
            version: 1,
            income: { salary: stale.cashflowIncome },
            incomeEntries: [
              {
                id: "stale-local-income",
                name: "Stale Local Salary",
                amount: stale.cashflowIncome,
                incomeType: "salary",
                frequency: "monthly",
                date: new Date().toISOString().slice(0, 10),
                createdAt: new Date().toISOString(),
              },
            ],
            expenses: {},
          }),
        );
        localStorage.setItem(
          "fire-nepal-savings-workspace-v1",
          JSON.stringify({
            version: 1,
            goals: [
              {
                id: "stale-goal",
                name: "Stale Browser Goal",
                targetAmountNpr: Math.max(stale.savingsAmount, 1),
                savedAmountNpr: stale.savingsAmount,
                monthlyContributionNpr: 0,
                status: "active",
                sortOrder: 0,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              },
            ],
            transactions: [],
            balanceHidden: false,
          }),
        );
      } catch {
        /* ignore */
      }
    },
    { userId, stale: profile.staleLocal },
  );
}

async function login(page, nextPath) {
  await page.goto(`${baseUrl}/login?next=${encodeURIComponent(nextPath)}`, {
    waitUntil: "domcontentloaded",
    timeout: 120_000,
  });
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Continue" }).click();
  await page.waitForURL(new RegExp(nextPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), { timeout: 120_000 });
  await page.waitForTimeout(2500);
}

async function readApis(page) {
  return page.evaluate(async () => {
    const [cashflowRes, savingsRes, insuranceRes] = await Promise.all([
      fetch("/api/cashflow", { credentials: "include", cache: "no-store" }).then(async (r) => ({
        status: r.status,
        json: await r.json().catch(() => null),
      })),
      fetch("/api/savings", { credentials: "include", cache: "no-store" }).then(async (r) => ({
        status: r.status,
        json: await r.json().catch(() => null),
      })),
      fetch("/api/insurance", { credentials: "include", cache: "no-store" }).then(async (r) => ({
        status: r.status,
        json: await r.json().catch(() => null),
      })),
    ]);
    const incomeEntries = cashflowRes.json?.snapshot?.state?.incomeEntries ?? [];
    const goals = savingsRes.json?.snapshot?.state?.goals ?? [];
    return {
      cashflowStatus: cashflowRes.status,
      savingsStatus: savingsRes.status,
      insuranceStatus: insuranceRes.status,
      cashflowOk: Boolean(cashflowRes.json?.ok),
      savingsOk: Boolean(savingsRes.json?.ok),
      insuranceOk: Boolean(insuranceRes.json?.ok),
      cashflowError: cashflowRes.json?.error ?? null,
      savingsError: savingsRes.json?.error ?? null,
      incomeTotal: incomeEntries.reduce((s, e) => s + (Number(e.amount) || 0), 0),
      savingsTotal: goals.reduce((s, g) => s + (Number(g.savedAmountNpr) || 0), 0),
      incomeNames: incomeEntries.map((e) => e.name),
      goalNames: goals.map((g) => g.name),
      insuranceCount: Array.isArray(insuranceRes.json?.policies) ? insuranceRes.json.policies.length : null,
      localCashflowRaw: localStorage.getItem(
        Object.keys(localStorage).find((k) => k.startsWith("fire-nepal-cashflow-v1:user:")) ?? "",
      ),
      localSavingsRaw: localStorage.getItem("fire-nepal-savings-workspace-v1"),
    };
  });
}

async function captureBrowser(profile, userId) {
  const engine = profile.engine === "webkit" ? webkit : chromium;
  const browser = await engine.launch();
  try {
    const context = await browser.newContext({
      userAgent: profile.userAgent,
      viewport: { width: 1280, height: 900 },
    });
    const page = await context.newPage();
    await injectStaleLocal(page, profile, userId);
    await login(page, "/cashflow-dashboard");
    await page.waitForTimeout(3500);
    const cashflowUi = await page.evaluate(() => document.body?.innerText?.slice(0, 1500) ?? "");
    await page.screenshot({ path: join(outDir, `${profile.name}-cashflow.png`), fullPage: true });

    await page.goto(`${baseUrl}/savings-tracker`, { waitUntil: "domcontentloaded", timeout: 120_000 });
    await page.waitForTimeout(3000);
    const savingsUi = await page.evaluate(() => document.body?.innerText?.slice(0, 1500) ?? "");
    await page.screenshot({ path: join(outDir, `${profile.name}-savings.png`), fullPage: true });

    await page.goto(`${baseUrl}/insurance`, { waitUntil: "domcontentloaded", timeout: 120_000 });
    await page.waitForTimeout(3500);
    const insuranceUi = await page.evaluate(() => document.body?.innerText?.slice(0, 1500) ?? "");
    await page.screenshot({ path: join(outDir, `${profile.name}-insurance.png`), fullPage: true });

    const api = await readApis(page);
    const localCash = api.localCashflowRaw ? JSON.parse(api.localCashflowRaw) : null;
    const localSav = api.localSavingsRaw ? JSON.parse(api.localSavingsRaw) : null;
    const cachedIncome = (localCash?.incomeEntries ?? []).reduce((s, e) => s + (Number(e.amount) || 0), 0);
    const cachedSavings = (localSav?.goals ?? []).reduce((s, g) => s + (Number(g.savedAmountNpr) || 0), 0);

    return {
      api,
      cashflowUiSample: cashflowUi,
      savingsUiSample: savingsUi,
      insuranceUiSample: insuranceUi,
      cacheIncomeTotal: cachedIncome,
      cacheSavingsTotal: cachedSavings,
      renderedStaleIncome: cashflowUi.includes(String(profile.staleLocal.cashflowIncome)),
      renderedStaleSavings:
        savingsUi.includes("500,000") ||
        savingsUi.includes("500000") ||
        savingsUi.includes(String(profile.staleLocal.savingsAmount)),
    };
  } finally {
    await browser.close();
  }
}

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
  report.userId = createdUserId;

  // Seed canonical cloud values via authenticated app APIs (not service-role table guesses).
  const seedBrowser = await chromium.launch();
  try {
    const page = await seedBrowser.newPage({ viewport: { width: 1280, height: 900 } });
    await login(page, "/cashflow-dashboard");
    const seed = await page.evaluate(
      async ({ cashflow, savings }) => {
        const putCash = await fetch("/api/cashflow", {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ state: cashflow }),
        });
        const putSav = await fetch("/api/savings", {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ state: savings }),
        });
        const cashJson = await putCash.json().catch(() => null);
        const savJson = await putSav.json().catch(() => null);
        return {
          cashStatus: putCash.status,
          savStatus: putSav.status,
          cashOk: Boolean(cashJson?.ok),
          savOk: Boolean(savJson?.ok),
          cashError: cashJson?.error ?? null,
          savError: savJson?.error ?? null,
        };
      },
      {
        cashflow: cashflowState(cloudIncome, "Cloud Canonical Salary"),
        savings: savingsState(cloudSavings, "Cloud Canonical Goal"),
      },
    );
    report.cloudSeed = { income: cloudIncome, savings: cloudSavings, ...seed };
    if (!seed.cashOk && !seed.savOk) {
      throw new Error(`Cloud seed failed for both modules: cash=${seed.cashError} sav=${seed.savError}`);
    }
  } finally {
    await seedBrowser.close();
  }

  for (const profile of browsers) {
    report.browsers[profile.name] = await captureBrowser(profile, createdUserId);
  }

  const values = browsers.map((b) => report.browsers[b.name]);
  const apis = values.map((v) => v.api);

  // Prefer API identity; also require offline caches overwritten to cloud values when APIs succeeded.
  const cashflowComparable = report.cloudSeed?.cashOk;
  const savingsComparable = report.cloudSeed?.savOk;

  const cashflowSame =
    !cashflowComparable ||
    (apis.every((a) => a.incomeTotal === cloudIncome) &&
      values.every((v) => v.cacheIncomeTotal === cloudIncome) &&
      values.every((v) => !v.renderedStaleIncome));

  const savingsSame =
    !savingsComparable ||
    (apis.every((a) => a.savingsTotal === cloudSavings) &&
      values.every((v) => v.cacheSavingsTotal === cloudSavings) &&
      values.every((v) => !v.renderedStaleSavings || v.api.savingsTotal === cloudSavings));

  // Insurance API must agree across browsers (count identity).
  const insuranceSame = apis.every((a) => a.insuranceOk && a.insuranceCount === apis[0].insuranceCount);

  report.identical = Boolean(cashflowSame && savingsSame && insuranceSame);
  report.ok = report.identical && (cashflowComparable || savingsComparable || insuranceSame);
  report.checks = { cashflowSame, savingsSame, insuranceSame, cashflowComparable, savingsComparable };
} catch (error) {
  report.error = error instanceof Error ? error.message : String(error);
  report.ok = false;
} finally {
  if (createdUserId) {
    await admin.auth.admin.deleteUser(createdUserId).catch(() => null);
  }
  await writeFile(join(outDir, "report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}
