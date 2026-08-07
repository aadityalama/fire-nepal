#!/usr/bin/env node
/**
 * Cross-browser verification that notification cards are clickable and navigate.
 * Usage: node scripts/verify-notification-clicks.mjs [baseUrl]
 */
import { chromium, firefox, webkit, devices } from "playwright";

const baseUrl = (process.argv[2] || "http://localhost:3000").replace(/\/$/, "");

const seedStore = {
  version: 1,
  reminders: [
    {
      id: "rem_click_test_1",
      title: "Room rent click-test",
      reminderType: "room_rent",
      amountNpr: 25000,
      dueDate: new Date().toISOString().slice(0, 10),
      dueTime: "09:00",
      timezone: "Asia/Kathmandu",
      email: "test@example.com",
      repeatFrequency: "monthly",
      notify7DaysBefore: false,
      notify3DaysBefore: false,
      notify1DayBefore: false,
      notifyAtDueTime: true,
      notifyOverdue: true,
      sharedWithFamily: false,
      notes: "",
      createdAt: new Date().toISOString(),
    },
  ],
  history: [],
  notifications: [
    {
      id: "n_click_payment",
      reminderId: "rem_click_test_1",
      kind: "payment_due",
      title: "Payment due today",
      body: "Room rent click-test · due today",
      createdAt: new Date().toISOString(),
      read: false,
    },
    {
      id: "n_click_family",
      reminderId: null,
      kind: "family_shared",
      title: "Family workspace",
      body: "Shared a reminder with family",
      createdAt: new Date().toISOString(),
      read: false,
    },
  ],
  settings: {
    emailNotificationsEnabled: true,
    upcomingWithinDays: 7,
  },
};

async function prepare(page) {
  await page.addInitScript((store) => {
    window.localStorage.setItem("fire_nepal_smart_reminders_v1", JSON.stringify(store));
  }, seedStore);
  await page.goto(`${baseUrl}/smart-reminders`, { waitUntil: "domcontentloaded", timeout: 90_000 });
  await page.waitForTimeout(1500);
}

async function openBell(page) {
  const bell = page.getByRole("button", { name: /Open reminders and notifications/i }).first();
  await bell.waitFor({ state: "visible", timeout: 30_000 });
  await bell.click();
  const dialog = page.getByRole("dialog", { name: /Smart reminders notifications/i });
  await dialog.waitFor({ state: "visible", timeout: 10_000 });
  return dialog;
}

async function verifyBellPayment(browserType, label, contextOptions = {}) {
  const browser = await browserType.launch();
  const context = await browser.newContext(contextOptions);
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (err) => errors.push(String(err)));
  try {
    await prepare(page);
    const dialog = await openBell(page);
    const card = dialog.getByRole("button", { name: /Payment due today/i }).first();
    await card.waitFor({ state: "visible" });
    const box = await card.boundingBox();
    if (!box || box.width < 40 || box.height < 40) {
      throw new Error(`${label}: card hit area too small ${JSON.stringify(box)}`);
    }
    const cursor = await card.evaluate((el) => getComputedStyle(el).cursor);
    if (cursor !== "pointer") throw new Error(`${label}: expected cursor:pointer, got ${cursor}`);

    // Element-from-point hit test (catches overlay / stacking bugs)
    const hit = await card.evaluate((el) => {
      const r = el.getBoundingClientRect();
      const x = r.left + r.width / 2;
      const y = r.top + r.height / 2;
      const top = document.elementFromPoint(x, y);
      return {
        x,
        y,
        topTag: top?.tagName ?? null,
        contains: top ? el.contains(top) || el === top : false,
      };
    });
    if (!hit.contains) {
      throw new Error(`${label}: elementFromPoint missed card ${JSON.stringify(hit)}`);
    }

    await card.click();
    await page.waitForURL(/\/smart-reminders\?reminder=rem_click_test_1/, { timeout: 15_000 });
    if (errors.length) throw new Error(`${label}: page errors ${errors.join(" | ")}`);
    return { label, ok: true, url: page.url(), hit };
  } finally {
    await browser.close();
  }
}

