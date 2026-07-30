#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (rel) => readFileSync(join(root, rel), "utf8");

test("budget list fallbacks exclude soft-deleted rows when deleted_at exists", () => {
  const source = read("src/services/budget-supabase.ts");
  assert.match(source, /BUDGET_COLUMNS_NO_NOTES/);
  assert.match(source, /\.is\("deleted_at", null\)/);

  const listBody = source.slice(source.indexOf("export async function listBudgetRecordsForUser"));
  const noNotesFallback = listBody.slice(
    listBody.indexOf("missingNotesColumn(result.error)"),
    listBody.indexOf("Soft-delete column unavailable"),
  );
  assert.match(noNotesFallback, /BUDGET_COLUMNS_NO_NOTES/);
  assert.match(noNotesFallback, /\.is\("deleted_at", null\)/);
  assert.doesNotMatch(noNotesFallback, /BUDGET_COLUMNS_NO_SOFT_DELETE/);
});

test("budget delete soft-deletes and reports already_deleted instead of Budget not found", () => {
  const source = read("src/services/budget-supabase.ts");
  const deleteBody = source.slice(source.indexOf("export async function deleteBudgetRecordForUser"));
  assert.doesNotMatch(deleteBody, /\.delete\(/);
  assert.match(deleteBody, /deleted_at/);
  assert.match(deleteBody, /already_deleted/);
  assert.doesNotMatch(deleteBody, /Budget not found/);
  assert.match(deleteBody, /isPersistedBudgetId|UUID_RE/);
});

test("budget delete API returns alreadyDeleted and never surfaces Budget not found", () => {
  const route = read("app/api/budgets/[id]/route.ts");
  const deleteBody = route.slice(route.indexOf("export async function DELETE"));
  assert.match(deleteBody, /alreadyDeleted/);
  assert.doesNotMatch(deleteBody, /Budget not found/);
});

test("budget client delete remaps Budget not found and disables HTTP cache", () => {
  const api = read("src/lib/budget/budget-api.ts");
  const deleteBody = api.slice(api.indexOf("export async function deleteBudgetRecord"));
  assert.match(deleteBody, /already been deleted/i);
  assert.match(deleteBody, /cache:\s*"no-store"/);
  assert.match(deleteBody, /budget not found/i);
});

test("budget page removes card, closes modal, and reloads after delete", () => {
  const page = read("app/budget/page.tsx");
  const deleteBody = page.slice(page.indexOf("const handleDeleteBudget"));
  assert.match(deleteBody, /setBudgets\(\(prev\) => prev\.filter/);
  assert.match(deleteBody, /setDeletingBudget\(null\)/);
  assert.match(deleteBody, /reloadBudgets\(\)/);
  assert.match(deleteBody, /already been deleted/i);
  assert.match(deleteBody, /deleteBudgetRecord\(removedId\)/);
});
