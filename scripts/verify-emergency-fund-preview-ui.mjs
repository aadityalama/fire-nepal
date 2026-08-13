#!/usr/bin/env node
/**
 * Local Preview UI verification for Emergency Fund (Playwright).
 * Requires: npm run dev on :3000 and a valid fn_session cookie (legacy auth).
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import { chromium } from "playwright";

const BASE = process.env.EF_PREVIEW_BASE || "http://localhost:3000";
const USER_ID =
  process.env.EF_PREVIEW_USER_ID ||
  (fs.existsSync("/tmp/ef-user-id.txt")
    ? fs.readFileSync("/tmp/ef-user-id.txt", "utf8").trim()
    : "c0894547-0150-49a3-a053-184ac4530135");
const ARTIFACT_DIR = "/opt/cursor/artifacts/emergency-fund-preview";
fs.mkdirSync(ARTIFACT_DIR, { recursive: true });

function readFnSessionCookie() {
  const raw = fs.readFileSync("/tmp/ef-cookies.txt", "utf8");
  const line = raw
    .split("\n")
    .find((l) => l.includes("\tfn_session\t") || l.includes(" fn_session "));
  if (!line) throw new Error("fn_session cookie missing in /tmp/ef-cookies.txt");
  const parts = line.split("\t");
  return parts[parts.length - 1].trim();
}

const monthKey = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};

async function seedFinanceData(page, { withExpenses, emergencyCashReserve = 0 }) {
  await page.addInitScript(
    ({ userId, withExpenses, monthKey, emergencyCashReserve }) => {
      const auth = {
        version: 1,
        user: {
          id: userId,
          email: "ef-preview@example.com",
          name: "EF Preview",
          createdAt: new Date().toISOString(),
          emailVerified: true,
        },
        accessToken: "mock",
      };
      localStorage.setItem("fire-nepal-product-auth-v1", JSON.stringify(auth));

      const cashflow = {
        version: 1,
        income: { salary: 120000 },
        expenses: {},
        incomeEntries: [],
        emergencyCashReserve,
        monthlyExpensesOverride: undefined,
      };
      localStorage.setItem(`fire-nepal-cashflow-v1:user:${userId}`, JSON.stringify(cashflow));

      if (withExpenses) {
        const expenseState = {
          version: 1,
          expenses: [
            {
              id: 1,
              title: "Rent",
              amount: 45000,
              payerId: "self",
              category: "Housing",
              splitEqually: true,
              date: `${monthKey}-05`,
            },
          ],
          members: ["self"],
          profiles: {},
          activities: [],
        };
        localStorage.setItem("fire-nepal-personal-expenses-v1", JSON.stringify(expenseState));
      } else {
        localStorage.removeItem("fire-nepal-personal-expenses-v1");
      }
    },
    { userId: USER_ID, withExpenses, monthKey: monthKey(), emergencyCashReserve },
  );
}

async function main() {
  const token = readFnSessionCookie();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
  });
  await context.addCookies([
    {
      name: "fn_session",
      value: token,
      domain: "localhost",
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);

  // --- Finance nav order ---
  {
    const page = await context.newPage();
    await seedFinanceData(page, { withExpenses: true });
    await page.goto(`${BASE}/finance`, { waitUntil: "networkidle" });
    await page.waitForTimeout(800);
    const labels = await page.locator("a").evaluateAll((nodes) =>
      nodes.map((n) => (n.textContent || "").replace(/\s+/g, " ").trim()).filter(Boolean),
    );
    const joined = labels.join(" | ");
    const cashflowIdx = labels.findIndex((t) => t.includes("Cashflow"));
    const efIdx = labels.findIndex((t) => t.includes("Emergency Fund"));
    assert.ok(cashflowIdx >= 0 && efIdx >= 0, `Finance items missing. Saw: ${joined.slice(0, 400)}`);
    assert.ok(efIdx === cashflowIdx + 1 || efIdx > cashflowIdx, "Emergency Fund should follow Cashflow");
    // Prefer immediate adjacency in workspace cards
    const cardTitles = await page.locator("a h2, a h3, [class*='Workspace'] a").evaluateAll((nodes) =>
      nodes.map((n) => (n.textContent || "").trim()).filter(Boolean),
    );
    await page.screenshot({ path: `${ARTIFACT_DIR}/01-finance-nav.png`, fullPage: true });
    console.log("Finance nav OK", { cashflowIdx, efIdx, cardTitles: cardTitles.slice(0, 8) });
    await page.close();
  }

  // --- Empty state when no expense burn ---
  {
    const page = await context.newPage();
    await seedFinanceData(page, { withExpenses: false });
    await page.goto(`${BASE}/emergency-fund`, { waitUntil: "networkidle" });
    await page.waitForSelector("text=Emergency Fund", { timeout: 15000 });
    await page.waitForTimeout(800);
    const body = await page.locator("body").innerText();
    assert.doesNotMatch(body, /Sign in|SECURE WORKSPACE ACCESS/i);
    assert.match(body, /Complete your cashflow first/i);
    assert.match(body, /Save Emergency Fund/i);
    await page.screenshot({ path: `${ARTIFACT_DIR}/02-empty-state.png`, fullPage: true });
    console.log("Empty state OK");
    await page.close();
  }

  // --- Expense burn unlocks recommended target + Save persists ---
  {
    const page = await context.newPage();
    await seedFinanceData(page, { withExpenses: true, emergencyCashReserve: 0 });
    await page.goto(`${BASE}/emergency-fund`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1500);
    const body = await page.locator("body").innerText();
    assert.doesNotMatch(body, /Complete your cashflow first/i);
    assert.match(body, /Recommended target/i);
    assert.match(body, /270/); // 45k * 6
    assert.match(body, /Save Emergency Fund/i);

    // Fill current amount and save
    const input = page.locator('input[inputmode="numeric"]').first();
    await input.fill("90000");
    await page.getByRole("button", { name: /Save Emergency Fund/i }).click();
    await page.waitForTimeout(1500);
    const afterSave = await page.locator("body").innerText();
    assert.match(afterSave, /Saved to Cashflow|FIRE Progress updated/i);
    await page.screenshot({ path: `${ARTIFACT_DIR}/03-emergency-fund-with-target.png`, fullPage: true });

    // Confirm localStorage SoT updated (user-scoped key)
    const reserve = await page.evaluate((userId) => {
      const raw =
        localStorage.getItem(`fire-nepal-cashflow-v1:user:${userId}`) ||
        localStorage.getItem("fire-nepal-cashflow-v1");
      if (!raw) return null;
      return JSON.parse(raw).emergencyCashReserve;
    }, USER_ID);
    assert.equal(reserve, 90000, `expected emergencyCashReserve=90000, got ${reserve}`);
    console.log("Save + target OK", { reserve });
    assert.match(afterSave, /CURRENT EMERGENCY FUND[\s\S]*रु\s*90,?000/i);
    console.log("UI current amount refreshed OK");
    await page.close();
  }

  // --- FIRE Progress reflects saved reserve + expense burn (fresh page, seeded post-save) ---
  {
    const page = await context.newPage();
    await seedFinanceData(page, { withExpenses: true, emergencyCashReserve: 90000 });
    await page.goto(`${BASE}/fire-summary`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1500);
    const fireBody = await page.locator("body").innerText();
    assert.match(fireBody, /Emergency Fund/i);
    assert.match(fireBody, /90,?000/);
    assert.match(fireBody, /270,?000/);
    assert.match(fireBody, /33%|33\.|funded/i);
    await page.screenshot({ path: `${ARTIFACT_DIR}/04-fire-progress.png`, fullPage: true });
    console.log("FIRE Progress OK");
    await page.close();
  }

  await browser.close();
  console.log("\nPreview UI verification PASSED");
  console.log(`Artifacts: ${ARTIFACT_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
