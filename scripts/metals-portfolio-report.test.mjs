/**
 * Gold & Silver portfolio report snapshot — reuses dashboard formulas.
 * Verifies mapping consistency and that edited purchase dates affect CAGR inputs.
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
  for (const r of rows) {
    if (r.metal !== metal) continue;
    const g = r.grams ?? 0;
    if (g <= 0) continue;
    grams += g;
    const b = r.totalCostBasisNpr;
    if (typeof b === "number" && b > 0) basisSumNpr += b;
  }
  return { grams, basisSumNpr, currentNpr: grams * rate };
}

describe("metals portfolio report formula contracts", () => {
  const rates = { goldNprPerGram: 20823.3276, silverNprPerGram: 263.7221 }; // ~242800/tola, ~3075/tola
  const asOf = new Date(2026, 10, 27); // Nov 27, 2026 local

  it("values 7 tola gold at Hallmark board for report current value", () => {
    const grams = 7 * NEPAL_UI_GRAMS_PER_TOLA;
    const rows = [
      {
        id: "g1",
        metal: "gold",
        name: "Hallmark Gold",
        grams,
        boughtDate: "2018-01-15",
        totalCostBasisNpr: 7 * 100000,
      },
    ];
    const gold = rollupMetalBucket(rows, "gold", rates);
    assert.equal(Math.round(gold.currentNpr), Math.round(7 * 242800));
    assert.ok(Math.abs(gramsToTolaUi(gold.grams) - 7) < 1e-9);
  });

  it("edited purchase date changes holding days and CAGR", () => {
    const cost = 700000;
    const value = 1699600;
    const recent = calendarDaysInvested(new Date(2026, 0, 15), asOf);
    const older = calendarDaysInvested(new Date(2018, 0, 15), asOf);
    assert.ok(older > recent);
    const cagrRecent = annualizedCagrFraction(cost, value, recent);
    const cagrOlder = annualizedCagrFraction(cost, value, older);
    assert.ok(cagrRecent != null && cagrOlder != null);
    assert.ok(cagrRecent > cagrOlder);
  });

  it("ROI matches dashboard contract", () => {
    const cost = 100000;
    const value = 125000;
    assert.equal(roiPct(cost, value), 25);
    assert.equal(roiPct(0, value), null);
  });

  it("gold-only filter excludes silver from rollup inputs", () => {
    const rows = [
      { id: "g1", metal: "gold", name: "G", grams: 11.66, totalCostBasisNpr: 200000 },
      { id: "s1", metal: "silver", name: "S", grams: 100, totalCostBasisNpr: 20000 },
    ];
    const filtered = rows.filter((r) => r.metal === "gold");
    const gold = rollupMetalBucket(filtered, "gold", rates);
    const silver = rollupMetalBucket(filtered, "silver", rates);
    assert.ok(gold.grams > 0);
    assert.equal(silver.grams, 0);
  });

  it("empty portfolio yields zero current value", () => {
    const all = rollupMetalBucket([], "gold", rates);
    assert.equal(all.grams, 0);
    assert.equal(all.currentNpr, 0);
    assert.equal(roiPct(0, 0), null);
  });
});
