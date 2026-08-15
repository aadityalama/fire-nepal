#!/usr/bin/env node
/**
 * Focused Phase 2 data-save reliability tests (no Playwright / no full suite).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

test("layering contract: bottom nav sits below sheets", () => {
  const layering = read("src/lib/ux/layering.ts");
  assert.match(layering, /bottomNav:\s*40/);
  assert.match(layering, /sheet:\s*50/);
  assert.match(layering, /pageChrome:\s*45/);

  const nav = read("src/components/navigation/FireNepalMainBottomNav.tsx");
  assert.match(nav, /FN_Z_CLASS\.bottomNav/);
  assert.doesNotMatch(nav, /z-\[60\]/);

  const income = read("src/components/cashflow-workspace/CashflowIncomeFormSheet.tsx");
  assert.match(income, /FN_Z_CLASS\.sheet/);
  assert.match(income, /data-fn-save="cashflow-income"/);
  assert.match(income, /SAVE_FEEDBACK\.saving/);

  const savings = read("src/components/savings-workspace/SavingsGoalSheet.tsx");
  assert.match(savings, /FN_Z_CLASS\.sheet/);
  assert.match(savings, /data-fn-save="savings-goal"/);

  const insurance = read("src/components/insurance-workspace/InsurancePolicySheet.tsx");
  assert.match(insurance, /FN_Z_CLASS\.sheet/);
  assert.match(insurance, /data-fn-save="insurance-policy"/);

  const expense = read("src/components/expense-workspace/ExpenseWorkspaceDashboard.tsx");
  assert.match(expense, /data-fn-save="expense-add"/);
  assert.match(expense, /autoComplete="off"/);

  const budget = read("app/budget/page.tsx");
  assert.match(budget, /FN_Z_CLASS\.sheet/);
  assert.match(budget, /SAVE_FEEDBACK/);
});

test("save feedback copy is standardized", () => {
  const messages = read("src/lib/ux/form-messages.ts");
  assert.match(messages, /saving:\s*"Saving\.\.\."/);
  assert.match(messages, /saved:\s*"Saved"/);
  assert.match(messages, /saveFailed:\s*"Save failed — please try again"/);

  const helper = read("src/lib/ux/save-feedback.ts");
  assert.match(helper, /export async function runSaveAction/);
  assert.match(helper, /setSaving\?\.\(false\)/);
});

test("cloud hydrate failure retains valid local state", () => {
  const cashflow = read("src/components/cashflow/hooks/useCashflowPersistedState.ts");
  assert.match(cashflow, /Temporary \/ auth cloud failure must NOT wipe valid local state/);
  assert.match(cashflow, /const cached = loadCashflowState\(userId\)/);
  assert.doesNotMatch(cashflow, /Never keep browser-local data as truth after login/);

  const cloudDoc = read("src/hooks/useCloudDocumentState.ts");
  assert.match(cloudDoc, /Temporary cloud\/network failure must NOT clear valid/);
  assert.doesNotMatch(cloudDoc, /clearLocalRef\.current\?\.\(\);\s*\n\s*setHydrateError/);

  const portfolio = read("src/hooks/WealthPortfolioCloudSync.tsx");
  assert.match(portfolio, /hydrateSucceededRef/);
  assert.match(portfolio, /allowEmptyTableWipe: hydrateSucceededRef\.current/);
  assert.match(portfolio, /Temporary cloud failure must not wipe valid/);
});

test("portfolio refuses empty wipe without allowEmptyTableWipe", () => {
  const service = read("src/services/portfolio-supabase.ts");
  assert.match(service, /refusing empty wipe/);
  assert.match(service, /allowEmptyWipe/);
  assert.match(service, /allowEmptyTableWipe/);
});

test("scoped localStorage helpers preserve legacy keys", () => {
  const scoped = read("src/lib/ux/scoped-storage.ts");
  assert.match(scoped, /readJsonWithLegacyMigration/);
  assert.match(scoped, /Never deletes the legacy unscoped key until the scoped write succeeds/);

  const savings = read("src/lib/savings/savings-storage.ts");
  assert.match(savings, /readJsonWithLegacyMigration\(SAVINGS_WORKSPACE_STORAGE_KEY/);
  assert.match(savings, /writeJsonScoped\(SAVINGS_WORKSPACE_STORAGE_KEY/);

  const insurance = read("src/lib/insurance/insurance-storage.ts");
  assert.match(insurance, /readJsonWithLegacyMigration\(INSURANCE_WORKSPACE_STORAGE_KEY/);

  const personal = read("src/lib/personal-expense-storage.ts");
  assert.match(personal, /readJsonWithLegacyMigration\(PERSONAL_EXPENSES_STORAGE_KEY/);

  const expense = read("src/lib/expense-storage.ts");
  assert.match(expense, /readJsonWithLegacyMigration\(STORAGE_KEY/);
});

test("emergency fund save + 6× essentials target", () => {
  const dash = read("src/components/emergency-fund/EmergencyFundDashboard.tsx");
  assert.match(dash, /data-fn-save="emergency-fund"/);
  assert.match(dash, /Save Emergency Fund/);
  assert.match(dash, /runSaveAction/);
  assert.match(dash, /persistEmergencyReserve/);
  assert.match(dash, /essential monthly expenses ×/);

  const plan = read("src/lib/emergency-fund-plan.ts");
  assert.match(plan, /DEFAULT_EMERGENCY_FUND_MONTHS = 6/);
  assert.match(plan, /emergencyCashReserve/);
  assert.match(plan, /recommendedTarget/);
  assert.match(plan, /monthlyEssentialExpenses/);
});

test("fire_goals is fallback-only source of truth", () => {
  assert.match(read("src/services/cashflow-supabase.ts"), /Source of truth: `cashflow_snapshots`/);
  assert.match(read("src/services/savings-supabase.ts"), /Source of truth: `finance_savings_workspace`/);
  assert.match(read("src/services/module-snapshots-supabase.ts"), /Source of truth: `user_module_snapshots`/);
  assert.match(read("src/services/cashflow-supabase.ts"), /Never write to both stores/);
});
