import { chromium } from "playwright";
import path from "node:path";
import fs from "node:fs";

const OUT = "/opt/cursor/artifacts/screenshots";
fs.mkdirSync(OUT, { recursive: true });

async function shot(page, name) {
  const file = path.join(OUT, name);
  await page.screenshot({ path: file, fullPage: true });
  console.log("wrote", file);
}

async function expandSection(page, title) {
  const btn = page.getByRole("button", { name: new RegExp(title, "i") }).first();
  if (await btn.count()) {
    const expanded = await btn.locator("xpath=ancestor::section[1]//div[contains(@class,'border-t')]").count();
    if (!expanded) await btn.click();
    await page.waitForTimeout(250);
  }
}

const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const page = await browser.newPage({ viewport: { width: 430, height: 920 } });

await page.goto("http://localhost:3000/insurance/demo", { waitUntil: "networkidle", timeout: 120000 });
await page.waitForTimeout(1000);
await shot(page, "01-demo-landing-and-status.png");

// Details should already be open
await page.waitForSelector("text=Policy Dashboard", { timeout: 30000 });
await shot(page, "02-policy-dashboard-status.png");

await expandSection(page, "Overview");
await shot(page, "03-overview-section.png");

await expandSection(page, "Premium Tracker");
await page.evaluate(() => {
  const el = [...document.querySelectorAll("p")].find((n) => n.textContent?.includes("Premium Tracker"));
  el?.scrollIntoView({ block: "start" });
});
await page.waitForTimeout(200);
await shot(page, "04-premium-tracker-section.png");

await expandSection(page, "Payment History");
await page.evaluate(() => {
  const el = [...document.querySelectorAll("p")].find((n) => n.textContent?.includes("Payment History"));
  el?.scrollIntoView({ block: "start" });
});
await page.waitForTimeout(200);
await shot(page, "05-payment-history-section.png");

// Mark one installment paid if button exists
const markBtn = page.getByRole("button", { name: /Mark as Paid/i }).first();
if (await markBtn.count()) {
  await markBtn.click();
  await page.waitForTimeout(800);
  await shot(page, "06-after-mark-paid.png");
}

await expandSection(page, "Documents");
await page.evaluate(() => {
  const el = [...document.querySelectorAll("p")].find((n) => n.textContent?.includes("Documents & Notes"));
  el?.scrollIntoView({ block: "start" });
});
await page.waitForTimeout(200);
await shot(page, "07-documents-notes-section.png");

await expandSection(page, "Coverage");
await expandSection(page, "Reminder Settings");
await page.evaluate(() => {
  const el = [...document.querySelectorAll("p")].find((n) => n.textContent?.includes("Reminder Settings"));
  el?.scrollIntoView({ block: "start" });
});
await page.waitForTimeout(200);
await shot(page, "08-coverage-and-reminders.png");

// Open edit form
await page.getByRole("button", { name: /Close/i }).first().click().catch(() => {});
await page.waitForTimeout(300);
await page.getByRole("button", { name: /Open Edit Form/i }).click();
await page.waitForSelector("text=Edit policy", { timeout: 15000 });
await shot(page, "09-edit-form-core-fields.png");

await page.evaluate(() => {
  const el = [...document.querySelectorAll("p")].find((n) => n.textContent?.includes("Documents & Notes"));
  el?.scrollIntoView({ block: "start" });
});
await page.waitForTimeout(200);
await shot(page, "10-edit-form-documents-notes.png");

await browser.close();
console.log("ALL_SCREENSHOTS_DONE");
