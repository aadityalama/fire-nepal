#!/usr/bin/env node
/**
 * Expense Delete UX regression tests.
 * Covers: immediate Deleting... feedback, disabled pending state, double-submit guard,
 * success-only local removal, failure restore, and bottom-nav stacking for Delete taps.
 *
 * Run: npx tsx --test scripts/expense-delete-flow.test.mjs
 *   or: npm run test:expense-delete
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { DELETE_FEEDBACK, runDeleteAction } from "../src/lib/ux/delete-feedback.ts";
import { FN_Z, FN_Z_CLASS } from "../src/lib/ux/layering.ts";
import { FORM_MESSAGES } from "../src/lib/ux/form-messages.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function readSrc(relPath) {
  return readFileSync(join(root, relPath), "utf8");
}

describe("stacking contract: bottom nav below expense delete sheets", () => {
  it("keeps FN_Z.bottomNav below FN_Z.sheet / elevated", () => {
    assert.equal(FN_Z.bottomNav, 40);
    assert.ok(FN_Z.bottomNav < FN_Z.sheet);
    assert.ok(FN_Z.bottomNav < FN_Z.elevated);
    assert.equal(FN_Z_CLASS.bottomNav, "z-40");
  });

  it("FireNepalMainBottomNav uses FN_Z_CLASS.bottomNav and not z-[60]", () => {
    const nav = readSrc("src/components/navigation/FireNepalMainBottomNav.tsx");
    assert.match(nav, /FN_Z_CLASS\.bottomNav/);
    assert.match(nav, /data-fn-layer="bottom-nav"/);
    assert.doesNotMatch(nav, /z-\[60\]/);
  });

  it("ExpenseBottomSheet portals above the nav and keeps pointer-events-auto", () => {
    const dashboard = readSrc("src/components/ExpenseDashboard.tsx");
    assert.match(dashboard, /createPortal\(sheet, document\.body\)/);
    assert.match(dashboard, /data-fn-layer="sheet"/);
    assert.match(dashboard, /pointer-events-auto/);
    assert.match(dashboard, /FN_Z_CLASS\.elevated/);
  });

  it("ExpenseDetailSheet portals Delete CTA above overlays", () => {
    const workspace = readSrc("src/components/expense-workspace/ExpenseWorkspaceDashboard.tsx");
    assert.match(workspace, /createPortal\(sheet, document\.body\)/);
    assert.match(workspace, /data-fn-sheet="expense-detail"/);
    assert.match(workspace, /data-testid="expense-delete-detail"/);
    assert.match(workspace, /data-fn-delete="expense-detail"/);
    assert.match(workspace, /touch-manipulation/);
    assert.match(workspace, /pointer-events-auto/);
  });
});

describe("Delete feedback: immediate Deleting... until async resolves", () => {
  it("uses Deleting... / Delete failed copy", () => {
    assert.equal(FORM_MESSAGES.deleting, "Deleting...");
    assert.equal(FORM_MESSAGES.deleteFailed, "Delete failed");
    assert.equal(DELETE_FEEDBACK.deleting, "Deleting...");
    assert.equal(DELETE_FEEDBACK.failed, "Delete failed");
  });

  it("confirmDeleteExpense sets busy immediately, disables Delete, and blocks double submit", () => {
    const dashboard = readSrc("src/components/ExpenseDashboard.tsx");
    assert.match(dashboard, /runDeleteAction\(/);
    assert.match(dashboard, /deletingExpenseLockRef/);
    assert.match(dashboard, /if \(!expenseToDelete \|\| deletingExpenseLockRef\.current \|\| deletingExpenseBusy\) return/);
    assert.match(dashboard, /setDeletingExpenseBusy/);
    assert.match(dashboard, /disabled=\{deletingExpenseBusy\}/);
    assert.match(dashboard, /aria-busy=\{deletingExpenseBusy\}/);
    assert.match(dashboard, /DELETE_FEEDBACK\.deleting/);
    assert.match(dashboard, /DELETE_FEEDBACK\.failed/);
    assert.match(dashboard, /data-testid="expense-delete-confirm"/);
    assert.match(dashboard, /Loader2/);
    assert.match(dashboard, /animate-spin/);
    assert.doesNotMatch(dashboard, /setTimeout\(\s*\(\)\s*=>\s*setDeletingExpenseBusy/);
  });

  it("personal and group confirm Delete CTAs share confirmDeleteExpense + busy state", () => {
    const dashboard = readSrc("src/components/ExpenseDashboard.tsx");
    const confirmClicks = dashboard.match(/onClick=\{\(\) => void confirmDeleteExpense\(\)\}/g) ?? [];
    assert.equal(confirmClicks.length, 2, "both personal and group confirm Delete buttons must call confirmDeleteExpense");
    const busyLabels = dashboard.match(/deletingExpenseBusy \? DELETE_FEEDBACK\.deleting : "Delete"/g) ?? [];
    assert.equal(busyLabels.length, 2);
  });

  it("runDeleteAction sets Deleting immediately and stays deleting until the persistence promise resolves", async () => {
    const states = [];
    let release;
    const deferred = new Promise((resolve) => {
      release = resolve;
    });

    const pending = runDeleteAction({
      setDeleting: (deleting) => {
        states.push(deleting);
      },
      silentFailure: true,
      action: async () => {
        assert.deepEqual(states, [true]);
        await deferred;
      },
    });

    assert.deepEqual(states, [true], "setDeleting(true) must run synchronously on first valid delete");
    assert.equal(states.includes(false), false, "must remain disabled/deleting until async delete resolves");

    release();
    const ok = await pending;
    assert.equal(ok, true);
    assert.deepEqual(states, [true, false]);
  });

  it("runDeleteAction restores deleting=false on failure and never removes state early", async () => {
    const states = [];
    /** @type {(reason?: unknown) => void} */
    let rejectDeferred = () => {};
    const deferred = new Promise((_, reject) => {
      rejectDeferred = reject;
    });

    const pending = runDeleteAction({
      setDeleting: (deleting) => {
        states.push(deleting);
      },
      silentFailure: true,
      action: async () => {
        assert.deepEqual(states, [true]);
        await deferred;
      },
    });

    assert.deepEqual(states, [true]);
    rejectDeferred(new Error("cloud delete failed"));
    const ok = await pending;
    assert.equal(ok, false);
    assert.deepEqual(states, [true, false]);
  });

  it("does not use a fake timeout to simulate Deleting", () => {
    const feedback = readSrc("src/lib/ux/delete-feedback.ts");
    assert.doesNotMatch(feedback, /setTimeout\(/);
  });
});

