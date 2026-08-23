/**
 * Nepal Economy data engine — freshness rules + NRB macro PDF parsing.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  FRESHNESS_MAX_AGE_MS,
  LIVE_CAPABLE,
  isStale,
  shouldRefresh,
} from "../src/lib/economy/freshness.ts";
import { parseNrbMacroPdfText } from "../src/lib/economy/sources/nrb-macro.ts";
import { economyMetricToCard } from "../src/lib/economy/map-to-cards.ts";

test("GDP and inflation are never live-capable", () => {
  assert.equal(LIVE_CAPABLE.gdp, false);
  assert.equal(LIVE_CAPABLE.inflation, false);
  assert.equal(LIVE_CAPABLE.usd_npr, true);
});

test("stale detection uses metric-specific windows", () => {
  const now = Date.parse("2026-08-23T12:00:00.000Z");
  assert.equal(isStale("2026-08-23T00:00:00.000Z", "usd_npr", now), false);
  assert.equal(
    isStale(new Date(now - FRESHNESS_MAX_AGE_MS.usd_npr - 1).toISOString(), "usd_npr", now),
    true,
  );
  assert.equal(isStale(null, "gdp", now), true);
});

test("refresh interval gates unnecessary fetches", () => {
  const now = Date.parse("2026-08-23T12:00:00.000Z");
  assert.equal(shouldRefresh(null, "inflation", false, now), true);
  assert.equal(shouldRefresh(new Date(now - 60_000).toISOString(), "inflation", false, now), false);
  assert.equal(shouldRefresh(new Date(now - 60_000).toISOString(), "inflation", true, now), true);
});

test("NRB CMFS PDF parser extracts inflation, remittance, and deposit rate", () => {
  const sample = `
Current Macroeconomic and Financial Situation
of Nepal based on the eleven months data of 2025/26
y-o-y consumer price inflation stood at 5.22 percent in mid-June 2026.
Remittance inflows stood at Rs. 203.89 billion.
Remittance inflows increased 12.4 percent to Rs. 203.
The weighted average deposit rates of commercial banks stood at 3.29 percent.
The weighted average lending rates of commercial banks stood at 8.11 percent.
`;
  const snap = parseNrbMacroPdfText(sample, "https://www.nrb.org.np/example.pdf", "2026-06-15");
  assert.equal(snap.inflationYoY, 5.22);
  assert.equal(snap.remittanceMonthlyBillion, 203.89);
  assert.equal(snap.depositRateCommercial, 3.29);
  assert.equal(snap.lendingRateCommercial, 8.11);
  assert.equal(snap.monthsCovered, 11);
  assert.match(snap.periodLabel ?? "", /mid-June 2026/i);
});

test("stale metrics map to cached badge, never live", () => {
  const card = economyMetricToCard({
    key: "usd_npr",
    name: "USD/NPR Exchange Rate",
    value: 152.5,
    displayValue: "रु 152.50",
    unit: "NPR per USD",
    currency: "NPR",
    source: "Nepal Rastra Bank",
    sourceUrl: "https://www.nrb.org.np/api/forex/v1/rates",
    period: "2026-08-22",
    publishedAt: "2026-08-22",
    updatedAt: "2026-01-01T00:00:00.000Z",
    lastAttemptAt: null,
    frequency: "daily",
    status: "stale",
    valueKind: "actual",
    change: null,
    changePercent: null,
    changeLabel: null,
    tone: "neutral",
    stale: true,
    staleReason: "outdated",
    errorMessage: null,
    nextRefreshAt: null,
    raw: null,
  });
  assert.equal(card.dataMode, "cached");
  assert.notEqual(card.dataMode, "live");
});

test("production adapters omit banned hard-coded display figures", async () => {
  const root = path.join(process.cwd(), "src/lib");
  const files = [
    "economy/sources/forex.ts",
    "economy/sources/gdp.ts",
    "economy/sources/metals.ts",
    "economy/sources/nepse.ts",
    "economy/sources/nrb-macro.ts",
    "economy/sources/nrb-policy.ts",
    "nepal-economy/build-dashboard.ts",
    "nepal-economy/news-feed.ts",
  ];
  const banned = ["1.68%", "154.92", "311,100", "311100", "5,345", "5345", "177.413", "177.41"];
  for (const rel of files) {
    const text = await readFile(path.join(root, rel), "utf8");
    for (const token of banned) {
      assert.equal(text.includes(token), false, `${rel} contains banned token ${token}`);
    }
  }
});
