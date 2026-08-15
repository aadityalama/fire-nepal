/**
 * P2P member search / lending profile — privacy, matching, trust score wiring.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildP2PLendingProfile,
  buildP2PMemberSearchHit,
  extractPublicLendingMetricsFromStore,
  isEligibleP2PDiscoveryMember,
  memberMatchesP2PQuery,
  matchStateForHits,
  normalizeP2PSearchQuery,
} from "../src/lib/fire-lending/p2p-member-profile.ts";
import {
  assertNoForbiddenP2PFields,
  isP2PDiscoveryAuthorized,
  P2P_MEMBER_FORBIDDEN_FIELDS,
} from "../src/lib/fire-lending/p2p-member-privacy.ts";
import { computeTrustScore, computeTrustScoreBreakdown } from "../src/lib/fire-lending/trust-score.ts";

const verifiedRow = {
  id: "u1",
  fire_nepal_id: "FN-2026-000016",
  full_name: "Raj Kumar G.",
  display_name: "Raj",
  avatar_url: null,
  membership_plan: "elite",
  membership_start: "2026-01-01",
  membership_expiry: null,
  membership_suspended_at: null,
  membership_archived_at: null,
  country_of_work: "Korea",
  preferred_currency: "KRW",
  created_at: "2026-01-15T00:00:00.000Z",
};

describe("P2P member search matching", () => {
  it("matches exact and partial FIRE Nepal ID and name", () => {
    const candidate = { fireNepalId: "FN-2026-000016", displayName: "Raj Kumar G." };
    assert.equal(memberMatchesP2PQuery("FN-2026-000016", candidate), true);
    assert.equal(memberMatchesP2PQuery("000016", candidate), true);
    assert.equal(memberMatchesP2PQuery("FN-2026", candidate), true);
    assert.equal(memberMatchesP2PQuery("Raj Kumar G.", candidate), true);
    assert.equal(memberMatchesP2PQuery("raj", candidate), true);
    assert.equal(memberMatchesP2PQuery("kumar", candidate), true);
    assert.equal(memberMatchesP2PQuery("x", candidate), false);
    assert.equal(memberMatchesP2PQuery("nope", candidate), false);
  });

  it("normalizes query whitespace", () => {
    assert.equal(normalizeP2PSearchQuery("  Raj   Kumar  "), "Raj Kumar");
  });

  it("reports match states", () => {
    assert.equal(matchStateForHits("a", 0), "empty_query");
    assert.equal(matchStateForHits("raj", 0), "no_results");
    assert.equal(matchStateForHits("raj", 1), "single");
    assert.equal(matchStateForHits("raj", 3), "multiple");
  });
});

describe("P2P privacy gates", () => {
  it("allows authenticated discovery and blocks anonymous", () => {
    assert.equal(isP2PDiscoveryAuthorized({ authenticated: true }), true);
    assert.equal(isP2PDiscoveryAuthorized({ authenticated: false }), false);
    assert.equal(isP2PDiscoveryAuthorized({ authenticated: true, suspended: true }), false);
  });

  it("builds safe search hits without forbidden fields", () => {
    const metrics = {
      onTimePayments: 24,
      latePayments: 1,
      loansCompleted: 8,
      identityVerified: true,
      activeLoanCount: 1,
      currentLoanStatus: "active",
      rolePreference: "both",
    };
    const hit = buildP2PMemberSearchHit(verifiedRow, metrics);
    assert.equal(hit.fireNepalId, "FN-2026-000016");
    assert.equal(hit.displayName, "Raj Kumar G.");
    assert.equal(hit.verificationStatus, "verified");
    assert.equal(hit.completedLoans, 8);
    assert.equal(hit.trustScore, computeTrustScore(metrics));
    for (const key of P2P_MEMBER_FORBIDDEN_FIELDS) {
      assert.equal(Object.prototype.hasOwnProperty.call(hit, key), false, `forbidden ${key}`);
    }
    assert.doesNotThrow(() => assertNoForbiddenP2PFields(hit, "hit"));
  });

  it("builds safe lending profiles with trust breakdown from calculator", () => {
    const metrics = {
      onTimePayments: 24,
      latePayments: 1,
      loansCompleted: 8,
      identityVerified: true,
      activeLoanCount: 1,
      currentLoanStatus: "active",
      rolePreference: "borrower",
    };
    const profile = buildP2PLendingProfile(verifiedRow, metrics);
    const breakdown = computeTrustScoreBreakdown(metrics);
    assert.equal(profile.trustScore, breakdown.score);
    assert.equal(profile.onTimeRepaymentPct, breakdown.onTimeRepaymentPct);
    assert.ok(profile.trustBreakdown.length >= 4);
    assert.equal(Object.prototype.hasOwnProperty.call(profile, "email"), false);
    assert.equal(Object.prototype.hasOwnProperty.call(profile, "phone"), false);
    assert.equal(Object.prototype.hasOwnProperty.call(profile, "mobile"), false);
  });

  it("excludes suspended members from discovery", () => {
    assert.equal(
      isEligibleP2PDiscoveryMember({
        ...verifiedRow,
        membership_suspended_at: "2026-02-01T00:00:00.000Z",
      }),
      false,
    );
  });
});

describe("lending metrics extraction", () => {
  it("never returns private loan amounts from snapshots", () => {
    const metrics = extractPublicLendingMetricsFromStore(
      {
        currentUserId: "me",
        parties: [
          {
            id: "me",
            onTimePayments: 10,
            latePayments: 0,
            loansCompleted: 3,
            identityVerified: true,
            mobile: "9800000000",
            notes: "secret",
            rolePreference: "both",
          },
        ],
        loans: [
          { status: "active", amount: 999999, counterpartyId: "x" },
          { status: "settled", amount: 50000 },
        ],
      },
      true,
    );
    assert.equal(metrics.activeLoanCount, 1);
    assert.equal(metrics.loansCompleted, 3);
    assert.equal(metrics.currentLoanStatus, "active");
    assert.equal(Object.prototype.hasOwnProperty.call(metrics, "amount"), false);
    assert.equal(Object.prototype.hasOwnProperty.call(metrics, "mobile"), false);
    assert.equal(Object.prototype.hasOwnProperty.call(metrics, "notes"), false);
  });
});
