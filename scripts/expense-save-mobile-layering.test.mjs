#!/usr/bin/env node
/**
 * Expense Save mobile layering + clickability regression tests.
 * Ensures bottom nav cannot sit above the Add Expense sheet / Save CTAs.
 *
 * Run: npx tsx --test scripts/expense-save-mobile-layering.test.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  parseExpenseFormAmount,
  validateExpenseFormFields,
} from "../src/lib/expense-workspace/expense-form-validation.ts";
import { FN_Z, FN_Z_CLASS } from "../src/lib/ux/layering.ts";
import { FORM_MESSAGES } from "../src/lib/ux/form-messages.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function readSrc(relPath) {
  return readFileSync(join(root, relPath), "utf8");
}

describe("stacking contract: bottom nav below expense sheet", () => {
  it("keeps FN_Z.bottomNav below FN_Z.sheet", () => {
    assert.equal(FN_Z.bottomNav, 40);
    assert.equal(FN_Z.sheet, 50);
    assert.ok(FN_Z.bottomNav < FN_Z.sheet);
    assert.equal(FN_Z_CLASS.bottomNav, "z-40");
    assert.equal(FN_Z_CLASS.sheet, "z-50");
  });

  it("FireNepalMainBottomNav uses FN_Z_CLASS.bottomNav and not z-[60]", () => {
    const nav = readSrc("src/components/navigation/FireNepalMainBottomNav.tsx");
    assert.match(nav, /FN_Z_CLASS\.bottomNav/);
    assert.match(nav, /data-fn-layer="bottom-nav"/);
    assert.doesNotMatch(nav, /z-\[60\]/);
  });

  it("ExpenseAddSheet uses sheet layer, portals to body, and dual Save CTAs", () => {
    const workspace = readSrc("src/components/expense-workspace/ExpenseWorkspaceDashboard.tsx");
    assert.match(workspace, /FN_Z_CLASS\.sheet/);
    assert.match(workspace, /data-fn-layer="sheet"/);
    assert.match(workspace, /data-fn-sheet="expense-add"/);
    assert.match(workspace, /createPortal\(sheet, document\.body\)/);
    assert.match(workspace, /data-testid="expense-save-top"/);
    assert.match(workspace, /data-testid="expense-save-bottom"/);
    assert.match(workspace, /data-testid="expense-save-sticky-footer"/);
    assert.match(workspace, /data-fn-save="expense-add"/);
    assert.match(workspace, /const handleSave = \(\) =>/);
    assert.match(workspace, /id="expense-add-form"/);
    assert.match(workspace, /type="submit"[\s\S]{0,200}form="expense-add-form"[\s\S]{0,200}data-testid="expense-save-bottom"/);
    assert.match(workspace, /onClick=\{handleSave\}[\s\S]{0,220}data-testid="expense-save-top"/);
    assert.match(workspace, /pointer-events-auto/);
    assert.match(workspace, /touch-manipulation/);
    assert.match(workspace, /h-\[100dvh\]/);
  });

  it("Save feedback uses Saving... / Saved / Save failed copy and blocks double submit", () => {
    assert.equal(FORM_MESSAGES.saving, "Saving...");
    assert.equal(FORM_MESSAGES.saved, "Saved");
    assert.equal(FORM_MESSAGES.saveFailed, "Save failed — please try again");

    const feedback = readSrc("src/lib/ux/save-feedback.ts");
    assert.match(feedback, /saving:\s*FORM_MESSAGES\.saving/);
    assert.match(feedback, /saved:\s*FORM_MESSAGES\.saved/);
    assert.match(feedback, /failed:\s*FORM_MESSAGES\.saveFailed/);
    assert.match(feedback, /export async function runSaveAction/);

    const workspace = readSrc("src/components/expense-workspace/ExpenseWorkspaceDashboard.tsx");
    assert.match(workspace, /SAVE_FEEDBACK\.saving/);
    assert.match(workspace, /SAVE_FEEDBACK\.saved/);
    assert.match(workspace, /SAVE_FEEDBACK\.failed/);
    assert.match(workspace, /if \(savingExpense\) return/);
    assert.match(workspace, /if \(saving\) return/);
    assert.match(workspace, /disabled=\{saving\}/);
    assert.match(workspace, /aria-busy=\{saving\}/);
    assert.match(workspace, /data-testid="expense-save-error"/);
    assert.match(workspace, /role="alert"/);
  });
});

describe("validateExpenseFormFields", () => {
  it("accepts a valid name, category, amount, and date", () => {
    const result = validateExpenseFormFields({
      title: " Internet Bill ",
      amount: "1,200",
      category: "utilities",
      date: "2026-08-14",
    });
    assert.equal(result.ok, true);
    assert.equal(result.amountNpr, 1200);
    assert.equal(result.title, "Internet Bill");
    assert.equal(result.error, null);
  });

  it("rejects missing required fields with clear errors", () => {
    assert.match(validateExpenseFormFields({ title: "", amount: "100", category: "food", date: "2026-08-14" }).error, /name/i);
    assert.match(validateExpenseFormFields({ title: "Tea", amount: "0", category: "food", date: "2026-08-14" }).error, /amount/i);
    assert.match(validateExpenseFormFields({ title: "Tea", amount: "100", category: "", date: "2026-08-14" }).error, /category/i);
    assert.match(validateExpenseFormFields({ title: "Tea", amount: "100", category: "food", date: "14-08-2026" }).error, /date/i);
  });

  it("parses decimal amount strings", () => {
    assert.equal(parseExpenseFormAmount("99.5"), 99.5);
    assert.equal(parseExpenseFormAmount(""), null);
    assert.equal(parseExpenseFormAmount("-5"), null);
  });
});

describe("workspace save stays on authenticated persistence path", () => {
  it("still awaits onSubmitWorkspaceExpense and keeps form values on failure", () => {
    const workspace = readSrc("src/components/expense-workspace/ExpenseWorkspaceDashboard.tsx");
    assert.match(workspace, /await Promise\.resolve\(\s*onSubmitWorkspaceExpense\(/);
    assert.match(workspace, /setSaveError\(SAVE_FEEDBACK\.failed\)/);
    assert.doesNotMatch(workspace, /localStorage\.setItem/);
    assert.match(workspace, /setAddOpen\(false\)/);
  });

  it("cloud success toast uses Saved for workspace submit", () => {
    const dashboard = readSrc("src/components/ExpenseDashboard.tsx");
    assert.match(dashboard, /toast\.success\("Saved"\)/);
    assert.match(dashboard, /Save failed — please try again/);
  });
});
