/**
 * Cost of Living full reset — clears entire nepal_col plan to empty state.
 * Must not restore suggested default expenses and must not touch other modules.
 */
import assert from "node:assert/strict";
import { describe, it, before, after, beforeEach } from "node:test";
import {
  COL_EXPENSE_META,
  COL_PLAN_STORAGE_KEY,
  computeColSnapshot,
  defaultColPlan,
  emptyColPlan,
  resetColPlanData,
  sanitizeColPlan,
} from "../src/lib/nepal-col-dashboard.ts";
import {
  isClearedColPlan,
  loadColPlanDocument,
  persistResetColPlanData,
  saveColPlanDocument,
} from "../src/lib/nepal-col-storage.ts";
import { FIRE_LENDING_STORAGE_KEY, saveLendingStore, loadLendingStore } from "../src/lib/fire-lending/storage.ts";
import { createSeedStore } from "../src/lib/fire-lending/seed.ts";

function customizedColPlan() {
  const base = defaultColPlan();
  return {
    ...base,
    lifestyle: "luxury",
    family: { adults: 4, children: 3, parents: 2 },
    monthlyIncomeNpr: 250_000,
    monthlyKoreaSpendNpr: 400_000,
    expenses: {
      home: 80_000,
      food: 45_000,
      transportation: 22_000,
      utilities: 12_000,
      internet: 4_500,
      healthcare: 18_000,
      education: 30_000,
      entertainment: 15_000,
      clothing: 8_000,
      miscellaneous: 9_000,
    },
  };
}

function installMemoryLocalStorage() {
  /** @type {Map<string, string>} */
  const map = new Map();
  const localStorage = {
    getItem(key) {
      return map.has(key) ? map.get(key) : null;
    },
    setItem(key, value) {
      map.set(String(key), String(value));
    },
    removeItem(key) {
      map.delete(String(key));
    },
    clear() {
      map.clear();
    },
  };
  const previousWindow = globalThis.window;
  globalThis.window = { localStorage };
  return {
    map,
    restore() {
      if (previousWindow === undefined) {
        delete globalThis.window;
      } else {
        globalThis.window = previousWindow;
      }
    },
  };
}

describe("resetColPlanData", () => {
  it("returns the clean empty Cost of Living plan, not the suggested default dataset", () => {
    const customized = customizedColPlan();
    const next = resetColPlanData(customized);
    const empty = emptyColPlan();
    const suggested = defaultColPlan();

    assert.deepEqual(next, empty);
    assert.notDeepEqual(next, customized);
    assert.notDeepEqual(next.expenses, suggested.expenses);
    for (const meta of COL_EXPENSE_META) {
      assert.equal(next.expenses[meta.id], 0);
      assert.notEqual(next.expenses[meta.id], suggested.expenses[meta.id]);
    }
  });

  it("clears income, korea spend, lifestyle, family, and every category amount", () => {
    const next = resetColPlanData(customizedColPlan());
    assert.equal(next.monthlyIncomeNpr, null);
    assert.equal(next.monthlyKoreaSpendNpr, 0);
    assert.equal(next.lifestyle, "standard");
    assert.deepEqual(next.family, { adults: 1, children: 0, parents: 0 });
    assert.ok(isClearedColPlan(next));
  });

  it("clears derived totals, yearly cost, trends, savings, and readiness inputs", () => {
    const customized = customizedColPlan();
    const before = computeColSnapshot(customized);
    assert.ok(before.total > 0);
    assert.ok(before.monthlySavings !== null);

    const after = computeColSnapshot(resetColPlanData(customized));
    const expected = computeColSnapshot(emptyColPlan());

    assert.equal(after.total, 0);
    assert.equal(after.total * 12, 0);
    assert.equal(after.monthlySavings, null);
    assert.equal(after.savingsPct, null);
    assert.equal(after.koreaSpend, 0);
    assert.equal(after.readiness, expected.readiness);
    assert.deepEqual(
      after.items.map((item) => item.amount),
      COL_EXPENSE_META.map(() => 0),
    );
    assert.ok(after.items.every((item) => item.pct === 0));
    assert.deepEqual(
      after.trend.map((point) => point.value),
      expected.trend.map((point) => point.value),
    );
    assert.ok(after.trend.every((point) => point.value === 0));
    assert.deepEqual(after.donutData, []);
  });

  it("sanitize preserves a cleared empty plan without reintroducing suggested expenses", () => {
    const cleared = resetColPlanData(customizedColPlan());
    const roundTrip = sanitizeColPlan(cleared);
    assert.deepEqual(roundTrip, emptyColPlan());
    assert.notDeepEqual(roundTrip.expenses, defaultColPlan().expenses);
  });

  it("is idempotent and only returns ColPlanState shape keys", () => {
    const once = resetColPlanData(customizedColPlan());
    const twice = resetColPlanData(once);
    assert.deepEqual(once, twice);

    const keys = Object.keys(twice).sort();
    assert.deepEqual(keys, [
      "cityId",
      "expenses",
      "family",
      "lifestyle",
      "monthlyIncomeNpr",
      "monthlyKoreaSpendNpr",
      "province",
    ]);
  });

  it("does not require a current plan argument", () => {
    assert.deepEqual(resetColPlanData(), emptyColPlan());
  });
});

describe("persistResetColPlanData module isolation", () => {
  /** @type {{ map: Map<string, string>, restore: () => void } | null} */
  let memory = null;

  before(() => {
    memory = installMemoryLocalStorage();
  });

  after(() => {
    memory?.restore();
    memory = null;
  });

  beforeEach(() => {
    memory?.map.clear();
  });

  it("persists a fully cleared nepal_col plan immediately", () => {
    saveColPlanDocument(customizedColPlan(), null);
    const before = loadColPlanDocument(null).plan;
    assert.equal(before.expenses.home, 80_000);

    const persisted = persistResetColPlanData(null);
    assert.ok(isClearedColPlan(persisted.plan));
    assert.deepEqual(persisted.plan, emptyColPlan());

    const reloaded = loadColPlanDocument(null).plan;
    assert.deepEqual(reloaded, emptyColPlan());
    assert.equal(reloaded.expenses.home, 0);
    assert.equal(reloaded.monthlyIncomeNpr, null);
    assert.equal(reloaded.monthlyKoreaSpendNpr, 0);
  });

  it("clears Cost of Living storage while leaving another module's data unchanged", () => {
    const lendingSeed = createSeedStore();
    assert.ok(lendingSeed.loans.length > 0);
    saveLendingStore(lendingSeed);
    saveColPlanDocument(customizedColPlan(), null);

    const lendingRawBefore = globalThis.window.localStorage.getItem(FIRE_LENDING_STORAGE_KEY);
    assert.ok(lendingRawBefore);
    assert.ok(globalThis.window.localStorage.getItem(COL_PLAN_STORAGE_KEY));

    persistResetColPlanData(null);

    const lendingRawAfter = globalThis.window.localStorage.getItem(FIRE_LENDING_STORAGE_KEY);
    assert.equal(lendingRawAfter, lendingRawBefore);
    assert.deepEqual(loadLendingStore(), lendingSeed);

    const colAfter = loadColPlanDocument(null).plan;
    assert.ok(isClearedColPlan(colAfter));
    assert.deepEqual(colAfter, emptyColPlan());
    assert.notDeepEqual(colAfter.expenses, defaultColPlan().expenses);
  });
});
