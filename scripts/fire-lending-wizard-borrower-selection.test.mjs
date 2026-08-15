/**
 * Loan wizard borrower-selection state helpers.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  canContinueBorrowerStep,
  isExactFireNepalIdMatch,
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
    assert.equal(canContinueBorrowerStep("party_abc"), true);
  });

  it("detects exact FIRE Nepal ID matches ignoring dashes/case", () => {
    assert.equal(isExactFireNepalIdMatch("FN-2026-000016", "FN-2026-000016"), true);
    assert.equal(isExactFireNepalIdMatch("fn2026000016", "FN-2026-000016"), true);
    assert.equal(isExactFireNepalIdMatch("FN-2026", "FN-2026-000016"), false);
    assert.equal(isExactFireNepalIdMatch("000016", "FN-2026-000016"), false);
  });

  it("auto-selects a single exact FIRE ID hit", () => {
    const hit = shouldAutoSelectSearchHit("FN-2026-000016", [tejesh]);
    assert.ok(hit);
    assert.equal(hit.fireNepalId, "FN-2026-000016");
  });

  it("does not auto-select partial multi or ambiguous results", () => {
    assert.equal(shouldAutoSelectSearchHit("FN-2026", [tejesh]), null);
    assert.equal(
      shouldAutoSelectSearchHit("FN-2026-000016", [tejesh, { ...tejesh, fireNepalId: "FN-2026-000017", displayName: "Other" }]),
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
});
