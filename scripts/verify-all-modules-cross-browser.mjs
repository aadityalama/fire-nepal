#!/usr/bin/env node
/**
 * COMPLETE end-to-end production SoT verification.
 * Same authenticated account × Chrome/Safari/Firefox/Edge/Naver/Mobile Safari.
 * Seeds ALL modules, pollutes localStorage, asserts identical Supabase data,
 * updates from Firefox, re-asserts every browser.
 *
 * Usage: node scripts/verify-all-modules-cross-browser.mjs [baseUrl]
 */
import { chromium, firefox, webkit } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const baseUrl = (process.argv[2] ?? process.env.BASE_URL ?? "https://www.firenepal.com").replace(/\/+$/, "");
const outDir = join(process.cwd(), "tmp-all-modules-sot-verify");
await mkdir(outDir, { recursive: true });

const MODULE_KEYS = [
  "return_to_nepal",
  "smart_loan",
  "fire_lending",
  "ssf_pension",
  "pension_slips",
  "nepal_col",
  "payslip_history",
  "family_hub",
  "financial_intel_rollups",
];

const browsers = [
  {
    name: "chrome",
    engine: "chromium",
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  },
  {
    name: "safari",
    engine: "webkit",
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15",
  },
  {
    name: "firefox",
    engine: "firefox",
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 14.5; rv:127.0) Gecko/20100101 Firefox/127.0",
  },
  {
    name: "edge",
    engine: "chromium",
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 Edg/126.0.0.0",
  },
  {
    name: "naver",
    engine: "chromium",
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 NAVER(inapp; search; 1250; 14.9.1) Mobile/15E148",
  },
  {
    name: "mobile_safari",
    engine: "webkit",
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
  },
];

const report = {
  baseUrl,
  ok: false,
  seed: null,
  round1: {},
  round2: {},
  identicalRound1: false,
  identicalRound2: false,
  noLocalStorageSoT: false,
  modules: {},
  error: null,
};

function launchEngine(name) {
  if (name === "webkit") return webkit;
  if (name === "firefox") return firefox;
  return chromium;
}

async function seedSession() {
  const cronSecret = (process.env.CRON_SECRET ?? "").trim();
  const headers = cronSecret ? { Authorization: `Bearer ${cronSecret}` } : undefined;
  const res = await fetch(`${baseUrl}/api/schema/e2e-sot-session?phase=seed`, {
    cache: "no-store",
    headers,
  });
  const json = await res.json();
  if (!res.ok || !json.ok) throw new Error(`Seed failed: ${json.error ?? res.status}`);
  return json;
}

async function cleanup(userId) {
  if (!userId) return;
  const cronSecret = (process.env.CRON_SECRET ?? "").trim();
  const headers = cronSecret ? { Authorization: `Bearer ${cronSecret}` } : undefined;
  await fetch(`${baseUrl}/api/schema/e2e-sot-session?phase=cleanup&userId=${encodeURIComponent(userId)}`, {
    cache: "no-store",
    headers,
  }).catch(() => null);
}

async function injectStaleLocal(page, userId, stamp) {
  await page.addInitScript(
    ({ userId, stamp }) => {
      const stale = {
        cashflow: 111111,
        savings: 222222,
        budget: 333333,
        insurance: 1,
        loan: 9,
        bank: 1,
      };
      try {
        localStorage.setItem(
          `fire-nepal-cashflow-v1:user:${userId}`,
          JSON.stringify({
            version: 1,
            income: {},
            incomeEntries: [
              {
                id: "stale-income",
                name: "STALE LOCAL",
                amount: stale.cashflow,
                incomeType: "salary",
                frequency: "monthly",
                date: "2020-01-01",
                createdAt: "2020-01-01T00:00:00.000Z",
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
                name: "STALE GOAL",
                targetAmountNpr: stale.savings,
                savedAmountNpr: stale.savings,
                monthlyContributionNpr: 0,
                status: "active",
                sortOrder: 0,
                createdAt: "2020-01-01T00:00:00.000Z",
                updatedAt: "2020-01-01T00:00:00.000Z",
              },
            ],
            transactions: [],
            balanceHidden: false,
          }),
        );
        localStorage.setItem(
          "fire-nepal-insurance-workspace-v1",
          JSON.stringify({ version: 1, policies: [{ id: "stale", coverageAmountNpr: stale.insurance }] }),
        );
        localStorage.setItem(
          `fire-nepal-portfolio-v2:user:${userId}`,
          JSON.stringify({
            version: 2,
            liquidCash: [{ id: "stale-bank", name: "STALE BANK", amount: stale.bank, currency: "NPR" }],
            fixedDeposits: [],
            investments: [],
            metals: [],
            realEstate: [],
            vehicles: [],
            liabilities: [],
            globalRetirementAssets: [],
            netWorthHistory: [],
            ledger: [],
          }),
        );
        localStorage.setItem(`module:smart_loan:${userId}`, JSON.stringify({ lentMoney: stale.loan, stamp }));
        localStorage.setItem("smartLoan.profiles", JSON.stringify([{ id: "stale", principal: 1 }]));
        localStorage.setItem("lentMoney", String(stale.loan));
      } catch {
        /* ignore */
      }
    },
    { userId, stamp },
  );
}

