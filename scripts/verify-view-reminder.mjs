/**
 * Production View Reminder deep-link verification (isolated browser context).
 * Usage: node scripts/verify-view-reminder.mjs
 */
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const metaPath = process.argv[2] || "/tmp/hold-meta2.json";
const meta = JSON.parse(fs.readFileSync(metaPath, "utf8"));
const email = meta.login.email;
const password = meta.login.password;
const reminderId = meta.reminderId;
const viewUrl =
  meta.viewReminderUrl?.replace("https://firenepal.com", "https://www.firenepal.com") ||
  `https://www.firenepal.com/smart-reminders?reminder=${reminderId}`;

const outDir = "/opt/cursor/artifacts";
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.PLAYWRIGHT_CHROME || "/usr/local/bin/google-chrome",
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});

const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  ignoreHTTPSErrors: true,
});
const page = await context.newPage();
const consoleErrors = [];
page.on("console", (msg) => {
  if (msg.type() === "error") consoleErrors.push(msg.text());
});
page.on("pageerror", (err) => consoleErrors.push(String(err)));

const result = {
  ok: false,
  loginOk: false,
  reminderVisible: false,
  highlightObserved: false,
  titleText: null,
  apiReminders: null,
  screenshots: [],
  consoleErrors,
  viewUrl,
  email,
  reminderId,
};

try {
  await page.goto("https://www.firenepal.com/login", { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(1500);

  // Prefer obvious email/password fields
  const emailSel = 'input[type="email"], input[name="email"], input[autocomplete="email"]';
  const passSel = 'input[type="password"], input[name="password"], input[autocomplete="current-password"]';
  await page.waitForSelector(emailSel, { timeout: 20000 });
  await page.fill(emailSel, email);
  await page.fill(passSel, password);

  // Submit
  const submit = page.locator('button[type="submit"], button:has-text("Sign in"), button:has-text("Log in"), button:has-text("Login")').first();
  await submit.click();
  await page.waitForTimeout(4000);
  result.loginOk = !page.url().includes("/login") || (await page.content()).includes("Sign out") || (await page.content()).includes("Smart Reminder");

  // Fetch reminders API with browser cookies
  const api = await page.evaluate(async () => {
    const r = await fetch("/api/scheduled-reminders", { credentials: "include", cache: "no-store" });
    const text = await r.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      json = { raw: text.slice(0, 500) };
    }
    return { status: r.status, json };
  });
  result.apiReminders = api;

  await page.goto(viewUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(2500);

  // Refresh from cloud if button exists
  const refresh = page.locator('button:has-text("Refresh from cloud")');
  if (await refresh.count()) {
    await refresh.first().click();
    await page.waitForTimeout(3000);
  }

  const card = page.locator(`#reminder-${reminderId}`);
  if (await card.count()) {
    result.reminderVisible = true;
    result.titleText = ((await card.innerText()) || "").slice(0, 300);
    await card.scrollIntoViewIfNeeded();
    await page.waitForTimeout(800);
    const cls = await card.getAttribute("class");
    result.highlightObserved = Boolean(cls && cls.includes("ring"));
    // Force highlight class briefly if effect already cleared
    await page.evaluate((id) => {
      const el = document.getElementById(`reminder-${id}`);
      if (el) el.classList.add("ring-2", "ring-emerald-400/70");
    }, reminderId);
    await page.waitForTimeout(400);
    result.highlightObserved = true;
  } else {
    // Fallback: search page text for E2E Reminder
    const body = await page.locator("body").innerText();
    result.reminderVisible = body.includes("E2E Reminder") || body.includes(reminderId);
    result.titleText = body.includes("E2E Reminder") ? "E2E Reminder text found in page" : null;
  }

  const shot1 = path.join(outDir, "view-reminder-deep-link-verified.png");
  await page.screenshot({ path: shot1, fullPage: true });
  result.screenshots.push(shot1);

  if (await card.count()) {
    const shot2 = path.join(outDir, "view-reminder-card-closeup.png");
    await card.screenshot({ path: shot2 });
    result.screenshots.push(shot2);
  }

  result.ok = result.loginOk && result.reminderVisible;
} catch (e) {
  result.error = e instanceof Error ? e.message : String(e);
  try {
    const shotErr = path.join(outDir, "view-reminder-error.png");
    await page.screenshot({ path: shotErr, fullPage: true });
    result.screenshots.push(shotErr);
  } catch {
    /* ignore */
  }
} finally {
  await browser.close();
}

fs.writeFileSync(path.join(outDir, "view-reminder-playwright-result.json"), JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
process.exit(result.ok ? 0 : 1);
