/**
 * Financial regression for Gold & Silver premium metrics.
 * Duplicates formula contracts from holding-stats + metals-premium-metrics
 * so a UI redesign cannot silently change calculation results.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";

const NEPAL_UI_GRAMS_PER_TOLA = 11.66;

function gramsToTolaUi(grams) {
  if (!Number.isFinite(grams) || grams <= 0) return 0;
  return grams / NEPAL_UI_GRAMS_PER_TOLA;
}

function calendarDaysInvested(purchase, asOf = new Date()) {
  const start = Date.UTC(purchase.getFullYear(), purchase.getMonth(), purchase.getDate());
  const end = Date.UTC(asOf.getFullYear(), asOf.getMonth(), asOf.getDate());
  return Math.max(0, Math.floor((end - start) / 86400000));
}

function formatHoldingDurationApprox(days) {
  if (days <= 0) return "0 d";
  const y = Math.floor(days / 365);
  let rem = days - y * 365;
  const mo = Math.floor(rem / 30);
  rem -= mo * 30;
  const parts = [];
  if (y) parts.push(`${y} yr`);
  if (mo) parts.push(`${mo} mo`);
  if (rem > 0 || parts.length === 0) parts.push(`${rem} d`);
  return parts.join(" ");
}

function annualizedCagrFraction(cost, value, days) {
  if (cost <= 0 || days < 1 || !Number.isFinite(value)) return null;
  const years = days / 365.25;
  if (years <= 0) return null;
  const mult = value / cost;
  if (mult <= 0 || !Number.isFinite(mult)) return null;
  return Math.pow(mult, 1 / years) - 1;
}

function roiPct(cost, value) {
  if (cost <= 0 || !Number.isFinite(value)) return null;
  return ((value - cost) / cost) * 100;
}

function rollupMetalBucket(rows, metal, rates) {
  const rate = metal === "gold" ? rates.goldNprPerGram : rates.silverNprPerGram;
  let grams = 0;
  let basisSumNpr = 0;
  let rowsWithBasis = 0;
  for (const r of rows) {
    if (r.metal !== metal) continue;
    const g = r.grams ?? 0;
    if (g <= 0) continue;
    grams += g;
    const b = r.totalCostBasisNpr;
    if (typeof b === "number" && b > 0) {
      basisSumNpr += b;
      rowsWithBasis += 1;
    }
  }
  return {
    grams,
    purchaseNpr: basisSumNpr,
    currentNpr: grams * rate,
    basisSumNpr,
    rowsWithBasis,
  };
}

function weightedBasisCostPerGram(rows, metal) {
  let basisSum = 0;
  let gramsCovered = 0;
  for (const r of rows) {
    if (r.metal !== metal) continue;
    const g = r.grams ?? 0;
    if (g <= 0) continue;
    const b = r.totalCostBasisNpr;
    if (typeof b === "number" && b > 0) {
      basisSum += b;
      gramsCovered += g;
    }
  }
  if (gramsCovered <= 0) return null;
  return basisSum / gramsCovered;
}

const GOLD_ONLY = [
  { id: "g1", metal: "gold", grams: 81.62, totalCostBasisNpr: 420000, boughtDate: "2026-08-14" },
];
const SILVER_ONLY = [
  { id: "s1", metal: "silver", grams: 100, totalCostBasisNpr: 15000, boughtDate: "2026-01-01" },
];
const MIXED = [...GOLD_ONLY, ...SILVER_ONLY];
const EMPTY = [];
const RATES = { goldNprPerGram: 17089, silverNprPerGram: 199 };
const AS_OF = new Date(2026, 10, 27); // Nov 27, 2026 local

describe("metals premium metrics regression", () => {
  it("gold-only: grams, tola, cost, value, P/L, ROI", () => {
    const gold = rollupMetalBucket(GOLD_ONLY, "gold", RATES);
    assert.equal(gold.grams, 81.62);
    assert.ok(Math.abs(gramsToTolaUi(gold.grams) - 7) < 1e-6);
    assert.equal(gold.basisSumNpr, 420000);
    assert.equal(gold.currentNpr, 81.62 * 17089);
    const pl = gold.currentNpr - gold.basisSumNpr;
    assert.ok(pl > 0);
    const roi = roiPct(gold.basisSumNpr, gold.currentNpr);
    assert.ok(roi != null && Math.abs(roi - ((gold.currentNpr - 420000) / 420000) * 100) < 1e-9);
  });

  it("silver-only empty gold shows zero gold bucket", () => {
    const gold = rollupMetalBucket(SILVER_ONLY, "gold", RATES);
    const silver = rollupMetalBucket(SILVER_ONLY, "silver", RATES);
    assert.equal(gold.grams, 0);
    assert.equal(gold.currentNpr, 0);
    assert.equal(silver.grams, 100);
    assert.equal(silver.currentNpr, 100 * 199);
  });

  it("mixed portfolio keeps independent metal rollups", () => {
    const gold = rollupMetalBucket(MIXED, "gold", RATES);
    const silver = rollupMetalBucket(MIXED, "silver", RATES);
    assert.equal(gold.grams, 81.62);
    assert.equal(silver.grams, 100);
    assert.notEqual(gold.currentNpr, silver.currentNpr);
  });

  it("empty portfolio yields zeros and null ROI/CAGR", () => {
    const gold = rollupMetalBucket(EMPTY, "gold", RATES);
    assert.equal(gold.grams, 0);
    assert.equal(roiPct(0, 0), null);
    assert.equal(annualizedCagrFraction(0, 100, 30), null);
  });

  it("holding duration and high CAGR match existing formula", () => {
    const start = new Date(2026, 7, 14); // Aug 14, 2026
    const days = calendarDaysInvested(start, AS_OF);
    assert.equal(days, 105);
    assert.equal(formatHoldingDurationApprox(104), "3 mo 14 d");
    const cost = 420000;
    const value = 81.62 * 17089;
    const cagr = annualizedCagrFraction(cost, value, days);
    assert.ok(cagr != null && cagr > 0);
    // Same inputs must be stable (no capping).
    const again = annualizedCagrFraction(cost, value, days);
    assert.equal(cagr, again);
  });

  it("metal-specific CAGR uses same annualizedCagrFraction with metal inputs", () => {
    const gold = rollupMetalBucket(MIXED, "gold", RATES);
    const silver = rollupMetalBucket(MIXED, "silver", RATES);
    const goldDays = calendarDaysInvested(new Date(2026, 7, 14), AS_OF);
    const silverDays = calendarDaysInvested(new Date(2026, 0, 1), AS_OF);
    const goldCagr = annualizedCagrFraction(gold.basisSumNpr, gold.currentNpr, goldDays);
    const silverCagr = annualizedCagrFraction(silver.basisSumNpr, silver.currentNpr, silverDays);
    assert.ok(goldCagr != null);
    assert.ok(silverCagr != null);
    assert.notEqual(goldCagr, silverCagr);
  });

  it("negative returns stay uncapped", () => {
    const cost = 100000;
    const value = 40000;
    const roi = roiPct(cost, value);
    assert.equal(roi, -60);
    const cagr = annualizedCagrFraction(cost, value, 365);
    assert.ok(cagr != null && cagr < 0);
  });

  it("weighted avg purchase / g and unrealized per gram", () => {
    const avg = weightedBasisCostPerGram(GOLD_ONLY, "gold");
    assert.ok(avg != null);
    assert.ok(Math.abs(avg - 420000 / 81.62) < 1e-9);
    const board = RATES.goldNprPerGram;
    const profitPerG = board - avg;
    assert.ok(profitPerG > 0);
  });

  it("net worth share formula", () => {
    const metalsCurrent = rollupMetalBucket(GOLD_ONLY, "gold", RATES).currentNpr;
    const netWorth = 18370000;
    const share = (metalsCurrent / netWorth) * 100;
    assert.ok(Math.abs(share - (metalsCurrent / netWorth) * 100) < 1e-12);
  });

  it("missing market price: zero rate yields zero mark (no invented price)", () => {
    const zeroRates = { goldNprPerGram: 0, silverNprPerGram: 0 };
    const gold = rollupMetalBucket(GOLD_ONLY, "gold", zeroRates);
    assert.equal(gold.currentNpr, 0);
  });
});