async function login(page, email, password) {
  await page.goto(`${baseUrl}/login?next=${encodeURIComponent("/cashflow-dashboard")}`, {
    waitUntil: "domcontentloaded",
    timeout: 120_000,
  });
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Continue" }).click();
  await page.waitForURL(/cashflow-dashboard/, { timeout: 120_000 });
  await page.waitForTimeout(3500);
}

async function readAllModules(page, accessToken, supabaseUrl, anonKey, expected) {
  return page.evaluate(
    async ({ accessToken, supabaseUrl, anonKey, moduleKeys, expected }) => {
      const authHeaders = {
        Authorization: `Bearer ${accessToken}`,
        apikey: anonKey,
        "Content-Type": "application/json",
      };
      const appHeaders = { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" };

      const getJson = async (url, headers) => {
        const res = await fetch(url, { headers, cache: "no-store", credentials: "include" });
        const json = await res.json().catch(() => null);
        return { status: res.status, json };
      };

      const [cash, sav, bud, ins, ...modRows] = await Promise.all([
        getJson("/api/cashflow", appHeaders),
        getJson("/api/savings", appHeaders),
        getJson("/api/budgets", appHeaders),
        getJson("/api/insurance", appHeaders),
        ...moduleKeys.map((k) => getJson(`/api/module-snapshots/${k}`, appHeaders).then((r) => ({ key: k, ...r }))),
      ]);

      const sb = async (table, query = "select=*") => {
        const res = await fetch(`${supabaseUrl}/rest/v1/${table}?${query}`, {
          headers: { ...authHeaders, Prefer: "return=representation" },
          cache: "no-store",
        });
        const json = await res.json().catch(() => null);
        return { status: res.status, json };
      };

      const [banks, inv, gold, re, expenses, groupExp, goals, biz] = await Promise.all([
        sb("bank_accounts", "select=row_id,payload&account_kind=eq.liquid"),
        sb("investments", "select=row_id,payload"),
        sb("gold_assets", "select=row_id,payload"),
        sb("real_estate", "select=row_id,payload"),
        sb("expense_transactions", "select=amount,description&deleted_at=is.null&order=created_at.desc&limit=5"),
        sb("group_expenses", "select=amount,title&deleted_at=is.null&order=created_at.desc&limit=5"),
        sb("fire_goals", "select=title,notes,payload&order=updated_at.desc&limit=10"),
        sb("business_profiles", "select=business_name,payload&limit=1"),
      ]);

      const incomeEntries = cash.json?.snapshot?.state?.incomeEntries ?? [];
      const income = incomeEntries.reduce((s, e) => s + (Number(e.amount) || 0), 0);
      const savingsGoals = sav.json?.snapshot?.state?.goals ?? [];
      const savingsSaved = savingsGoals.reduce((s, g) => s + (Number(g.savedAmountNpr) || 0), 0);
      const budgets = bud.json?.budgets ?? [];
      const budgetAmount = budgets.reduce(
        (s, b) => s + (Number(b.monthly_budget_npr ?? b.amount_npr ?? b.amountNpr) || 0),
        0,
      );
      const policies = ins.json?.policies ?? [];
      const insuranceCoverage = policies.reduce(
        (s, p) => s + (Number(p.coverage_amount_npr ?? p.coverageAmountNpr) || 0),
        0,
      );

      const bankAmount = (banks.json ?? []).reduce((s, r) => s + (Number(r.payload?.amount) || 0), 0);
      const investmentQty = (inv.json ?? []).reduce((s, r) => s + (Number(r.payload?.quantity) || 0), 0);
      const goldGrams = (gold.json ?? []).reduce((s, r) => s + (Number(r.payload?.grams) || 0), 0);
      const realEstateValue = (re.json ?? []).reduce(
        (s, r) => s + (Number(r.payload?.estimatedValue ?? r.payload?.purchaseValue) || 0),
        0,
      );
      const expenseAmount = (expenses.json ?? []).find((r) => String(r.description || "").includes("E2E Expense"))?.amount ?? null;
      const groupExpenseAmount =
        (groupExp.json ?? []).find((r) => String(r.title || "").includes("E2E Group Expense"))?.amount ?? null;
      const fireGoalTitle = (goals.json ?? []).find((r) => String(r.title || "").includes("E2E FIRE Goal"))?.title ?? null;
      const businessName = biz.json?.[0]?.business_name ?? null;

      const modules = {};
      for (const row of modRows) {
        modules[row.key] = {
          status: row.status,
          ok: Boolean(row.json?.ok),
          state: row.json?.snapshot?.state ?? null,
        };
      }

      const localCash = localStorage.getItem(
        Object.keys(localStorage).find((k) => k.startsWith("fire-nepal-cashflow-v1:user:")) ?? "",
      );
      const localSav = localStorage.getItem("fire-nepal-savings-workspace-v1");
      let localCashIncome = null;
      let localSavSaved = null;
      try {
        localCashIncome = JSON.parse(localCash || "null")?.incomeEntries?.reduce((s, e) => s + (Number(e.amount) || 0), 0) ?? null;
      } catch {
        /* ignore */
      }
      try {
        localSavSaved = JSON.parse(localSav || "null")?.goals?.reduce((s, g) => s + (Number(g.savedAmountNpr) || 0), 0) ?? null;
      } catch {
        /* ignore */
      }

      const checks = {
        cashflow: income === expected.cashflowIncome,
        savings: savingsSaved === expected.savingsSaved,
        budget: budgetAmount === expected.budgetAmount,
        insurance: insuranceCoverage === expected.insuranceCoverage,
        portfolioBank: bankAmount === expected.portfolioBankAmount,
        investment: investmentQty === expected.investmentQty,
        gold: Math.abs(goldGrams - Number(expected.goldGrams ?? 0)) < 0.05,
        realEstate: realEstateValue === expected.realEstateValue,
        expense: Number(expenseAmount) === expected.expenseAmount,
        groupExpense: Number(groupExpenseAmount) === expected.groupExpenseAmount,
        fireGoal: fireGoalTitle === expected.fireGoalTitle,
        business: businessName === expected.businessName,
        smartLoan: Number(modules.smart_loan?.state?.lentMoney) === expected.smartLoanLent,
        nepalCol: Number(modules.nepal_col?.state?.monthlyKoreaSpendNpr) === expected.nepalColSpend,
        returnPlanner: modules.return_to_nepal?.state?.city === expected.returnCity,
        familyHub: (modules.family_hub?.state?.emergencyContacts?.length ?? 0) === expected.familyMembersCount,
        fireLending: Number(modules.fire_lending?.state?.e2ePrincipal) === expected.fireLendingPrincipal,
        ssfPension: Number(modules.ssf_pension?.state?.e2eBalance) === expected.ssfBalance,
        pensionSlips: modules.pension_slips?.ok === true,
        payslip: Number(modules.payslip_history?.state?.e2eEntryCount) === expected.payslipCount,
        financialIntel: modules.financial_intel_rollups?.ok === true,
        // localStorage must NOT be the stale seed values as SoT after hydrate
        notStaleCashflowLocal: localCashIncome !== 111111,
        notStaleSavingsLocal: localSavSaved !== 222222,
      };

      return {
        income,
        savingsSaved,
        budgetAmount,
        insuranceCoverage,
        bankAmount,
        investmentQty,
        goldGrams,
        realEstateValue,
        expenseAmount,
        groupExpenseAmount,
        fireGoalTitle,
        businessName,
        modules,
        localCashIncome,
        localSavSaved,
        checks,
        allPassed: Object.values(checks).every(Boolean),
      };
    },
    {
      accessToken,
      supabaseUrl,
      anonKey,
      moduleKeys: MODULE_KEYS,
      expected: {
        ...expected,
        goldGrams: expected.goldGrams ?? expected.goldTola * 11.6638038,
      },
    },
  );
}

async function captureBrowser(profile, seed) {
  const engine = launchEngine(profile.engine);
  const browser = await engine.launch();
  try {
    const context = await browser.newContext({
      userAgent: profile.userAgent,
      viewport: profile.name.includes("mobile") || profile.name === "naver" ? { width: 390, height: 844 } : { width: 1280, height: 900 },
    });
    const page = await context.newPage();
    await injectStaleLocal(page, seed.userId, seed.stamp);
    await login(page, seed.email, seed.password);
    const snap = await readAllModules(
      page,
      seed.accessToken,
      "https://mnxxcewvgnohsavojdzu.supabase.co",
      "sb_publishable_gu02yEcK905t8_HLd7ixtg_nORizZdB",
      seed.expected,
    );
    await page.screenshot({ path: join(outDir, `${profile.name}-cashflow.png`), fullPage: true }).catch(() => null);
    return snap;
  } finally {
    await browser.close();
  }
}

async function updateFromFirefox(seed) {
  const browser = await firefox.launch();
  try {
    const page = await browser.newPage({
      userAgent: browsers.find((b) => b.name === "firefox").userAgent,
      viewport: { width: 1280, height: 900 },
    });
    await login(page, seed.email, seed.password);
    const updated = {
      cashflowIncome: seed.expected.cashflowIncome + 1000,
      savingsSaved: seed.expected.savingsSaved + 2000,
      smartLoanLent: seed.expected.smartLoanLent + 3000,
      budgetAmount: seed.expected.budgetAmount + 5000,
      insuranceCoverage: seed.expected.insuranceCoverage + 100000,
      nepalColSpend: seed.expected.nepalColSpend + 1500,
      returnCity: seed.expected.returnCity === "pokhara" ? "kathmandu" : "pokhara",
      portfolioBankAmount: seed.expected.portfolioBankAmount + 25000,
      investmentQty: seed.expected.investmentQty + 10,
      expenseAmount: seed.expected.expenseAmount + 777,
      realEstateValue: seed.expected.realEstateValue + 50000,
      groupExpenseAmount: seed.expected.groupExpenseAmount + 333,
      familyMembersCount: seed.expected.familyMembersCount + 1,
      fireLendingPrincipal: (seed.expected.modules?.fire_lending ?? 100000) + 11111,
      ssfBalance: (seed.expected.modules?.ssf_pension ?? 200000) + 22222,
      payslipCount: (seed.expected.modules?.payslip_history ?? 5) + 3,
      goldGramsDelta: 0,
    };
    const result = await page.evaluate(
      async ({ token, updated, stamp, supabaseUrl, anonKey, seedExpected }) => {
        const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
        const sbHeaders = {
          Authorization: `Bearer ${token}`,
          apikey: anonKey,
          "Content-Type": "application/json",
          Prefer: "return=representation",
        };

        const putCash = await fetch("/api/cashflow", {
          method: "PUT",
          headers,
          body: JSON.stringify({
            state: {
              income: {},
              incomeEntries: [
                {
                  id: `income-updated-${stamp}`,
                  name: "Updated Cloud Salary",
                  amount: updated.cashflowIncome,
                  incomeType: "salary",
                  frequency: "monthly",
                  date: "2026-08-01",
                  createdAt: "2026-08-01T00:00:00.000Z",
                },
              ],
              expenses: {},
            },
          }),
        });
        const putSav = await fetch("/api/savings", {
          method: "PUT",
          headers,
          body: JSON.stringify({
            state: {
              version: 1,
              goals: [
                {
                  id: `goal-updated-${stamp}`,
                  name: "Updated Cloud Goal",
                  targetAmountNpr: Math.max(updated.savingsSaved, 1),
                  savedAmountNpr: updated.savingsSaved,
                  monthlyContributionNpr: 10000,
                  status: "active",
                  sortOrder: 0,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                },
              ],
              transactions: [],
              balanceHidden: false,
            },
          }),
        });
        const putLoan = await fetch("/api/module-snapshots/smart_loan", {
          method: "PUT",
          headers,
          body: JSON.stringify({
            state: {
              version: 1,
              lentMoney: updated.smartLoanLent,
              borrowedMoney: 0,
              interestIncome: 0,
              profiles: [],
              documents: [],
            },
          }),
        });

        // Create an additional budget via API (sums into total)
        const postBudget = await fetch("/api/budgets", {
          method: "POST",
          headers,
          body: JSON.stringify({
            name: `Updated Budget ${stamp}`,
            category: "Living",
            period: "Monthly",
            amountNpr: 5000,
            notes: "firefox-update",
          }),
        });

        const putCol = await fetch("/api/module-snapshots/nepal_col", {
          method: "PUT",
          headers,
          credentials: "include",
          body: JSON.stringify({
            state: {
              cityId: "nepal-national-average",
              province: "Nepal",
              lifestyle: "comfortable",
              family: { adults: 2, children: 1, parents: 0 },
              monthlyIncomeNpr: updated.nepalColSpend * 2,
              monthlyKoreaSpendNpr: updated.nepalColSpend,
              expenses: {
                home: Math.round(updated.nepalColSpend * 0.35),
                food: Math.round(updated.nepalColSpend * 0.25),
                transportation: Math.round(updated.nepalColSpend * 0.1),
                utilities: Math.round(updated.nepalColSpend * 0.08),
                internet: Math.round(updated.nepalColSpend * 0.05),
                healthcare: Math.round(updated.nepalColSpend * 0.05),
                education: Math.round(updated.nepalColSpend * 0.05),
                entertainment: Math.round(updated.nepalColSpend * 0.03),
                clothing: Math.round(updated.nepalColSpend * 0.02),
                miscellaneous: Math.round(updated.nepalColSpend * 0.02),
              },
            },
          }),
        });

        const baseReturn = seedExpected.modules?.return_to_nepal_state ?? {
          koreaSavingsKrw: 10_000_000,
          nepalLiquidNpr: 500_000,
          monthlySalaryKrw: 3_000_000,
          salaryGrowthPct: 3,
          monthlySavingsKrw: 800_000,
          koreaYearsWorked: 5,
          plannedKoreaYearsRemaining: 3,
          nprPerKrw: 0.1,
          nepalInflationPct: 5,
          targetReturnYear: 2030,
          adults: 2,
          children: 1,
          lifestyle: "comfortable",
          landBudgetNpr: 0,
          constructionBudgetNpr: 0,
          interiorBudgetNpr: 0,
          furnitureBudgetNpr: 0,
          homeLoanPrincipalNpr: 0,
          homeLoanAprPct: 0,
          homeLoanYears: 0,
          houseProgressPct: 0,
          completedPhases: [],
          pensionMonthlyNpr: 0,
          dividendMonthlyNpr: 0,
          fdMonthlyNpr: 0,
          rentalMonthlyNpr: 0,
          swpMonthlyNpr: 0,
          severanceAutoCalculate: true,
          severanceOverrideKrw: 0,
          nationalPensionAutoCalculate: true,
          nationalPensionMaturityOverrideKrw: 0,
          settlementChecklist: [],
        };
        const putReturn = await fetch("/api/module-snapshots/return_to_nepal", {
          method: "PUT",
          headers,
          credentials: "include",
          body: JSON.stringify({
            state: { ...baseReturn, city: updated.returnCity, stamp },
          }),
        });

        // Patch portfolio bank via Supabase REST
        const banksRes = await fetch(
          `${supabaseUrl}/rest/v1/bank_accounts?select=row_id,payload&account_kind=eq.liquid&limit=1`,
          { headers: sbHeaders, cache: "no-store" },
        );
        const banks = await banksRes.json().catch(() => []);
        let bankOk = false;
        if (Array.isArray(banks) && banks[0]?.row_id) {
          const payload = { ...(banks[0].payload || {}), amount: updated.portfolioBankAmount };
          const patch = await fetch(
            `${supabaseUrl}/rest/v1/bank_accounts?row_id=eq.${encodeURIComponent(banks[0].row_id)}`,
            {
              method: "PATCH",
              headers: sbHeaders,
              body: JSON.stringify({ payload }),
            },
          );
          bankOk = patch.ok;
        }

        const invRes = await fetch(`${supabaseUrl}/rest/v1/investments?select=row_id,payload&limit=1`, {
          headers: sbHeaders,
          cache: "no-store",
        });
        const invs = await invRes.json().catch(() => []);
        let invOk = false;
        if (Array.isArray(invs) && invs[0]?.row_id) {
          const payload = { ...(invs[0].payload || {}), quantity: updated.investmentQty };
          const patch = await fetch(
            `${supabaseUrl}/rest/v1/investments?row_id=eq.${encodeURIComponent(invs[0].row_id)}`,
            {
              method: "PATCH",
              headers: sbHeaders,
              body: JSON.stringify({ payload }),
            },
          );
          invOk = patch.ok;
        }

        const expRes = await fetch(
          `${supabaseUrl}/rest/v1/expense_transactions?select=id,description&description=ilike.*E2E%20Expense*&deleted_at=is.null&limit=1`,
          { headers: sbHeaders, cache: "no-store" },
        );
        const exps = await expRes.json().catch(() => []);
        let expOk = false;
        if (Array.isArray(exps) && exps[0]?.id) {
          const patch = await fetch(
            `${supabaseUrl}/rest/v1/expense_transactions?id=eq.${encodeURIComponent(exps[0].id)}`,
            {
              method: "PATCH",
              headers: sbHeaders,
              body: JSON.stringify({ amount: updated.expenseAmount }),
            },
          );
          expOk = patch.ok;
        }

        // Insurance: create extra policy via API to bump coverage sum
        const postIns = await fetch("/api/insurance", {
          method: "POST",
          headers,
          credentials: "include",
          body: JSON.stringify({
            type: "life",
            provider: `Firefox Update ${stamp}`,
            coverageAmountNpr: 100000,
            premiumNpr: 1000,
            paymentFrequency: "yearly",
            policyTermYears: 20,
          }),
        });

        // Gold + real estate + group expense + family hub updates
        const goldRes = await fetch(`${supabaseUrl}/rest/v1/gold_assets?select=row_id,payload&limit=1`, {
          headers: sbHeaders,
          cache: "no-store",
        });
        const golds = await goldRes.json().catch(() => []);
        let goldOk = false;
        if (Array.isArray(golds) && golds[0]?.row_id) {
          const grams = Number(golds[0].payload?.grams || 0) + 1.5;
          const payload = { ...(golds[0].payload || {}), grams };
          const patch = await fetch(
            `${supabaseUrl}/rest/v1/gold_assets?row_id=eq.${encodeURIComponent(golds[0].row_id)}`,
            { method: "PATCH", headers: sbHeaders, body: JSON.stringify({ payload }) },
          );
          goldOk = patch.ok;
          if (goldOk) updated.goldGramsDelta = 1.5;
        }

        const reRes = await fetch(`${supabaseUrl}/rest/v1/real_estate?select=row_id,payload&limit=1`, {
          headers: sbHeaders,
          cache: "no-store",
        });
        const resRows = await reRes.json().catch(() => []);
        let reOk = false;
        if (Array.isArray(resRows) && resRows[0]?.row_id) {
          const payload = {
            ...(resRows[0].payload || {}),
            estimatedValue: updated.realEstateValue,
            purchaseValue: updated.realEstateValue,
          };
          const patch = await fetch(
            `${supabaseUrl}/rest/v1/real_estate?row_id=eq.${encodeURIComponent(resRows[0].row_id)}`,
            { method: "PATCH", headers: sbHeaders, body: JSON.stringify({ payload }) },
          );
          reOk = patch.ok;
        }

        const gExpRes = await fetch(
          `${supabaseUrl}/rest/v1/group_expenses?select=id,title&title=ilike.*E2E%20Group%20Expense*&deleted_at=is.null&limit=1`,
          { headers: sbHeaders, cache: "no-store" },
        );
        const gExps = await gExpRes.json().catch(() => []);
        let groupOk = false;
        if (Array.isArray(gExps) && gExps[0]?.id) {
          const patch = await fetch(
            `${supabaseUrl}/rest/v1/group_expenses?id=eq.${encodeURIComponent(gExps[0].id)}`,
            {
              method: "PATCH",
              headers: sbHeaders,
              body: JSON.stringify({ amount: updated.groupExpenseAmount }),
            },
          );
          groupOk = patch.ok;
        }

        const putFamily = await fetch("/api/module-snapshots/family_hub", {
          method: "PUT",
          headers,
          credentials: "include",
          body: JSON.stringify({
            state: {
              stabilityScore: 70,
              upcomingBills: [],
              familyGoals: [],
              emergencyContacts: Array.from({ length: updated.familyMembersCount }, (_, i) => ({
                id: `e2e-contact-updated-${stamp}-${i}`,
                name: `Updated Member ${i + 1}`,
                relation: i === 0 ? "self" : "family",
                phone: `9811111${String(i).padStart(3, "0")}`,
              })),
              hubInsights: [],
              children: [],
              attendanceWeek: [],
              exam: { title: "", subject: "", examDate: "2026-08-01" },
              studyStreakDays: 0,
              activityMinutes: [],
              sleepQuality: { score: 0, deepHours: 0, bedTime: "", wakeTime: "", note: "" },
              homework: [],
              tuition: { term: "", paidNpr: 0, totalNpr: 0, nextInstallment: "" },
              gpa: { current: 0, target: 0, term: "" },
              subjects: [],
              educationFund: { monthlySipNpr: 0, yearsToUniversity: 0, projectedCorpusNpr: 0, gapNpr: 0 },
              medicineReminders: [],
              insurance: [],
              vaccinations: [],
              emergencyMedical: { bloodTypes: "", allergies: "", insurerCard: "" },
              calendarEvents: [],
              parentingNotes: [],
              parentingInsights: [],
              familyAlerts: [],
              behaviorInsights: [],
              smartRecommendations: [],
              feePaymentHistory: [],
              examResults: [],
              gpaHistory: [],
              subjectTrendPoints: [],
              vaultDocuments: [],
              vaultTimeline: [],
              documentReminders: [],
              vaultEducationInsights: [],
              schedulePeriods: [],
              examSchedule: [],
              teacherNotes: [],
              stamp,
              familyMembersCount: updated.familyMembersCount,
            },
          }),
        });

        const putLending = await fetch("/api/module-snapshots/fire_lending", {
          method: "PUT",
          headers,
          credentials: "include",
          body: JSON.stringify({
            state: { version: 1, stamp, moduleKey: "fire_lending", e2ePrincipal: updated.fireLendingPrincipal },
          }),
        });
        const putSsf = await fetch("/api/module-snapshots/ssf_pension", {
          method: "PUT",
          headers,
          credentials: "include",
          body: JSON.stringify({
            state: { version: 1, stamp, moduleKey: "ssf_pension", e2eBalance: updated.ssfBalance },
          }),
        });
        const putPayslip = await fetch("/api/module-snapshots/payslip_history", {
          method: "PUT",
          headers,
          credentials: "include",
          body: JSON.stringify({
            state: { version: 1, stamp, moduleKey: "payslip_history", e2eEntryCount: updated.payslipCount },
          }),
        });

        return {
          cashOk: putCash.ok,
          savOk: putSav.ok,
          loanOk: putLoan.ok,
          budgetOk: postBudget.ok,
          colOk: putCol.ok,
          returnOk: putReturn.ok,
          bankOk,
          invOk,
          expOk,
          insOk: postIns.ok,
          goldOk,
          reOk,
          groupOk,
          familyOk: putFamily.ok,
          lendingOk: putLending.ok,
          ssfOk: putSsf.ok,
          payslipOk: putPayslip.ok,
          budgetStatus: postBudget.status,
          insStatus: postIns.status,
          insBody: await postIns.json().catch(() => null),
          returnStatus: putReturn.status,
          familyStatus: putFamily.status,
        };
      },
      {
        token: seed.accessToken,
        updated,
        stamp: seed.stamp,
        supabaseUrl: "https://mnxxcewvgnohsavojdzu.supabase.co",
        anonKey: "sb_publishable_gu02yEcK905t8_HLd7ixtg_nORizZdB",
        seedExpected: seed.expected,
      },
    );
    return { ...updated, ...result };
  } finally {
    await browser.close();
  }
}

let userId = null;
try {
  console.log(`Seeding production SoT user via ${baseUrl} ...`);
  const seed = await seedSession();
  userId = seed.userId;
  report.seed = {
    userId: seed.userId,
    email: seed.email,
    stamp: seed.stamp,
    expected: seed.expected,
  };
  // goldGrams for asserts
  seed.expected.goldGrams = Number(seed.expected.goldTola) * 11.6638038;
  seed.expected.fireLendingPrincipal = Number(seed.expected.modules?.fire_lending ?? 0);
  seed.expected.ssfBalance = Number(seed.expected.modules?.ssf_pension ?? 0);
  seed.expected.payslipCount = Number(seed.expected.modules?.payslip_history ?? 0);

  console.log("Round 1: read all modules across browsers (with stale localStorage)...");
  for (const profile of browsers) {
    console.log(`  → ${profile.name}`);
    report.round1[profile.name] = await captureBrowser(profile, seed);
  }

  const r1 = browsers.map((b) => report.round1[b.name]);
  report.identicalRound1 = r1.every((s) => s?.allPassed);
  report.noLocalStorageSoT = r1.every((s) => s?.checks?.notStaleCashflowLocal && s?.checks?.notStaleSavingsLocal);

  console.log("Updating modules from Firefox...");
  const updated = await updateFromFirefox(seed);
  seed.expected.cashflowIncome = updated.cashflowIncome;
  seed.expected.savingsSaved = updated.savingsSaved;
  seed.expected.smartLoanLent = updated.smartLoanLent;
  seed.expected.budgetAmount = updated.budgetAmount;
  seed.expected.insuranceCoverage = updated.insuranceCoverage;
  seed.expected.nepalColSpend = updated.nepalColSpend;
  seed.expected.returnCity = updated.returnCity;
  seed.expected.portfolioBankAmount = updated.portfolioBankAmount;
  seed.expected.investmentQty = updated.investmentQty;
  seed.expected.expenseAmount = updated.expenseAmount;
  seed.expected.goldGrams = Number(seed.expected.goldGrams) + 1.5;
  seed.expected.realEstateValue = updated.realEstateValue;
  seed.expected.groupExpenseAmount = updated.groupExpenseAmount;
  seed.expected.familyMembersCount = updated.familyMembersCount;
  seed.expected.fireLendingPrincipal = updated.fireLendingPrincipal;
  seed.expected.ssfBalance = updated.ssfBalance;
  seed.expected.payslipCount = updated.payslipCount;
  report.firefoxUpdate = updated;

  const criticalUpdatesOk =
    updated.cashOk &&
    updated.savOk &&
    updated.loanOk &&
    updated.budgetOk &&
    updated.insOk &&
    updated.colOk &&
    updated.returnOk &&
    updated.bankOk &&
    updated.invOk &&
    updated.expOk &&
    updated.goldOk &&
    updated.reOk &&
    updated.groupOk &&
    updated.familyOk &&
    updated.lendingOk &&
    updated.ssfOk &&
    updated.payslipOk;
  if (!criticalUpdatesOk) {
    throw new Error(`Firefox module updates incomplete: ${JSON.stringify(updated)}`);
  }

  console.log("Round 2: confirm every browser sees Firefox updates...");
  for (const profile of browsers) {
    console.log(`  → ${profile.name}`);
    report.round2[profile.name] = await captureBrowser(profile, seed);
  }
  const r2 = browsers.map((b) => report.round2[b.name]);
  report.identicalRound2 = r2.every((s) => s?.allPassed === true);

  // Per-module pass matrix from round1
  const moduleNames = [
    "cashflow",
    "savings",
    "budget",
    "insurance",
    "portfolioBank",
    "investment",
    "gold",
    "realEstate",
    "expense",
    "groupExpense",
    "fireGoal",
    "business",
    "smartLoan",
    "nepalCol",
    "returnPlanner",
    "familyHub",
    "fireLending",
    "ssfPension",
    "pensionSlips",
    "payslip",
    "financialIntel",
  ];
  for (const mod of moduleNames) {
    report.modules[mod] = {
      round1: r1.every((s) => s?.checks?.[mod] === true),
      round2AllSynced: r2.every((s) => s?.checks?.[mod] === true),
    };
  }

  report.ok =
    report.identicalRound1 &&
    report.identicalRound2 &&
    report.noLocalStorageSoT &&
    Object.values(report.modules).every((m) => m.round1 === true && m.round2AllSynced === true);
} catch (error) {
  report.error = error instanceof Error ? error.message : String(error);
  report.ok = false;
} finally {
  await cleanup(userId);
  await writeFile(join(outDir, "report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
  console.log("\nSUCCESS: every authenticated module passed cross-browser SoT verification.");
}
