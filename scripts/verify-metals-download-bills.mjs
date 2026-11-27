/**
 * Smoke-test Download Bills: seed guest portfolio, open /portfolio/gold,
 * expand section, filter, preview image, download file. Desktop + mobile.
 *
 * Usage: node scripts/verify-metals-download-bills.mjs [baseUrl]
 * Default baseUrl: http://127.0.0.1:3000
 */
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { chromium, devices } from "playwright";

const baseUrl = process.argv[2] || "http://127.0.0.1:3000";
const outDir = "/opt/cursor/artifacts";
mkdirSync(outDir, { recursive: true });

const TINY_JPEG =
  "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAn/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA8A/9k=";

const TINY_PDF =
  "data:application/pdf;base64,JVBERi0xLjQKJeLjz9MKMSAwIG9iago8PAovVHlwZSAvQ2F0YWxvZwovUGFnZXMgMiAwIFIKPj4KZW5kb2JqCjIgMCBvYmoKPDwKL1R5cGUgL1BhZ2VzCi9LaWRzIFszIDAgUl0KL0NvdW50IDEKPD4KZW5kb2JqCjMgMCBvYmoKPDwKL1R5cGUgL1BhZ2UKL1BhcmVudCAyIDAgUgovTWVkaWFCb3ggWzAgMCA2MTIgNzkyXQovQ29udGVudHMgNCAwIFIKPj4KZW5kb2JqCjQgMCBvYmoKPDwKL0xlbmd0aCA0NAo+PgpzdHJlYW0KQlQKL0YxIDI0IFRmCjEwMCA3MDAgVGQoSEVMTE8pClQKRQplbmRzdHJlYW0KZW5kb2JqCnhyZWYKMCA1CjAwMDAwMDAwMDAgNjU1MzUgZiAKMDAwMDAwMDAxNSAwMDAwMCBuIAowMDAwMDAwMDY0IDAwMDAwIG4gCjAwMDAwMDAxMjEgMDAwMDAgbiAKMDAwMDAwMDIwOCAwMDAwMCBuIAp0cmFpbGVyCjw8Ci9TaXplIDUKL1Jvb3QgMSAwIFIKPj4Kc3RhcnR4cmVmCjMwMQolJUVPRgo=";

function seedState() {
  return {
    version: 2,
    liquidCash: [],
    fixedDeposits: [],
    investments: [],
    metals: [
      {
        id: "g1",
        metal: "gold",
        name: "Hallmark Chain",
        grams: 10,
        totalCostBasisNpr: 150000,
        boughtDate: "2024-06-01",
      },
      {
        id: "s1",
        metal: "silver",
        name: "Silver Coin",
        grams: 50,
        totalCostBasisNpr: 10000,
        boughtDate: "2025-01-10",
      },
    ],
    realEstate: [],
    vehicles: [],
    liabilities: [],
    globalRetirementAssets: [],
    netWorthHistory: [],
    ledger: [
      {
        id: "tx-gold-bill",
        txType: "buy",
        bucket: "metal",
        rowId: "g1",
        assetLabel: "Hallmark Chain",
        metal: "gold",
        quantity: 10,
        unitPrice: 15000,
        currency: "NPR",
        tradeDate: "2024-06-01",
        fees: 0,
        meta: { metalTxBillUrls: [TINY_JPEG, TINY_PDF] },
      },
      {
        id: "tx-silver-bill",
        txType: "sell",
        bucket: "metal",
        rowId: "s1",
        assetLabel: "Silver Coin",
        metal: "silver",
        quantity: 5,
        unitPrice: 200,
        currency: "NPR",
        tradeDate: "2025-01-10",
        fees: 0,
        meta: { metalTxBillUrls: [TINY_JPEG] },
      },
    ],
    metalPurchaseBillUrls: [],
  };
}

async function seedAndOpen(page) {
  await page.goto(`${baseUrl}/portfolio/gold`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.evaluate((state) => {
    localStorage.setItem("fire-nepal-portfolio-v2", JSON.stringify(state));
  }, seedState());
  await page.reload({ waitUntil: "networkidle", timeout: 90000 });
  const toggle = page.getByTestId("metals-download-bills-toggle");
  await toggle.waitFor({ state: "visible", timeout: 30000 });
  await toggle.scrollIntoViewIfNeeded();
  if ((await toggle.getAttribute("aria-expanded")) !== "true") {
    await toggle.click();
  }
  await page.getByTestId("metals-bills-filter-all").waitFor({ state: "visible", timeout: 10000 });
}

async function runViewport(browser, label, contextOptions) {
  const context = await browser.newContext({
    ...contextOptions,
    acceptDownloads: true,
  });
  // Legacy guest auth when Supabase env is unset (middleware fn_session length >= 12).
  await context.addCookies([
    {
      name: "fn_session",
      value: "guest-download-bills-test-session",
      url: baseUrl,
      httpOnly: false,
      sameSite: "Lax",
    },
  ]);
  const page = await context.newPage();
  await seedAndOpen(page);

  const rows = page.getByTestId("metals-bill-row");
  await assert.equal(await rows.count(), 3, `${label}: expected 3 bills`);

  await page.getByTestId("metals-bills-filter-gold").click();
  await page.waitForTimeout(200);
  assert.equal(await rows.count(), 2, `${label}: gold filter`);

  await page.getByTestId("metals-bills-filter-silver").click();
  await page.waitForTimeout(200);
  assert.equal(await rows.count(), 1, `${label}: silver filter`);

  await page.getByTestId("metals-bills-filter-all").click();
  await page.getByLabel("Search bills by item name").fill("Hallmark");
  await page.waitForTimeout(200);
  assert.equal(await rows.count(), 2, `${label}: search Hallmark`);
  await page.getByLabel("Search bills by item name").fill("");
  await page.waitForTimeout(200);

  // Preview first image bill
  await rows.first().getByTestId("metals-bill-view").click();
  const img = page.getByTestId("metals-bill-preview-image");
  const pdf = page.getByTestId("metals-bill-preview-pdf");
  await Promise.race([
    img.waitFor({ state: "visible", timeout: 8000 }).catch(() => null),
    pdf.waitFor({ state: "visible", timeout: 8000 }).catch(() => null),
  ]);
  const previewVisible = (await img.count()) > 0 || (await pdf.count()) > 0;
  assert.ok(previewVisible, `${label}: preview should show image or PDF`);
  await page.screenshot({
    path: join(outDir, `metals-download-bills-preview-${label}.png`),
    fullPage: false,
  });
  await page.getByLabel("Close bill preview").click();

  // Download
  const [download] = await Promise.all([
    page.waitForEvent("download", { timeout: 15000 }),
    rows.first().getByTestId("metals-bill-download").click(),
  ]);
  const suggested = download.suggestedFilename();
  assert.ok(suggested && suggested.length > 0, `${label}: download filename`);
  const fail = await download.failure();
  assert.equal(fail, null, `${label}: download should succeed`);

  await page.screenshot({
    path: join(outDir, `metals-download-bills-list-${label}.png`),
    fullPage: false,
  });

  await context.close();
  return { label, suggested, rows: 3 };
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  try {
    const desktop = await runViewport(browser, "desktop", {
      viewport: { width: 1280, height: 900 },
    });
    const mobile = await runViewport(browser, "mobile", {
      ...devices["iPhone 12"],
    });
    console.log(JSON.stringify({ ok: true, desktop, mobile }, null, 2));
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
