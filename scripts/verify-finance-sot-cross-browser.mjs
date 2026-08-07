#!/usr/bin/env node
/**
 * Full cross-browser SoT verification for authenticated finance modules.
 * Seeds cloud via app APIs, opens Chrome / Safari / Firefox / Edge / Naver with
 * conflicting localStorage, asserts identical Supabase-backed snapshots.
 *
 * Usage: node scripts/verify-finance-sot-cross-browser.mjs [baseUrl]
 */
import { createClient } from "@supabase/supabase-js";
import { chromium, firefox, webkit } from "playwright";
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
const cloudBudgetAmount = 42000;
const cloudColMonthly = 85000;
const cloudSmartLoanLent = 333333;

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
    name: "firefox",
    engine: "firefox",
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 14.5; rv:127.0) Gecko/20100101 Firefox/127.0",
    staleLocal: { cashflowIncome: 888_888, savingsAmount: 222_222 },
  },
  {
    name: "edge",
    engine: "chromium",
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 Edg/126.0.0.0",
    staleLocal: { cashflowIncome: 777_777, savingsAmount: 333_333 },
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
  checks: null,
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
        localStorage.setItem(
          "fire-nepal-insurance-workspace-v1",
          JSON.stringify({
            version: 1,
            policies: [{ id: "stale-policy", provider: "Stale Local Insurer", coverageAmountNpr: 1 }],
          }),
        );
        localStorage.setItem(`fire-nepal-portfolio-v2:user:${userId}`, JSON.stringify({ version: 2, investments: [{ id: "stale", name: "STALE", quantity: 999 }] }));
        localStorage.setItem("smartLoan.profiles", JSON.stringify([{ id: "stale-loan", borrowerName: "Stale", principal: 1 }]));
        localStorage.setItem("lentMoney", "1");
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
    const keys = ["return_to_nepal", "smart_loan", "nepal_col", "payslip_history", "ssf_pension"];
    const [cashflowRes, savingsRes, insuranceRes, budgetsRes, ...moduleRes] = await Promise.all([
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
      fetch("/api/budgets", { credentials: "include", cache: "no-store" }).then(async (r) => ({
        status: r.status,
        json: await r.json().catch(() => null),
      })),
      ...keys.map((moduleKey) =>
        fetch(`/api/module-snapshots/${moduleKey}`, { credentials: "include", cache: "no-store" }).then(async (r) => ({
          moduleKey,
          status: r.status,
          json: await r.json().catch(() => null),
        })),
      ),
    ]);
    const incomeEntries = cashflowRes.json?.snapshot?.state?.incomeEntries ?? [];
    const goals = savingsRes.json?.snapshot?.state?.goals ?? [];
    const budgets = budgetsRes.json?.budgets ?? budgetsRes.json?.records ?? [];
    const modules = Object.fromEntries(
      moduleRes.map((row) => [
        row.moduleKey,
        {
          status: row.status,
          ok: Boolean(row.json?.ok),
          state: row.json?.snapshot?.state ?? null,
        },
      ]),
    );
    return {
      cashflowStatus: cashflowRes.status,
      savingsStatus: savingsRes.status,
      insuranceStatus: insuranceRes.status,
      budgetsStatus: budgetsRes.status,
      cashflowOk: Boolean(cashflowRes.json?.ok),
      savingsOk: Boolean(savingsRes.json?.ok),
      insuranceOk: Boolean(insuranceRes.json?.ok),
      budgetsOk: Boolean(budgetsRes.json?.ok),
      cashflowError: cashflowRes.json?.error ?? null,
      savingsError: savingsRes.json?.error ?? null,
      incomeTotal: incomeEntries.reduce((s, e) => s + (Number(e.amount) || 0), 0),
      savingsTotal: goals.reduce((s, g) => s + (Number(g.savedAmountNpr) || 0), 0),
      budgetAmount: Array.isArray(budgets)
        ? budgets.reduce((s, b) => s + (Number(b.monthly_budget_npr ?? b.amount_npr ?? b.amountNpr) || 0), 0)
        : null,
      insuranceCount: Array.isArray(insuranceRes.json?.policies) ? insuranceRes.json.policies.length : null,
      modules,
      localCashflowRaw: localStorage.getItem(
        Object.keys(localStorage).find((k) => k.startsWith("fire-nepal-cashflow-v1:user:")) ?? "",
      ),
      localSavingsRaw: localStorage.getItem("fire-nepal-savings-workspace-v1"),
    };
  });
}

function launchEngine(name) {
  if (name === "webkit") return webkit;
  if (name === "firefox") return firefox;
  return chromium;
}

