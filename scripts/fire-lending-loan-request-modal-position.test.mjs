/**
 * Verify Loan Request confirm / approval dialogs clear the mobile bottom nav.
 * Source-level guards keep the stacking + safe-area fix from regressing.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(rel) {
  return readFileSync(join(root, rel), "utf8");
}

describe("fire-lending loan request modal mobile positioning", () => {
  const dialog = read("src/components/fire-lending/FireLendingConfirmDialog.tsx");
  const wizard = read("src/components/fire-lending/FireLendingLoanWizard.tsx");
  const requests = read("src/components/fire-lending/FireLendingListPages.tsx");
  const detail = read("src/components/fire-lending/FireLendingLoanDetailPage.tsx");
  const nav = read("src/components/fire-lending/FireLendingMobileBottomNav.tsx");
  const shell = read("src/components/fire-lending/FireLendingModuleShell.tsx");

  it("portals the confirm dialog to document.body above the bottom nav stacking context", () => {
    assert.match(dialog, /createPortal/);
    assert.match(dialog, /document\.body/);
    assert.match(dialog, /z-\[100\]/);
    // Bottom nav is z-40; page column is z-10 — portal escapes that trap.
    assert.match(nav, /z-40/);
    assert.match(shell, /relative z-10/);
  });

  it("clears the fixed bottom nav and iOS safe-area on mobile without hardcoding px offsets only", () => {
    assert.match(
      dialog,
      /pb-\[calc\(4\.75rem\+env\(safe-area-inset-bottom,0px\)\)\]/,
    );
    assert.match(dialog, /lg:items-center/);
    assert.match(dialog, /lg:p-6/);
    assert.match(dialog, /max-h-\[min\(85dvh/);
    assert.match(dialog, /env\(safe-area-inset-bottom/);
    // Bottom nav itself still uses safe-area and remains enabled.
    assert.match(nav, /env\(safe-area-inset-bottom\)/);
    assert.match(nav, /lg:hidden/);
    assert.doesNotMatch(shell, /FireLendingMobileBottomNav\s*\/>\s*\{false\}/);
  });

  it("Loan Request send confirmation uses the shared positioned dialog", () => {
    assert.match(wizard, /FireLendingConfirmDialog/);
    assert.match(wizard, /send-loan-request-dialog/);
    assert.match(wizard, /confirm-send-loan-request/);
    assert.match(wizard, /LOAN_REQUEST_UI\.title/);
    assert.match(wizard, /LOAN_REQUEST_UI\.prompt/);
    assert.doesNotMatch(wizard, /fixed inset-0 z-\[90\]/);
  });

  it("counterparty approval modal keeps Accept and Reject on the same positioned sheet", () => {
    assert.match(requests, /loan-request-approval-dialog/);
    assert.match(requests, /confirm-accept-loan-request/);
    assert.match(requests, /confirm-reject-loan-request/);
    assert.match(detail, /loan-request-approval-dialog/);
    assert.match(detail, /confirm-accept-loan-request/);
    assert.match(detail, /confirm-reject-loan-request/);
    assert.match(dialog, /secondaryLabel/);
  });
});
