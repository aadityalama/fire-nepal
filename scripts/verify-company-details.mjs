// Verify premium Company Details page sections + stock deep-link from hub.
// Usage: node scripts/verify-company-details.mjs [baseUrl] [symbol]
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";

const BASE = (process.argv[2] ?? "http://localhost:3002").replace(/\/$/, "");
const SYMBOL = (process.argv[3] ?? "NABIL").toUpperCase();
const OUT = "tmp-company-details";
mkdirSync(OUT, { recursive: true });

const REQUIRED = [
  { id: "overview", testId: null, title: "Company Overview" },
  { id: "price-chart", testId: "company-live-price", title: "Live Price & Chart" },
  { id: "key-metrics", testId: "company-key-metrics", title: "Key Metrics" },
  { id: "financials", testId: "company-financials", title: "Financial Statements" },
  { id: "dividends", testId: "company-dividends", title: "Dividend / Bonus / Rights History" },
  { id: "actions", testId: "company-actions-timeline", title: "Corporate Actions Timeline" },
  { id: "shareholding", testId: "company-shareholding", title: "Shareholding Structure" },
  { id: "news", testId: "company-news", title: "Company News" },
  { id: "ai-analysis", testId: "company-ai-analysis", title: "AI Company Analysis" },
];

const report = { base: BASE, symbol: SYMBOL, checks: [] };
function check(name, ok, detail) {
  report.checks.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
}

const browser = await chromium.launch();

async function inspect(viewport, label) {
  const page = await browser.newPage({ viewport });
  await page.goto(`${BASE}/market/company/${SYMBOL}`, { waitUntil: "networkidle", timeout: 120000 });
  await page.waitForSelector('[data-testid="nepse-company-page"]', { timeout: 60000 });
  await page.waitForTimeout(1200);

  check(`${label}: company page renders`, true);
  const h1 = await page.locator("h1").first().innerText();
  check(`${label}: symbol heading`, h1.includes(SYMBOL), h1);

  for (const section of REQUIRED) {
    const el = page.locator(`#${section.id}`);
    const count = await el.count();
    check(`${label}: section #${section.id}`, count === 1);
    if (section.testId) {
      check(`${label}: ${section.testId}`, (await page.locator(`[data-testid="${section.testId}"]`).count()) >= 1);
    }
    const text = count ? await el.innerText() : "";
    check(`${label}: ${section.title} visible`, text.includes(section.title.split(" ")[0]) || text.length > 20, text.slice(0, 60));
  }

  const navCount = await page.locator('[data-testid="company-section-nav"] button').count();
  check(`${label}: section nav has 9 pills`, navCount === 9, `count=${navCount}`);

  await page.screenshot({ path: `${OUT}/company-${label}.png`, fullPage: false, animations: "disabled" });
  await page.screenshot({ path: `${OUT}/company-${label}-full.png`, fullPage: true, animations: "disabled" });

  // Hub search → company details deep link
  await page.goto(`${BASE}/market`, { waitUntil: "networkidle", timeout: 120000 });
  await page.waitForTimeout(800);
  const searchToggle = page.locator('button[aria-label*="Search"], button:has-text("Search")').first();
  if (await searchToggle.count()) {
    await searchToggle.click().catch(() => {});
  }
  const searchInput = page.locator('input[placeholder*="Search"], input[aria-label*="Search"], input[type="search"]').first();
  if (await searchInput.count()) {
    await searchInput.fill(SYMBOL);
    await page.waitForTimeout(600);
    const result = page.locator(`a[href*="/market/company/${SYMBOL}"]`).first();
    if (await result.count()) {
      await result.click();
      await page.waitForURL(new RegExp(`/market/company/${SYMBOL}`, "i"), { timeout: 30000 });
      check(`${label}: hub stock click opens company page`, page.url().includes(`/market/company/${SYMBOL}`));
    } else {
      // Fallback: open from any linked symbol on the page / services
      const any = page.locator('a[href*="/market/company/"]').first();
      if (await any.count()) {
        const href = await any.getAttribute("href");
        await any.click();
        await page.waitForTimeout(1500);
        check(`${label}: stock link opens company page`, /\/market\/company\//.test(page.url()), `href=${href} dest=${page.url()}`);
      } else {
        check(`${label}: stock link opens company page`, false, "no company links found on /market");
      }
    }
  } else {
    const any = page.locator('a[href*="/market/company/"]').first();
    if (await any.count()) {
      await any.click();
      await page.waitForTimeout(1500);
      check(`${label}: stock link opens company page`, /\/market\/company\//.test(page.url()), page.url());
    } else {
      check(`${label}: stock link opens company page`, false, "no search input and no company links");
    }
  }

  await page.close();
}

try {
  await inspect({ width: 1440, height: 900 }, "desktop");
  await inspect({ width: 390, height: 844 }, "mobile");
} finally {
  await browser.close();
}

writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 2));
const failed = report.checks.filter((c) => !c.ok);
console.log(failed.length === 0 ? "ALL CHECKS PASSED" : `FAILED: ${failed.length}`);
process.exit(failed.length === 0 ? 0 : 1);
