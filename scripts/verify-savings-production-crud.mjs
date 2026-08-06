/**
 * Production Savings CRUD + cross-browser SoT verification.
 *
 * Usage: node scripts/verify-savings-production-crud.mjs [baseUrl]
 */
import { createClient } from "@supabase/supabase-js";
import { chromium, webkit } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { loadDotEnvLocal } from "./load-dotenv-local.mjs";

loadDotEnvLocal();

const baseUrl = (process.argv[2] || "https://www.firenepal.com").replace(/\/+$/, "");
const outDir = join(process.cwd(), "tmp-savings-production-verify");
mkdirSync(outDir, { recursive: true });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
const email = `savings-crud-${Date.now()}@firenepal.test`;
const password = `SavCrud-${Date.now()}!Aa1`;
const goalName = `Prod Goal ${Date.now()}`;
const editedName = `${goalName} Edited`;

const profiles = [
  {
    name: "chrome",
    engine: "chromium",
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
    staleAmount: 111111,
  },
  {
    name: "safari",
    engine: "webkit",
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15",
    staleAmount: 500000,
  },
  {
    name: "naver",
    engine: "chromium",
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1 NAVER(inapp; search; 1200; 12.0.0)",
    staleAmount: 424242,
  },
];

const report = {
  baseUrl,
  email,
  commit: "358914b",
  createdAt: new Date().toISOString(),
};

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

function savingsState(amount, name) {
  const now = new Date().toISOString();
  const targetDate = new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10);
  return {
    version: 1,
    goals: [
      {
        id: crypto.randomUUID(),
        templateId: "emergency",
        name,
        icon: "🚨",
        category: "Emergency",
        targetAmountNpr: Math.max(amount * 2, 100000),
        savedAmountNpr: amount,
        monthlyContributionNpr: 5000,
        targetDate,
        reminderEnabled: true,
        reminderTimings: [
          "7 days before",
          "3 days before",
          "1 day before",
          "Goal completed",
          "Monthly reminder",
        ],
        status: "active",
        sortOrder: 0,
        createdAt: now,
        updatedAt: now,
      },
    ],
    transactions: [],
    balanceHidden: false,
  };
}

async function apiRoundTrip(page) {
  return page.evaluate(async ({ createState, editState, emptyState }) => {
    const put = async (state) => {
      const res = await fetch("/api/savings", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state }),
      });
      const json = await res.json().catch(() => null);
      return { status: res.status, ok: Boolean(json?.ok), error: json?.error ?? null, snapshot: json?.snapshot ?? null };
    };
    const get = async () => {
      const res = await fetch("/api/savings", { credentials: "include", cache: "no-store" });
      const json = await res.json().catch(() => null);
      return { status: res.status, ok: Boolean(json?.ok), error: json?.error ?? null, snapshot: json?.snapshot ?? null };
    };

    const created = await put(createState);
    const afterCreate = await get();
    const edited = await put(editState);
    const afterEdit = await get();
    const deleted = await put(emptyState);
    const afterDelete = await get();
    const localRaw = localStorage.getItem("fire-nepal-savings-workspace-v1");

    return {
      created,
      afterCreate,
      edited,
      afterEdit,
      deleted,
      afterDelete,
      localRaw,
      bodyText: document.body?.innerText?.slice(0, 2000) ?? "",
    };
  }, {
    createState: savingsState(25000, goalName),
    editState: savingsState(40000, editedName),
    emptyState: { version: 1, goals: [], transactions: [], balanceHidden: false },
  });
}

