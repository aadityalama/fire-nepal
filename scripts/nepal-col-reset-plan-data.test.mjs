/**
 * Cost of Living plan reset — scoped to nepal_col module only.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  COL_EXPENSE_META,
  computeColSnapshot,
  defaultColPlan,
  resetColPlanData,
} from "../src/lib/nepal-col-dashboard.ts";

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

describe("resetColPlanData", () => {
  it("returns the initial default Cost of Living plan", () => {
    const customized = customizedColPlan();
    const next = resetColPlanData(customized);
    const expected = defaultColPlan();

    assert.deepEqual(next, expected);
    assert.notDeepEqual(next, customized);
  });

  it("clears customized monthly expenses back to suggested defaults", () => {
    const customized = customizedColPlan();
    assert.equal(customized.expenses.home, 80_000);

    const next = resetColPlanData(customized);
    for (const meta of COL_EXPENSE_META) {
      assert.equal(next.expenses[meta.id], defaultColPlan().expenses[meta.id]);
      assert.ok(Number.isFinite(next.expenses[meta.id]));
      assert.ok(next.expenses[meta.id] >= 0);
    }
  });

  it("resets income, korea spend, lifestyle, and family to defaults", () => {
    const next = resetColPlanData(customizedColPlan());
    const expected = defaultColPlan();

    assert.equal(next.monthlyIncomeNpr, null);
    assert.equal(next.monthlyKoreaSpendNpr, expected.monthlyKoreaSpendNpr);
    assert.equal(next.lifestyle, expected.lifestyle);
    assert.deepEqual(next.family, expected.family);
    assert.equal(next.cityId, expected.cityId);
    assert.equal(next.province, expected.province);
  });

  it("refreshes category totals, trends, and readiness from the reset plan", () => {
    const customized = customizedColPlan();
    const before = computeColSnapshot(customized);
    const afterPlan = resetColPlanData(customized);
    const after = computeColSnapshot(afterPlan);
    const expected = computeColSnapshot(defaultColPlan());

    assert.notEqual(before.total, after.total);
    assert.equal(after.total, expected.total);
    assert.equal(after.monthlySavings, null);
    assert.equal(after.savingsPct, null);
    assert.equal(after.readiness, expected.readiness);
    assert.deepEqual(
      after.items.map((item) => ({ id: item.id, amount: item.amount, pct: item.pct })),
      expected.items.map((item) => ({ id: item.id, amount: item.amount, pct: item.pct })),
    );
    assert.deepEqual(after.trend, expected.trend);
    assert.equal(after.trend.length, 8);
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
    assert.deepEqual(resetColPlanData(), defaultColPlan());
  });
});
