import type { FireLendingParty } from "@/lib/fire-lending/types";

/** Trust score 0–100 from repayment history + verification. */
export function computeTrustScore(party: Pick<
  FireLendingParty,
  "onTimePayments" | "latePayments" | "loansCompleted" | "identityVerified"
>): number {
  const totalPayments = party.onTimePayments + party.latePayments;
  const onTimeRate = totalPayments === 0 ? 0.7 : party.onTimePayments / totalPayments;
  const completionBoost = Math.min(20, party.loansCompleted * 4);
  const identityBoost = party.identityVerified ? 12 : 0;
  const latePenalty = Math.min(30, party.latePayments * 5);
  const raw = Math.round(onTimeRate * 58 + completionBoost + identityBoost + 10 - latePenalty);
  return Math.max(15, Math.min(100, raw));
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
