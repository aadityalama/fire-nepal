#!/usr/bin/env node
/**
 * Regression: Roommate/Group expense Paid + settlement must not double-count.
 * Mirrors settlement helpers and asserts save-path idempotency guards in source.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (rel) => readFileSync(join(root, rel), "utf8");

/** Mirrors src/lib/expense-utils.ts dedupeExpensesById */
function dedupeExpensesById(expenses) {
  const seen = new Set();
  const out = [];
  for (const expense of expenses) {
    if (seen.has(expense.id)) continue;
    seen.add(expense.id);
    out.push(expense);
  }
  return out;
}

/** Mirrors src/lib/expense-utils.ts expenseAttributedShares (equal split path) */
function expenseAttributedShares(expense, groupMembers) {
  const out = Object.fromEntries(groupMembers.map((m) => [m, 0]));
  const involvedRaw =
    expense.splitAmong && expense.splitAmong.length > 0
      ? expense.splitAmong.filter((m) => groupMembers.includes(m))
      : [...groupMembers];
  const involved = involvedRaw.length > 0 ? involvedRaw : [...groupMembers];
  const n = involved.length;
  if (n === 0 || expense.amount <= 0) return out;
  const each = expense.amount / n;
  for (const m of involved) out[m] = each;
  return out;
}

/** Mirrors src/lib/expense-utils.ts getSettlement after dedupe fix */
function getSettlement(members, expenses) {
  const uniqueExpenses = dedupeExpensesById(expenses);
  const totalExpense = uniqueExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const memberExpectedShare = Object.fromEntries(members.map((m) => [m, 0]));
  for (const expense of uniqueExpenses) {
    const shares = expenseAttributedShares(expense, members);
    for (const m of members) {
      memberExpectedShare[m] += shares[m] ?? 0;
    }
  }
  const equalSplitAmount = totalExpense / Math.max(members.length, 1);
  const paidByMember = Object.fromEntries(
    members.map((member) => [
      member,
      uniqueExpenses
        .filter((expense) => expense.payerId === member)
        .reduce((sum, expense) => sum + expense.amount, 0),
    ]),
  );
  const balances = Object.fromEntries(
    members.map((member) => [member, paidByMember[member] - memberExpectedShare[member]]),
  );
  return { balances, equalSplitAmount, memberExpectedShare, paidByMember, totalExpense };
}

function dedupeGroupExpenseRows(rows) {
  const byCloudId = new Map();
  const byLocalId = new Map();
  const out = [];
  for (const row of rows) {
    if (row.id && byCloudId.has(row.id)) continue;
    if (row.local_expense_id != null && byLocalId.has(row.local_expense_id)) continue;
    if (row.id) byCloudId.set(row.id, row);
    if (row.local_expense_id != null) byLocalId.set(row.local_expense_id, row);
    out.push(row);
  }
  return out;
}

function stableLocalExpenseIdFromRowId(rowId) {
  let hash = 0;
  for (let i = 0; i < rowId.length; i += 1) {
    hash = (Math.imul(31, hash) + rowId.charCodeAt(i)) | 0;
  }
  const positive = Math.abs(hash);
  return positive > 0 ? positive : 1;
}

const BHUPAL = "m_bhupal";
const ROOMMATE = "m_roommate";
const MEMBERS = [BHUPAL, ROOMMATE];

function martExpense(id) {
  return {
    id,
    title: "Mart",
    amount: 100_000,
    payerId: BHUPAL,
    category: "Grocery",
    splitEqually: true,
    date: "2026-08-10",
  };
}

test("source exports dedupeExpensesById and getSettlement uses it", () => {
  const utils = read("src/lib/expense-utils.ts");
  assert.match(utils, /export function dedupeExpensesById/);
  assert.match(utils, /const uniqueExpenses = dedupeExpensesById\(expenses\)/);
  assert.match(utils, /uniqueExpenses[\s\S]*payerId === member/);
});

test("one ₩100,000 expense → payer paid = ₩100,000", () => {
  const expenses = [martExpense(1)];
  const settlement = getSettlement(MEMBERS, expenses);
  assert.equal(settlement.paidByMember[BHUPAL], 100_000);
  assert.equal(settlement.totalExpense, 100_000);
  assert.equal(settlement.equalSplitAmount, 50_000);
  assert.equal(settlement.balances[BHUPAL], 50_000);
  assert.equal(settlement.balances[ROOMMATE], -50_000);
});

test("two genuinely separate ₩100,000 expenses → payer paid = ₩200,000", () => {
  const expenses = [martExpense(1), martExpense(2)];
  const settlement = getSettlement(MEMBERS, expenses);
  assert.equal(settlement.paidByMember[BHUPAL], 200_000);
  assert.equal(settlement.totalExpense, 200_000);
  assert.equal(settlement.equalSplitAmount, 100_000);
});

test("same expense id repeated in array is counted once (fetch/render duplicate)", () => {
  const expenses = [martExpense(1), martExpense(1)];
  const settlement = getSettlement(MEMBERS, expenses);
  assert.equal(settlement.paidByMember[BHUPAL], 100_000);
  assert.equal(settlement.totalExpense, 100_000);
  assert.equal(dedupeExpensesById(expenses).length, 1);
});