try {
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (created.error || !created.data.user?.id) {
    throw new Error(`createUser failed: ${created.error?.message ?? "unknown"}`);
  }
  report.userId = created.data.user.id;

  // Seed + CRUD via Chrome first (authoritative API path)
  const seedBrowser = await chromium.launch();
  try {
    const page = await seedBrowser.newPage({ viewport: { width: 1280, height: 900 } });
    await login(page, "/savings-tracker");
    await page.waitForTimeout(2000);
    report.crud = await apiRoundTrip(page);
    await page.screenshot({ path: join(outDir, "chrome-crud.png"), fullPage: true });
  } finally {
    await seedBrowser.close();
  }

  if (!report.crud?.created?.ok || !report.crud?.edited?.ok || !report.crud?.deleted?.ok) {
    throw new Error(`CRUD failed: ${JSON.stringify(report.crud, null, 2)}`);
  }

  // Re-seed a shared cloud goal, then verify identical reads across browsers despite stale localStorage
  const sharedAmount = 777000;
  const sharedName = "Cloud Shared Savings Goal";
  const seedBrowser2 = await chromium.launch();
  try {
    const page = await seedBrowser2.newPage({ viewport: { width: 1280, height: 900 } });
    await login(page, "/savings-tracker");
    const seed = await page.evaluate(async (state) => {
      const res = await fetch("/api/savings", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state }),
      });
      const json = await res.json().catch(() => null);
      return { status: res.status, ok: Boolean(json?.ok), error: json?.error ?? null, goals: json?.snapshot?.state?.goals ?? [] };
    }, savingsState(sharedAmount, sharedName));
    report.sharedSeed = seed;
    if (!seed.ok) throw new Error(`shared seed failed: ${seed.error}`);
  } finally {
    await seedBrowser2.close();
  }

  report.browsers = {};
  for (const profile of profiles) {
    const engine = profile.engine === "webkit" ? webkit : chromium;
    const browser = await engine.launch();
    try {
      const context = await browser.newContext({
        userAgent: profile.userAgent,
        viewport: { width: 1280, height: 900 },
      });
      const page = await context.newPage();
      await page.addInitScript(
        ({ amount, name }) => {
          localStorage.setItem(
            "fire-nepal-savings-workspace-v1",
            JSON.stringify({
              version: 1,
              goals: [
                {
                  id: "stale-local",
                  name,
                  targetAmountNpr: amount * 2,
                  savedAmountNpr: amount,
                  monthlyContributionNpr: 1,
                  currency: "NPR",
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
        },
        { amount: profile.staleAmount, name: `STALE ${profile.name}` },
      );
      await login(page, "/savings-tracker");
      await page.waitForTimeout(3500);
      const ui = await page.evaluate(() => document.body?.innerText?.slice(0, 2500) ?? "");
      const api = await page.evaluate(async () => {
        const res = await fetch("/api/savings", { credentials: "include", cache: "no-store" });
        const json = await res.json().catch(() => null);
        return {
          status: res.status,
          ok: Boolean(json?.ok),
          error: json?.error ?? null,
          goals: json?.snapshot?.state?.goals ?? [],
          localRaw: localStorage.getItem("fire-nepal-savings-workspace-v1"),
        };
      });
      await page.screenshot({ path: join(outDir, `${profile.name}-savings.png`), fullPage: true });
      report.browsers[profile.name] = {
        api,
        uiHasShared: ui.includes(sharedName) || ui.includes("777,000") || ui.includes("777000"),
        uiHasStale: ui.includes(`STALE ${profile.name}`) || ui.includes(String(profile.staleAmount)),
        localCleared: api.localRaw == null,
        goalNames: (api.goals || []).map((g) => g.name),
        savedTotal: (api.goals || []).reduce((s, g) => s + (Number(g.savedAmountNpr) || 0), 0),
      };
    } finally {
      await browser.close();
    }
  }

  const totals = Object.values(report.browsers).map((b) => b.savedTotal);
  const names = Object.values(report.browsers).map((b) => JSON.stringify(b.goalNames));
  report.ok =
    report.crud.created.ok &&
    report.crud.edited.ok &&
    report.crud.deleted.ok &&
    totals.every((t) => t === sharedAmount) &&
    names.every((n) => n === names[0]) &&
    Object.values(report.browsers).every((b) => b.localCleared && !b.uiHasStale);

  writeFileSync(join(outDir, "report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
} catch (error) {
  report.error = error instanceof Error ? error.message : String(error);
  writeFileSync(join(outDir, "report.json"), JSON.stringify(report, null, 2));
  console.error(report.error);
  process.exit(1);
} finally {
  if (report.userId) {
    await admin.from("fire_goals").delete().eq("user_id", report.userId);
    await admin.auth.admin.deleteUser(report.userId).catch(() => null);
  }
}