describe("delete persistence path unchanged and success-only UI removal", () => {
  it("still awaits existing soft-delete helpers before filtering local expenses", () => {
    const dashboard = readSrc("src/components/ExpenseDashboard.tsx");
    const body = dashboard.slice(dashboard.indexOf("async function confirmDeleteExpense"));
    const softPersonal = body.indexOf("softDeleteExpenseTransactionByLocalId");
    const softGroup = body.indexOf("softDeleteGroupExpenseByLocalId");
    const filterLocal = body.indexOf("setExpenses((current) => current.filter");
    const failedToast = body.indexOf("DELETE_FEEDBACK.failed");
    const successToast = body.indexOf('toast.success("Expense deleted")');

    assert.ok(softPersonal >= 0);
    assert.ok(softGroup >= 0);
    assert.ok(filterLocal > softPersonal);
    assert.ok(filterLocal > softGroup);
    assert.ok(failedToast >= 0 && failedToast < filterLocal);
    assert.ok(successToast > filterLocal);
    assert.match(body, /if \(!ok\) \{\s*toast\.error\(DELETE_FEEDBACK\.failed\);\s*return;/);
  });

  it("preserves cloud soft-delete services (no new delete path)", () => {
    const personal = readSrc("src/services/expense-transactions-supabase.ts");
    const group = readSrc("src/services/group-expenses-supabase.ts");
    assert.match(personal, /export async function softDeleteExpenseTransactionByLocalId/);
    assert.match(group, /export async function softDeleteGroupExpenseByLocalId/);
    assert.match(personal, /deleted_at/);
    assert.match(group, /deleted_at/);
  });
});