test("settlement and statement/PDF helpers share the same totals as ledger", () => {
  const analytics = read("src/lib/group-expenses/analytics.ts");
  assert.match(analytics, /dedupeExpensesById/);
  assert.match(analytics, /buildGroupMonthlyStatement/);
  assert.match(analytics, /getSettlement/);

  const expenses = [martExpense(10), { ...martExpense(10), title: "ghost duplicate" }];
  const ledgerTotal = dedupeExpensesById(expenses).reduce((s, e) => s + e.amount, 0);
  const settlement = getSettlement(MEMBERS, expenses);
  assert.equal(settlement.totalExpense, ledgerTotal);
  assert.equal(settlement.paidByMember[BHUPAL], ledgerTotal);
});

test("group expense list/row helpers dedupe by cloud id and local_expense_id", () => {
  const service = read("src/services/group-expenses-supabase.ts");
  assert.match(service, /export function dedupeGroupExpenseRows/);
  assert.match(service, /isUniqueConstraintError/);
  assert.match(service, /upsert recovered from unique race/);
  assert.match(service, /stableLocalExpenseIdFromRowId/);
  assert.doesNotMatch(service, /local_expense_id \?\? Date\.now\(\)/);

  const rows = [
    { id: "uuid-a", local_expense_id: 111, title: "Mart", amount: 100_000 },
    { id: "uuid-a", local_expense_id: 111, title: "Mart", amount: 100_000 },
    { id: "uuid-b", local_expense_id: 111, title: "Mart copy", amount: 100_000 },
    { id: "uuid-c", local_expense_id: 222, title: "Rent", amount: 50_000 },
  ];
  const deduped = dedupeGroupExpenseRows(rows);
  assert.equal(deduped.length, 2);
  assert.equal(deduped[0].id, "uuid-a");
  assert.equal(deduped[1].id, "uuid-c");
  assert.equal(stableLocalExpenseIdFromRowId("uuid-a"), stableLocalExpenseIdFromRowId("uuid-a"));
  assert.notEqual(stableLocalExpenseIdFromRowId("uuid-a"), Date.now());
});

test("Save is idempotent: draft id + sync lock prevent duplicate inserts on repeated clicks", () => {
  const dashboard = read("src/components/ExpenseDashboard.tsx");
  assert.match(dashboard, /draftExpenseIdRef/);
  assert.match(dashboard, /savingExpenseLockRef/);
  assert.match(dashboard, /if \(savingExpenseLockRef\.current \|\| savingExpense\) return/);
  assert.match(dashboard, /editingExpenseId \?\? draftExpenseIdRef\.current \?\? Date\.now\(\)/);
  assert.match(dashboard, /current\.filter\(\(expense\) => expense\.id !== nextExpense\.id\)/);
  assert.match(dashboard, /disabled=\{savingExpense\}/);
  assert.match(dashboard, /Saving…/);
  // Must not mint a fresh Date.now() on every Save click for new expenses without draft reuse.
  assert.match(dashboard, /draftExpenseIdRef\.current = Date\.now\(\)/);
  assert.match(dashboard, /openAddExpenseModal/);
});

test("refresh / re-open hydrate dedupes cloud pages and does not re-seed local into cloud", () => {
  const dashboard = read("src/components/ExpenseDashboard.tsx");
  assert.match(dashboard, /dedupeGroupExpenseRows\(all\)\.map\(groupExpenseRowToExpense\)/);
  assert.match(dashboard, /dedupeExpensesById/);
  assert.match(dashboard, /Always apply cloud — including empty/);
  assert.doesNotMatch(dashboard, /syncLocalExpensesToGroupExpenses/);

  const activity = read("src/components/group-expenses/GroupActivityPanel.tsx");
  assert.match(activity, /dedupeGroupExpenseRows\(merged\)/);
  assert.match(activity, /Cloud is source of truth/);
});

test("authenticated user/group scoping remains workspace-scoped with RLS helpers", () => {
  const service = read("src/services/group-expenses-supabase.ts");
  assert.match(service, /ensureAuthenticatedWorkspace\(client, userId/);
  assert.match(service, /\.eq\("workspace_id", workspace\.id\)/);
  assert.match(service, /\.is\("deleted_at", null\)/);

  const migration = read("supabase/migrations/20260711120000_group_expenses.sql");
  assert.match(migration, /group_expenses_workspace_local_uidx/);
  assert.match(migration, /w\.user_id = auth\.uid\(\)/);
  assert.match(migration, /enable row level security/);
});

test("transfers derive from the same paid totals (no separate contribution pipeline)", () => {
  const one = getSettlement(MEMBERS, [martExpense(1)]);
  assert.equal(one.paidByMember[BHUPAL] - one.memberExpectedShare[BHUPAL], one.balances[BHUPAL]);

  const twoDistinct = getSettlement(MEMBERS, [martExpense(1), martExpense(2)]);
  assert.equal(twoDistinct.paidByMember[BHUPAL], 200_000);
  assert.equal(twoDistinct.equalSplitAmount, 100_000);
  assert.equal(twoDistinct.balances[BHUPAL], 100_000);

  const dashboard = read("src/components/ExpenseDashboard.tsx");
  assert.match(
    dashboard,
    /useMemo\(\(\) => getSettlement\(members, monthExpenses\), \[members, monthExpenses\]\)/,
  );
});
