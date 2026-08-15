import type { FireLendingParty } from "@/lib/fire-lending/types";

export type TrustScoreInputs = Pick<
  FireLendingParty,
  "onTimePayments" | "latePayments" | "loansCompleted" | "identityVerified"
>;

export type TrustScoreFactor = {
  key: "on_time_repayment" | "completed_loans" | "identity_verification" | "late_penalty" | "base";
  label: string;
  points: number;
  detail: string;
};

export type TrustScoreBreakdown = {
  score: number;
  label: string;
  onTimeRepaymentPct: number;
  factors: TrustScoreFactor[];
};

function trustInputs(party: TrustScoreInputs) {
  const totalPayments = party.onTimePayments + party.latePayments;
  const onTimeRate = totalPayments === 0 ? 0.7 : party.onTimePayments / totalPayments;
  const onTimeContribution = Math.round(onTimeRate * 58);
  const completionBoost = Math.min(20, party.loansCompleted * 4);
  const identityBoost = party.identityVerified ? 12 : 0;
  const latePenalty = Math.min(30, party.latePayments * 5);
  const base = 10;
  return { totalPayments, onTimeRate, onTimeContribution, completionBoost, identityBoost, latePenalty, base };
}

/** Trust score 0–100 from repayment history + verification. */
export function computeTrustScore(party: TrustScoreInputs): number {
  const { onTimeContribution, completionBoost, identityBoost, latePenalty, base } = trustInputs(party);
  const raw = onTimeContribution + completionBoost + identityBoost + base - latePenalty;
  return Math.max(15, Math.min(100, raw));
}

/** Same formula as computeTrustScore — exposes key factors for P2P lending decisions. */
export function computeTrustScoreBreakdown(party: TrustScoreInputs): TrustScoreBreakdown {
  const { totalPayments, onTimeRate, onTimeContribution, completionBoost, identityBoost, latePenalty, base } =
    trustInputs(party);
  const score = computeTrustScore(party);
  const onTimeRepaymentPct =
    totalPayments === 0 ? 0 : Math.round((party.onTimePayments / totalPayments) * 100);

  return {
    score,
    label: trustLabel(score),
    onTimeRepaymentPct,
    factors: [
      {
        key: "on_time_repayment",
        label: "On-time repayment",
        points: onTimeContribution,
        detail:
          totalPayments === 0
            ? "No payment history yet (neutral baseline)"
            : `${onTimeRepaymentPct}% on-time (${party.onTimePayments}/${totalPayments})`,
      },
      {
        key: "completed_loans",
        label: "Completed loans",
        points: completionBoost,
        detail: `${party.loansCompleted} completed · +${completionBoost} pts`,
      },
      {
        key: "identity_verification",
        label: "Identity verification",
        points: identityBoost,
        detail: party.identityVerified ? "Verified member" : "Not verified",
      },
      {
        key: "late_penalty",
        label: "Late payment penalty",
        points: -latePenalty,
        detail: `${party.latePayments} late · −${latePenalty} pts`,
      },
      {
        key: "base",
        label: "Base score",
        points: base,
        detail: "Marketplace baseline",
      },
    ],
  };
}

export function trustLabel(score: number): string {
  if (score >= 85) return "Excellent";
  if (score >= 70) return "Strong";
  if (score >= 55) return "Fair";
  if (score >= 40) return "Watch";
  return "High Risk";
}

export function riskFromTrust(trustScore: number, overdueCount: number): number {
  const base = 100 - trustScore;
  return Math.max(5, Math.min(95, base + overdueCount * 8));
}
