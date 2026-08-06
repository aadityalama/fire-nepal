#!/usr/bin/env node
/**
 * Mobile + DOM acceptance checks for HomeTopInfoBar.
 * Usage: node scripts/verify-home-top-info-bar-mobile.mjs [baseUrl]
 */
import { chromium } from "playwright";

const baseUrl = process.argv[2] ?? "http://127.0.0.1:3000";

const FORBIDDEN_SELECTORS = [
  ".smart-nepal-info-bar",
  ".smart-nepal-info-chip",
  "[data-chip-kind]",
  "article[aria-label*='Nepali Date']",
];

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

  await page.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 60_000 });

  const bar = page.locator("main > p").first();
  await bar.waitFor({ state: "visible", timeout: 30_000 });

  const text = ((await bar.textContent()) ?? "").replace(/\s+/g, " ").trim();
  const box = await bar.boundingBox();
  const styles = await bar.evaluate((el) => {
    const cs = getComputedStyle(el);
    return {
      whiteSpace: cs.whiteSpace,
      fontSize: cs.fontSize,
      boxShadow: cs.boxShadow,
      borderWidth: cs.borderWidth,
      borderRadius: cs.borderRadius,
    };
  });

  const hasChip = await page.locator(".smart-nepal-info-chip").count();
  const hasSectionBar = await page.locator(".smart-nepal-info-bar").count();
  const heroBox = await page.locator("#home").boundingBox();
  const barBottom = box ? box.y + box.height : 9999;
  const heroTop = heroBox?.y ?? 0;

  const time1 = text.match(/\d{2}:\d{2}:\d{2}\s+NPT/)?.[0] ?? "";
  await page.waitForTimeout(1100);
  const text2 = ((await bar.textContent()) ?? "").replace(/\s+/g, " ").trim();
  const time2 = text2.match(/\d{2}:\d{2}:\d{2}\s+NPT/)?.[0] ?? "";

  const statusClass = await bar.locator("span").nth(2).evaluate((el) => el.className);

  const checks = [
    ["single <p> bar exists with bullet separators", text.includes("•") && text.includes("NPT")],
    ["no legacy chip/card bar", hasChip === 0 && hasSectionBar === 0],
    ["no box shadow on bar", styles.boxShadow === "none"],
    ["no border on bar", styles.borderWidth === "0px"],
    ["no wrap (nowrap)", styles.whiteSpace === "nowrap"],
    ["font size 12–13px", styles.fontSize === "12px" || styles.fontSize === "13px"],
    ["bar fits within 390px width", box ? box.width <= 390 : false],
    ["hero moved up (bar is compact above #home)", barBottom <= heroTop + 8],
    ["live NPT clock ticks every second", time1 !== "" && time2 !== "" && time1 !== time2],
    [
      "status uses green or red utility class",
      /text-emerald-600/.test(statusClass) || /text-red-600/.test(statusClass),
    ],
  ];

  let failed = 0;
  for (const [label, ok] of checks) {
    if (ok) console.log(`OK   ${label}`);
    else {
      failed += 1;
      console.error(`FAIL ${label}`);
    }
  }

  console.log("\nBar text:", text);
  console.log("Status class:", statusClass);
  console.log("Bar height:", box?.height);

  await browser.close();
  if (failed) process.exit(1);
  console.log(`\nMobile acceptance passed at ${baseUrl}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
