#!/usr/bin/env node
/**
 * Finance Expense save-flow regression tests.
 * Covers: form validation, sticky dual Save CTAs, persistence sync,
 * Cashflow live totals, and Emergency Fund essential burn refresh.
 *
 * Run: npx tsx --test scripts/expense-save-flow.test.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { defaultCashflowState } from "../src/components/cashflow/cashflow-storage.ts";
import { monthlyBurn, sumExpensesForMonth } from "../src/components/cashflow/cashflow-metrics.ts";
import { computeCashflowLiveMetrics } from "../src/lib/cashflow/cashflow-live-metrics.ts";
import { EXPENSE_MODULE_SYNC_EVENT } from "../src/lib/cashflow/live-sync-events.ts";
import {
  parseExpenseFormAmount,
  validateExpenseFormFields,
} from "../src/lib/expense-workspace/expense-form-validation.ts";
import { computeEmergencyFundPlan } from "../src/lib/emergency-fund-plan.ts";
import { computeUnifiedFireSummary } from "../src/lib/fire-nepal/unified-fire-summary.ts";
import { defaultWealthState } from "../src/components/portfolio/storage.ts";
import { PERSONAL_EXPENSES_STORAGE_KEY } from "../src/lib/personal-expense-storage.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function readSrc(relPath) {
  return readFileSync(join(root, relPath), "utf8");
}

function cashflowWith(overrides = {}) {
  const base = defaultCashflowState();
  return {
    ...base,
    ...overrides,
    income: { ...base.income, ...(overrides.income ?? {}) },
    expenses: { ...base.expenses, ...(overrides.expenses ?? {}) },
  };
}

describe("validateExpenseFormFields", () => {
  it("accepts a valid name, category, amount, and date", () => {
    const result = validateExpenseFormFields({
      title: " Internet Bill ",
      amount: "1,200",
      category: "utilities",
      date: "2026-08-13",
    });
    assert.equal(result.ok, true);
    assert.equal(result.amountNpr, 1200);
    assert.equal(result.title, "Internet Bill");
    assert.equal(result.error, null);
  });

  it("rejects missing required fields with clear errors", () => {
    assert.match(validateExpenseFormFields({ title: "", amount: "100", category: "food", date: "2026-08-13" }).error, /name/i);
    assert.match(validateExpenseFormFields({ title: "Tea", amount: "0", category: "food", date: "2026-08-13" }).error, /amount/i);
    assert.match(validateExpenseFormFields({ title: "Tea", amount: "100", category: "", date: "2026-08-13" }).error, /category/i);
    assert.match(validateExpenseFormFields({ title: "Tea", amount: "100", category: "food", date: "13-08-2026" }).error, /date/i);
  });

  it("parses decimal amount strings", () => {
    assert.equal(parseExpenseFormAmount("99.5"), 99.5);
    assert.equal(parseExpenseFormAmount(""), null);
    assert.equal(parseExpenseFormAmount("-5"), null);
  });
});

describe("Add Expense sticky dual Save UX", () => {
  const workspaceSrc = readSrc("src/components/expense-workspace/ExpenseWorkspaceDashboard.tsx");

  it("keeps top and bottom Save CTAs on the same submit handler", () => {
    assert.match(workspaceSrc, /data-testid="expense-save-top"/);
    assert.match(workspaceSrc, /data-testid="expense-save-bottom"/);
    assert.match(workspaceSrc, /data-testid="expense-save-sticky-footer"/);
    assert.match(workspaceSrc, /const handleSave = \(\) =>/);
    assert.match(workspaceSrc, /id="expense-add-form"/);
    assert.match(workspaceSrc, /event\.preventDefault\(\);\s*handleSave\(\);/);
    // Top Save calls handleSave; bottom Save submits the same form (same handler).
    assert.match(workspaceSrc, /onClick=\{handleSave\}[\s\S]{0,200}data-testid="expense-save-top"/);
    assert.match(workspaceSrc, /type="submit"[\s\S]{0,160}form="expense-add-form"[\s\S]{0,160}data-testid="expense-save-bottom"/);
  });

  it("disables Save until required fields are valid and while saving", () => {
    assert.match(workspaceSrc, /const canSave = validated\.ok && !saving/);
    assert.match(workspaceSrc, /aria-disabled=\{!canSave\}/);
    assert.match(workspaceSrc, /disabled=\{saving\}/);
    assert.match(workspaceSrc, /Saving\.\.\./);
    assert.match(workspaceSrc, /data-testid="expense-save-error"/);
    assert.match(workspaceSrc, /role="alert"/);
    assert.match(workspaceSrc, /expense-save-hint/);
  });

  it("pins Save above the keyboard with a sticky footer and 100dvh sheet", () => {
    assert.match(workspaceSrc, /h-\[100dvh\]/);
    assert.match(workspaceSrc, /shrink-0 border-t border-white\/10/);
    assert.match(workspaceSrc, /env\(safe-area-inset-bottom/);
    assert.match(workspaceSrc, /submitAddExpense/);
    assert.match(workspaceSrc, /savingExpense/);
  });
});

describe("Expense persistence + Cashflow totals refresh", () => {
  it("dispatches EXPENSE_MODULE_SYNC_EVENT when personal expenses are saved", () => {
    const storageSrc = readSrc("src/lib/personal-expense-storage.ts");
    assert.match(storageSrc, /EXPENSE_MODULE_SYNC_EVENT/);
    assert.match(storageSrc, /dispatchEvent\(new Event\(EXPENSE_MODULE_SYNC_EVENT\)\)/);
    assert.equal(EXPENSE_MODULE_SYNC_EVENT, "fire-nepal-expense-dashboard-sync");
    assert.equal(PERSONAL_EXPENSES_STORAGE_KEY, "fire-nepal-personal-expenses-v1");
  });

  it("Cashflow live metrics sum Expense-module transactions for the month", () => {
    const monthKey = "2026-08";
    const expenses = [
      { id: 1, title: "Rent", amount: 20_000, date: "2026-08-01", payerId: "m1", category: "housing", splitEqually: true },
      { id: 2, title: "Food", amount: 5_000, date: "2026-08-10", payerId: "m1", category: "food", splitEqually: true },
      { id: 3, title: "Old", amount: 9_999, date: "2026-07-31", payerId: "m1", category: "food", splitEqually: true },
    ];
    assert.equal(sumExpensesForMonth(expenses, monthKey), 25_000);

    // Without a browser window, readMonthlyExpenseFromModule returns 0 — live metrics still shape correctly.
    const live = computeCashflowLiveMetrics(
      cashflowWith({ income: { salary: 100_000 } }),
      new Date("2026-08-15T12:00:00Z"),
    );
    assert.equal(live.monthKey, monthKey);
    assert.equal(live.monthlyIncome, 100_000);
    assert.equal(typeof live.monthlyExpense, "number");
  });

  it("dashboard save uses loading state and surfaces errors (no silent fail)", () => {
    const dashSrc = readSrc("src/components/ExpenseDashboard.tsx");
    assert.match(dashSrc, /savingExpense/);
    assert.match(dashSrc, /expenseSaveError/);
    assert.match(dashSrc, /setExpenseSaveError\(message\)/);
    assert.match(dashSrc, /toast\.error\(message\)/);
    assert.match(dashSrc, /if \(savingExpense\) return/);
    assert.match(dashSrc, /validateExpenseFormFields/);
    assert.match(dashSrc, /data-testid="expense-modal-save"/);
    assert.match(dashSrc, /sticky bottom-0/);
  });
});

describe("Emergency Fund reflects Expense-module burn after save", () => {
  it("uses Expense autoExpenseTotal for monthly essential when no override", () => {
    const cashflow = cashflowWith({
      income: { salary: 120_000 },
      expenses: { rent: 1_000 },
      emergencyCashReserve: 0,
    });
    const plan = computeEmergencyFundPlan(cashflow, { autoExpenseTotal: 45_000 });
    assert.equal(plan.monthlyEssentialExpenses, 45_000);
    assert.equal(plan.recommendedTarget, 270_000);
    assert.equal(monthlyBurn(cashflow, 45_000), 45_000);
  });

  it("keeps explicit monthlyExpensesOverride above Expense-module total", () => {
    const cashflow = cashflowWith({
      monthlyExpensesOverride: 60_000,
      expenses: { rent: 10_000 },
    });
    assert.equal(monthlyBurn(cashflow, 45_000), 60_000);
    assert.equal(computeEmergencyFundPlan(cashflow, { autoExpenseTotal: 45_000 }).monthlyEssentialExpenses, 60_000);
  });

  it("keeps FIRE Progress emergency target in sync with Expense burn", () => {
    const cashflow = cashflowWith({
      income: { salary: 100_000 },
      emergencyCashReserve: 90_000,
    });
    const autoExpenseTotal = 45_000;
    const plan = computeEmergencyFundPlan(cashflow, { autoExpenseTotal });
    const summary = computeUnifiedFireSummary(defaultWealthState(), cashflow, 10, 0.0075, autoExpenseTotal);
    assert.equal(summary.emergencyFundTargetAmount, plan.recommendedTarget);
    assert.equal(summary.monthlyExpenses, 45_000);
    assert.equal(summary.emergencyFundHasSufficientData, true);
  });

  it("Emergency Fund dashboard listens for expense module sync", () => {
    const efSrc = readSrc("src/components/emergency-fund/EmergencyFundDashboard.tsx");
    assert.match(efSrc, /EXPENSE_MODULE_SYNC_EVENT/);
    assert.match(efSrc, /readMonthlyExpenseFromModule/);
    assert.match(efSrc, /autoExpenseTotal/);
  });
});
