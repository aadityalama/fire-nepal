import type { TrustScoreFactor } from "@/lib/fire-lending/trust-score";

/** High-level loan posture safe for P2P discovery (no amounts / counterparties). */
export type P2PCurrentLoanStatus = "none" | "active" | "overdue" | "pending" | "settled";

export type P2PMemberVerificationStatus = "verified" | "unverified";

/**
 * Safe autocomplete / search hit — only fields approved for P2P member discovery.
 * Never include phone, email, bank, government ID, income, or private records.
 */
export type P2PMemberSearchHit = {
  fireNepalId: string;
  displayName: string;
  avatarUrl: string | null;
  verificationStatus: P2PMemberVerificationStatus;
  trustScore: number;
  trustLabel: string;
  completedLoans: number;
  onTimeRepaymentPct: number;
  onTimePayments: number;
  latePayments: number;
  activeLoanCount: number;
};

/**
 * Safe lending profile for P2P decision-making.
 * Built from approved fields only — never a raw DB / snapshot dump.
 */
export type P2PLendingProfile = {
  fireNepalId: string;
  displayName: string;
  avatarUrl: string | null;
  verificationStatus: P2PMemberVerificationStatus;
  trustScore: number;
  trustLabel: string;
  trustBreakdown: TrustScoreFactor[];
  activeLoanCount: number;
  completedLoans: number;
  repaymentPerformance: string;
  onTimeRepaymentPct: number;
  currentLoanStatus: P2PCurrentLoanStatus;
  lendingHistorySummary: string;
  memberSince: string | null;
  publicLendingInfo: {
    membershipPlan: string | null;
    countryOfWork: string | null;
    preferredCurrency: string | null;
    rolePreference: "lender" | "borrower" | "both" | null;
  };
};

export type P2PMemberSearchResponse = {
  ok: true;
  query: string;
  matches: P2PMemberSearchHit[];
  matchState: "empty_query" | "no_results" | "single" | "multiple";
};

export type P2PLendingProfileResponse =
  | { ok: true; profile: P2PLendingProfile }
  | { ok: false; error: string; code?: "not_found" | "unauthorized" | "forbidden" | "rate_limited" };
