import { computeTrustScoreBreakdown } from "@/lib/fire-lending/trust-score";
import type { FireLendingParty } from "@/lib/fire-lending/types";
import type { P2PMemberSearchHit } from "@/lib/fire-lending/p2p-member-types";

/** Map local/demo lending parties into safe search hits (no mobile / notes). */
export function partyToP2PSearchHit(party: FireLendingParty): P2PMemberSearchHit {
  const breakdown = computeTrustScoreBreakdown(party);
  return {
    fireNepalId: party.fireNepalId,
    displayName: party.name,
    avatarUrl: party.photoUrl ?? null,
    verificationStatus: party.verified || party.identityVerified ? "verified" : "unverified",
    trustScore: breakdown.score,
    trustLabel: breakdown.label,
    completedLoans: party.loansCompleted,
    onTimeRepaymentPct: breakdown.onTimeRepaymentPct,
    onTimePayments: party.onTimePayments,
    latePayments: party.latePayments,
    activeLoanCount: 0,
  };
}