async function captureBrowser(profile, userId) {
  const engine = launchEngine(profile.engine);
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
    await page.screenshot({ path: join(outDir, `${profile.name}-insurance.png`), fullPage: true });

    await page.goto(`${baseUrl}/budget`, { waitUntil: "domcontentloaded", timeout: 120_000 }).catch(() => null);
    await page.waitForTimeout(2000);

    const api = await readApis(page);
    const localCash = api.localCashflowRaw ? JSON.parse(api.localCashflowRaw) : null;
    const localSav = api.localSavingsRaw ? JSON.parse(api.localSavingsRaw) : null;
    const cachedIncome = (localCash?.incomeEntries ?? []).reduce((s, e) => s + (Number(e.amount) || 0), 0);
    const cachedSavings = (localSav?.goals ?? []).reduce((s, g) => s + (Number(g.savedAmountNpr) || 0), 0);

    return {
      api,
      cashflowUiSample: cashflowUi,
      savingsUiSample: savingsUi,
      cacheIncomeTotal: cachedIncome,
      cacheSavingsTotal: cachedSavings,
      renderedStaleIncome: cashflowUi.includes(String(profile.staleLocal.cashflowIncome)),
      renderedStaleSavings: savingsUi.includes(String(profile.staleLocal.savingsAmount)),
      moduleSmartLoanLent: api.modules?.smart_loan?.state?.lentMoney ?? null,
      moduleColSpend: api.modules?.nepal_col?.state?.monthlySpendNpr ?? api.modules?.nepal_col?.state?.plan?.monthlySpendNpr ?? null,
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

  const seedBrowser = await chromium.launch();
  try {
    const page = await seedBrowser.newPage({ viewport: { width: 1280, height: 900 } });
    await login(page, "/cashflow-dashboard");
    const seed = await page.evaluate(
      async ({ cashflow, savings, budgetAmount, colMonthly, smartLoanLent }) => {
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
        const putBudget = await fetch("/api/budgets", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Cloud Canonical Budget",
            category: "housing",
            period: "monthly",
            amount_npr: budgetAmount,
            monthly_budget_npr: budgetAmount,
            icon: "home",
            gradient: "from-emerald-500 to-teal-600",
          }),
        });
        const putCol = await fetch("/api/module-snapshots/nepal_col", {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            state: {
              lifestyle: "standard",
              city: "kathmandu",
              adults: 2,
              children: 0,
              monthlySpendNpr: colMonthly,
            },
          }),
        });
        const putLoan = await fetch("/api/module-snapshots/smart_loan", {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            state: {
              version: 1,
              lentMoney: smartLoanLent,
              borrowedMoney: 0,
              interestIncome: 0,
              profiles: [],
              documents: [],
            },
          }),
        });
        const cashJson = await putCash.json().catch(() => null);
        const savJson = await putSav.json().catch(() => null);
        const budgetJson = await putBudget.json().catch(() => null);
        const colJson = await putCol.json().catch(() => null);
        const loanJson = await putLoan.json().catch(() => null);
        return {
          cashStatus: putCash.status,
          savStatus: putSav.status,
          budgetStatus: putBudget.status,
          colStatus: putCol.status,
          loanStatus: putLoan.status,
          cashOk: Boolean(cashJson?.ok),
          savOk: Boolean(savJson?.ok),
          budgetOk: Boolean(budgetJson?.ok),
          colOk: Boolean(colJson?.ok),
          loanOk: Boolean(loanJson?.ok),
          cashError: cashJson?.error ?? null,
          savError: savJson?.error ?? null,
          budgetError: budgetJson?.error ?? null,
          colError: colJson?.error ?? null,
          loanError: loanJson?.error ?? null,
        };
      },
      {
        cashflow: cashflowState(cloudIncome, "Cloud Canonical Salary"),
        savings: savingsState(cloudSavings, "Cloud Canonical Goal"),
        budgetAmount: cloudBudgetAmount,
        colMonthly: cloudColMonthly,
        smartLoanLent: cloudSmartLoanLent,
      },
    );
    report.cloudSeed = {
      income: cloudIncome,
      savings: cloudSavings,
      budget: cloudBudgetAmount,
      col: cloudColMonthly,
      smartLoan: cloudSmartLoanLent,
      ...seed,
    };
    if (!seed.cashOk && !seed.savOk && !seed.budgetOk && !seed.colOk && !seed.loanOk) {
      throw new Error(`Cloud seed failed for all modules`);
    }
  } finally {
    await seedBrowser.close();
  }

  for (const profile of browsers) {
    report.browsers[profile.name] = await captureBrowser(profile, createdUserId);
  }

  const values = browsers.map((b) => report.browsers[b.name]);
  const apis = values.map((v) => v.api);

  const cashflowSame =
    !report.cloudSeed?.cashOk ||
    (apis.every((a) => a.incomeTotal === cloudIncome) &&
      values.every((v) => v.cacheIncomeTotal === cloudIncome || v.cacheIncomeTotal === 0) &&
      values.every((v) => !v.renderedStaleIncome));

  const savingsSame =
    !report.cloudSeed?.savOk ||
    (apis.every((a) => a.savingsTotal === cloudSavings) && values.every((v) => !v.renderedStaleSavings));

  const insuranceSame = apis.every((a) => a.insuranceOk && a.insuranceCount === apis[0].insuranceCount);

  const budgetsSame =
    !report.cloudSeed?.budgetOk ||
    apis.every((a) => a.budgetsOk && Number(a.budgetAmount) === Number(apis[0].budgetAmount));

  const modulesSame =
    (!report.cloudSeed?.loanOk ||
      values.every((v) => Number(v.moduleSmartLoanLent) === cloudSmartLoanLent)) &&
    (!report.cloudSeed?.colOk ||
      values.every((v) => v.api.modules?.nepal_col?.ok));

  report.identical = Boolean(cashflowSame && savingsSame && insuranceSame && budgetsSame && modulesSame);
  report.ok = report.identical;
  report.checks = {
    cashflowSame,
    savingsSame,
    insuranceSame,
    budgetsSame,
    modulesSame,
    browsers: browsers.map((b) => b.name),
  };
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