async function verifyBellFamily(browserType, label, contextOptions = {}) {
  const browser = await browserType.launch();
  const context = await browser.newContext(contextOptions);
  const page = await context.newPage();
  try {
    await prepare(page);
    const dialog = await openBell(page);
    await dialog.getByRole("button", { name: /Family workspace/i }).first().click();
    await page.waitForURL(/\/family|\/login/, { timeout: 15_000 });
    const url = page.url();
    // /family may redirect to login when protected — both prove navigation fired
    if (!/family|login/.test(url)) throw new Error(`${label}: unexpected url ${url}`);
    return { label, ok: true, url };
  } finally {
    await browser.close();
  }
}

async function verifyListClick(browserType, label, contextOptions = {}) {
  const browser = await browserType.launch();
  const context = await browser.newContext(contextOptions);
  const page = await context.newPage();
  try {
    await prepare(page);
    const card = page.getByRole("button", { name: /Payment due today\. Open related destination/i }).first();
    await card.waitFor({ state: "visible", timeout: 30_000 });
    const cursor = await card.evaluate((el) => getComputedStyle(el).cursor);
    if (cursor !== "pointer") throw new Error(`${label}: list card cursor=${cursor}`);
    await card.click();
    // Same-page deep link scrolls to reminder; URL may already include query after bell tests
    await page.waitForTimeout(800);
    const focused = page.locator("#reminder-rem_click_test_1");
    await focused.waitFor({ state: "visible", timeout: 10_000 });
    return { label, ok: true, url: page.url() };
  } finally {
    await browser.close();
  }
}

async function verifyKeyboard(browserType, label) {
  const browser = await browserType.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  try {
    await prepare(page);
    const dialog = await openBell(page);
    const card = dialog.getByRole("button", { name: /Payment due today/i }).first();
    await card.focus();
    await page.keyboard.press("Enter");
    await page.waitForURL(/\/smart-reminders\?reminder=rem_click_test_1/, { timeout: 15_000 });
    return { label, ok: true, url: page.url() };
  } finally {
    await browser.close();
  }
}

const results = [];
const failures = [];

async function run(name, fn) {
  try {
    const r = await fn();
    results.push({ name, ...r });
    console.log("PASS", name, r.url || "");
  } catch (e) {
    failures.push({ name, error: String(e?.message || e) });
    console.error("FAIL", name, e?.message || e);
  }
}

await run("chromium-bell-payment", () => verifyBellPayment(chromium, "chromium-bell"));
await run("firefox-bell-payment", () => verifyBellPayment(firefox, "firefox-bell"));
await run("webkit-bell-payment", () => verifyBellPayment(webkit, "webkit-bell"));
await run("webkit-iphone-bell-payment", () =>
  verifyBellPayment(webkit, "webkit-iphone-bell", { ...devices["iPhone 13"] }),
);
await run("chromium-bell-family", () => verifyBellFamily(chromium, "chromium-family"));
await run("webkit-iphone-bell-family", () =>
  verifyBellFamily(webkit, "webkit-iphone-family", { ...devices["iPhone 13"] }),
);
await run("chromium-list-click", () => verifyListClick(chromium, "chromium-list"));
await run("webkit-iphone-list-click", () =>
  verifyListClick(webkit, "webkit-iphone-list", { ...devices["iPhone 13"] }),
);
await run("chromium-keyboard", () => verifyKeyboard(chromium, "chromium-keyboard"));
await run("firefox-keyboard", () => verifyKeyboard(firefox, "firefox-keyboard"));

console.log(JSON.stringify({ baseUrl, passed: results.length, failed: failures.length, failures, results }, null, 2));
if (failures.length) process.exit(1);
