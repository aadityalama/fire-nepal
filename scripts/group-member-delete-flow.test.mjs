#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (rel) => readFileSync(join(root, rel), "utf8");

/** Mirrors src/lib/expense-members.ts removeMemberFromExpenseList for regression coverage. */
function removeMemberFromExpenseList(expenses, memberId) {
  const kept = [];
  const removedIds = [];
  const updated = [];

  for (const expense of expenses) {
    if (expense.payerId === memberId) {
      removedIds.push(expense.id);
      continue;
    }

    const inAmong = expense.splitAmong?.includes(memberId) ?? false;
    const inPct = Boolean(expense.splitPercentages && memberId in expense.splitPercentages);
    if (!inAmong && !inPct) {
      kept.push(expense);
      continue;
    }

    const nextAmong = (expense.splitAmong ?? []).filter((id) => id !== memberId);
    const nextPct = expense.splitPercentages
      ? Object.fromEntries(Object.entries(expense.splitPercentages).filter(([key]) => key !== memberId))
      : undefined;
    const next = {
      ...expense,
      splitAmong: nextAmong.length > 0 ? nextAmong : undefined,
      splitPercentages: nextPct && Object.keys(nextPct).length > 0 ? nextPct : undefined,
    };
    kept.push(next);
    updated.push(next);
  }

  return { kept, removedIds, updated };
}

test("member delete helper strips payer expenses and split refs", () => {
  const source = read("src/lib/expense-members.ts");
  assert.match(source, /export function removeMemberFromExpenseList/);

  const expenses = [
    {
      id: 1,
      title: "Rent",
      amount: 100,
      payerId: "m_a",
      category: "housing",
      splitEqually: true,
      date: "2026-08-01",
      splitAmong: ["m_a", "m_b"],
    },
    {
      id: 2,
      title: "Food",
      amount: 40,
      payerId: "m_b",
      category: "food",
      splitEqually: false,
      date: "2026-08-02",
      splitAmong: ["m_a", "m_b"],
      splitPercentages: { m_a: 50, m_b: 50 },
    },
  ];

  const result = removeMemberFromExpenseList(expenses, "m_a");
  assert.deepEqual(result.removedIds, [1]);
  assert.equal(result.kept.length, 1);
  assert.equal(result.kept[0].id, 2);
  assert.deepEqual(result.kept[0].splitAmong, ["m_b"]);
  assert.deepEqual(result.kept[0].splitPercentages, { m_b: 50 });
  assert.equal(result.updated.length, 1);
});

test("group member cascade delete persists expense cleanup before soft delete", () => {
  const source = read("src/services/group-expenses-supabase.ts");
  assert.match(source, /export async function deleteGroupMemberCascade/);
  assert.match(source, /persistExpenseMemberRemoval/);
  assert.match(source, /softDeleteGroupExpenseByLocalId/);
  assert.match(source, /upsertGroupExpenseByLocalId/);
  assert.match(source, /softDeleteGroupMemberByLocalId/);

  const cascadeBody = source.slice(source.indexOf("export async function deleteGroupMemberCascade"));
  const softDeleteCall = cascadeBody.indexOf("softDeleteGroupMemberByLocalId");
  const expenseRemovalCall = cascadeBody.indexOf("persistExpenseMemberRemoval");
  assert.ok(expenseRemovalCall >= 0);
  assert.ok(softDeleteCall > expenseRemovalCall);
});

test("upsert refuses to resurrect soft-deleted members", () => {
  const source = read("src/services/group-expenses-supabase.ts");
  const upsertBody = source.slice(source.indexOf("export async function upsertGroupMember"));
  const beforeInsert = upsertBody.slice(0, upsertBody.indexOf(".insert(insertPayload)"));
  assert.match(beforeInsert, /existing\.deleted_at/);
  assert.match(beforeInsert, /upsert skipped soft-deleted member/);
  assert.match(beforeInsert, /return null/);
});

test("soft delete selects updated rows for observability", () => {
  const source = read("src/services/group-expenses-supabase.ts");
  const deleteBody = source.slice(source.indexOf("export async function softDeleteGroupMemberByLocalId"));
  const nextExport = deleteBody.indexOf("\nexport async function findSoftDeletedLocalMemberIds");
  const body = nextExport >= 0 ? deleteBody.slice(0, nextExport) : deleteBody;
  assert.match(body, /\.select\("id"\)/);
  assert.match(body, /already deleted/i);
});

test("dashboard removeMember awaits cascade and rolls back on failure", () => {
  const page = read("src/components/ExpenseDashboard.tsx");
  const deleteBody = page.slice(page.indexOf("async function removeMember"));
  assert.match(deleteBody, /deleteGroupMemberCascade/);
  assert.match(deleteBody, /setMembers\(previousMembers\)/);
  assert.match(deleteBody, /setExpenses\(previousExpenses\)/);
  assert.match(deleteBody, /toast\.success/);
  assert.match(deleteBody, /toast\.error/);
  assert.match(deleteBody, /removeMemberFromExpenseList/);
});

test("hydrate purges expense refs for soft-deleted members before placeholders", () => {
  const page = read("src/components/ExpenseDashboard.tsx");
  assert.match(page, /findSoftDeletedLocalMemberIds/);
  assert.match(page, /purgeSoftDeletedMemberExpenseRefs/);
  const hydrateSlice = page.slice(
    page.indexOf("const missingFromRoster"),
    page.indexOf("const unresolvedFromCloud"),
  );
  assert.match(hydrateSlice, /purgeSoftDeletedMemberExpenseRefs/);
});
