/**
 * Loan wizard borrower-selection + Continue step-transition helpers.
 * Fixture: FN-2026-000016 / TEJESH GHALAN
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  advanceWizardStep,
  canContinueBorrowerStep,
  isExactFireNepalIdMatch,
  resolveBorrowerContinue,
  shouldAutoSelectSearchHit,
  shouldKeepBorrowerSelection,
} from "../src/lib/fire-lending/wizard-borrower-selection.ts";

const tejesh = {
  fireNepalId: "FN-2026-000016",
  displayName: "TEJESH GHALAN",
  avatarUrl: null,
  verificationStatus: "verified",
  trustScore: 63,
  trustLabel: "Fair",
  completedLoans: 0,
  onTimeRepaymentPct: 0,
  onTimePayments: 0,
  latePayments: 0,
  activeLoanCount: 0,
};

describe("wizard borrower selection", () => {
  it("enables Continue only when counterpartyId is committed", () => {
    assert.equal(canContinueBorrowerStep(""), false);
    assert.equal(canContinueBorrowerStep("   "), false);
    assert.equal(canContinueBorrowerStep(null), false);
    assert.equal(canContinueBorrowerStep(undefined), false);
    assert.equal(canContinueBorrowerStep("party_tejesh"), true);
  });

  it("detects exact FIRE Nepal ID matches ignoring dashes/case", () => {
    assert.equal(isExactFireNepalIdMatch("FN-2026-000016", "FN-2026-000016"), true);
    assert.equal(isExactFireNepalIdMatch("fn2026000016", "FN-2026-000016"), true);
    assert.equal(isExactFireNepalIdMatch("FN-2026", "FN-2026-000016"), false);
    assert.equal(isExactFireNepalIdMatch("000016", "FN-2026-000016"), false);
  });

  it("auto-selects a single exact FIRE ID hit for FN-2026-000016", () => {
    const hit = shouldAutoSelectSearchHit("FN-2026-000016", [tejesh]);
    assert.ok(hit);
    assert.equal(hit.fireNepalId, "FN-2026-000016");
  });

  it("does not auto-select partial multi or ambiguous results", () => {
    assert.equal(shouldAutoSelectSearchHit("FN-2026", [tejesh]), null);
    assert.equal(
      shouldAutoSelectSearchHit("FN-2026-000016", [
        tejesh,
        { ...tejesh, fireNepalId: "FN-2026-000017", displayName: "Other" },
      ]),
      null,
    );
  });

  it("keeps selection while typing the same FIRE ID, clears for a different member query", () => {
    assert.equal(
      shouldKeepBorrowerSelection({
        query: "FN-2026-000016",
        selectedFireNepalId: "FN-2026-000016",
        selectedDisplayName: "TEJESH GHALAN",
      }),
      true,
    );
    assert.equal(
      shouldKeepBorrowerSelection({
        query: "FN-2026-00001",
        selectedFireNepalId: "FN-2026-000016",
        selectedDisplayName: "TEJESH GHALAN",
      }),
      true,
    );
    assert.equal(
      shouldKeepBorrowerSelection({
        query: "Anjali",
        selectedFireNepalId: "FN-2026-000016",
        selectedDisplayName: "TEJESH GHALAN",
      }),
      false,
    );
  });

  it("Continue with FN-2026-000016 committed advances Borrower → Details", () => {
    const blocked = resolveBorrowerContinue({ counterpartyId: "", partyExists: false });
    assert.equal(blocked.nextStep, null);
    assert.match(blocked.error ?? "", /Select a verified borrower/);

    const ok = resolveBorrowerContinue({ counterpartyId: "party_tejesh", partyExists: true });
    assert.equal(ok.nextStep, 1);
    assert.equal(ok.error, null);
  });

  it("navigates full wizard: Details → Agreement → Approval → Signatures for TEJESH loan", () => {
    let step = 0;
    let error = null;

    ({ step, error } = advanceWizardStep({ step, counterpartyId: "party_tejesh", partyExists: true }));
    assert.equal(error, null);
    assert.equal(step, 1); // Details

    ({ step, error } = advanceWizardStep({
      step,
      counterpartyId: "party_tejesh",
      amount: "150000",
      purpose: "Peer lending",
    }));
    assert.equal(error, null);
    assert.equal(step, 2); // Agreement

    ({ step, error } = advanceWizardStep({ step }));
    assert.equal(error, null);
    assert.equal(step, 3); // Approval

    ({ step, error } = advanceWizardStep({ step, requestSent: false, approval: "pending" }));
    assert.equal(step, 3);
    assert.match(error ?? "", /Send the loan request/);

    ({ step, error } = advanceWizardStep({ step, requestSent: true, approval: "pending" }));
    assert.equal(step, 3);
    assert.match(error ?? "", /Waiting for the borrower/);

    ({ step, error } = advanceWizardStep({ step, requestSent: true, approval: "accepted" }));
    assert.equal(error, null);
    assert.equal(step, 4); // Signatures
  });
});
