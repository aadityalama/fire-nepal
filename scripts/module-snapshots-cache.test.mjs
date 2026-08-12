/**
 * Unit coverage for financial-intel rollup no-op equality.
 * Protects /api/module-snapshots/financial_intel_rollups from coach-tick write storms.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { defaultCashflowState } from "../src/components/cashflow/cashflow-storage.ts";
import { upsertCurrentMonthRollupRows } from "../src/components/financial-intelligence/monthly-rollup-storage.ts";

/** Only fields read by upsertCurrentMonthRollupRows need to be real. */
function coach(partial = {}) {
  return {
    savingsRatePct: 37.5,
    fireYearsToFi: 12,
    netWorthNpr: 1_000_000,
    ...partial,
  };
}

describe("financial intel rollup upsert", () => {
  it("returns the same array reference when month content is unchanged", () => {
    const cashflow = defaultCashflowState();
    const first = upsertCurrentMonthRollupRows([], { cashflow, coach: coach() });
    assert.equal(first.length, 1);
    const second = upsertCurrentMonthRollupRows(first, { cashflow, coach: coach() });
    assert.equal(second, first);
  });

  it("returns a new series when net worth changes", () => {
    const cashflow = defaultCashflowState();
    const first = upsertCurrentMonthRollupRows([], { cashflow, coach: coach({ netWorthNpr: 1_000_000 }) });
    const second = upsertCurrentMonthRollupRows(first, {
      cashflow,
      coach: coach({ netWorthNpr: 1_100_000 }),
    });
    assert.notEqual(second, first);
    assert.equal(second[0].netWorthNpr, 1_100_000);
  });
});
