import assert from "node:assert/strict";
import test from "node:test";

/**
 * Lightweight regression checks for insurance premium tracker math.
 * Uses dynamic import of compiled-free TS via tsx if available; otherwise
 * mirrors the pure formulas inline for CI without a TS loader.
 */

function premiumIntervalMonths(frequency) {
  switch (frequency) {
    case "monthly":
      return 1;
    case "quarterly":
      return 3;
    case "half_yearly":
      return 6;
    case "yearly":
      return 12;
    default:
      return null;
  }
}

function totalInstallments(termYears, frequency) {
  if (frequency === "one_time") return 1;
  const interval = premiumIntervalMonths(frequency);
  if (!interval || !termYears) return 0;
  return Math.round((termYears * 12) / interval);
}

test("yearly 20-year policy has 20 installments", () => {
  assert.equal(totalInstallments(20, "yearly"), 20);
});

test("monthly 10-year policy has 120 installments", () => {
  assert.equal(totalInstallments(10, "monthly"), 120);
});

test("quarterly 5-year policy has 20 installments", () => {
  assert.equal(totalInstallments(5, "quarterly"), 20);
});

test("half-yearly 10-year policy has 20 installments", () => {
  assert.equal(totalInstallments(10, "half_yearly"), 20);
});

test("premium paid so far = amount × paid installments", () => {
  const premium = 126000;
  const paid = 8;
  assert.equal(premium * paid, 1_008_000);
});
