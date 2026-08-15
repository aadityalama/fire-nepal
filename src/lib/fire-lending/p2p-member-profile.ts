import { deriveCanonicalMembership } from "@/lib/membership/canonical";
import {
  computeTrustScore,
  computeTrustScoreBreakdown,
  type TrustScoreInputs,
} from "@/lib/fire-lending/trust-score";
import type {
  P2PCurrentLoanStatus,
  P2PLendingProfile,
  P2PMemberSearchHit,
  P2PMemberVerificationStatus,
} from "@/lib/fire-lending/p2p-member-types";
import { assertNoForbiddenP2PFields } from "@/lib/fire-lending/p2p-member-privacy";

export type P2PProfileSourceRow = {
  id: string;
  fire_nepal_id: string | null;
  full_name: string | null;
  display_name: string | null;
  avatar_url: string | null;
  membership_plan: string | null;
  membership_start: string | null;
  membership_expiry: string | null;
  membership_suspended_at: string | null;
  membership_archived_at: string | null;
  country_of_work: string | null;
  preferred_currency: string | null;
  created_at: string | null;
};

export type P2PLendingMetrics = TrustScoreInputs & {
  activeLoanCount: number;
  currentLoanStatus: P2PCurrentLoanStatus;
  rolePreference: "lender" | "borrower" | "both" | null;
};

const MIN_QUERY_LEN = 2;
const MAX_QUERY_LEN = 64;
const FIRE_ID_PATTERN = /^FN-?\d{0,4}-?\d{0,6}$/i;

export function normalizeP2PSearchQuery(raw: string): string {
  return raw.trim().replace(/\s+/g, " ").slice(0, MAX_QUERY_LEN);
}

export function isP2PSearchQueryReady(query: string): boolean {
  return normalizeP2PSearchQuery(query).length >= MIN_QUERY_LEN;
}

/** Match FIRE Nepal ID (exact / partial) and member name (exact / partial). */
export function memberMatchesP2PQuery(
  query: string,
  candidate: { fireNepalId: string; displayName: string },
): boolean {
  const q = normalizeP2PSearchQuery(query).toLowerCase();
  if (q.length < MIN_QUERY_LEN) return false;

  const id = candidate.fireNepalId.trim().toLowerCase();
  const name = candidate.displayName.trim().toLowerCase();
  const idCompact = id.replace(/[^a-z0-9]/gi, "");
  const qCompact = q.replace(/[^a-z0-9]/gi, "");

  if (id === q || name === q) return true;
  if (id.includes(q) || name.includes(q)) return true;
  if (qCompact.length >= MIN_QUERY_LEN && idCompact.includes(qCompact)) return true;
  return false;
}

export function looksLikeFireNepalIdQuery(query: string): boolean {
  const q = normalizeP2PSearchQuery(query);
  return FIRE_ID_PATTERN.test(q) || /^fn/i.test(q);
}

export function resolveDisplayName(row: Pick<P2PProfileSourceRow, "full_name" | "display_name">): string {
  const full = row.full_name?.trim() ?? "";
  if (full) return full;
  return row.display_name?.trim() ?? "";
}

export function resolveVerificationStatus(row: P2PProfileSourceRow): P2PMemberVerificationStatus {
  if (row.membership_suspended_at || row.membership_archived_at) return "unverified";
  const canonical = deriveCanonicalMembership(
    {
      id: row.id,
      membership_plan: row.membership_plan,
      membership_start: row.membership_start,
      membership_expiry: row.membership_expiry,
      membership_suspended_at: row.membership_suspended_at,
      membership_archived_at: row.membership_archived_at,
    },
    row.id,
  );
  if (canonical.status === "active" || canonical.status === "expiring_soon") return "verified";
  // Paid open-ended or free with FIRE ID still counts as identity-present for lending when not expired.
  if (canonical.accessPlan !== "free" && canonical.status !== "expired") return "verified";
  return "unverified";
}

export function isEligibleP2PDiscoveryMember(row: P2PProfileSourceRow): boolean {
  if (!row.fire_nepal_id?.trim()) return false;
  if (!resolveDisplayName(row)) return false;
  if (row.membership_suspended_at || row.membership_archived_at) return false;
  return resolveVerificationStatus(row) === "verified";
}

export function emptyLendingMetrics(identityVerified: boolean): P2PLendingMetrics {
  return {
    onTimePayments: 0,
    latePayments: 0,
    loansCompleted: 0,
    identityVerified,
    activeLoanCount: 0,
    currentLoanStatus: "none",
    rolePreference: null,
  };
}

/**
 * Extract ONLY public lending metrics from a fire_lending module snapshot.
 * Never returns loan amounts, counterparties, notes, mobile, or raw parties.
 */
export function extractPublicLendingMetricsFromStore(
  state: unknown,
  identityVerifiedFallback: boolean,
): P2PLendingMetrics {
  if (!state || typeof state !== "object") {
    return emptyLendingMetrics(identityVerifiedFallback);
  }
  const store = state as {
    currentUserId?: unknown;
    parties?: unknown;
    loans?: unknown;
  };

  const parties = Array.isArray(store.parties) ? store.parties : [];
  const currentUserId = typeof store.currentUserId === "string" ? store.currentUserId : "";
  const me = parties.find((p) => p && typeof p === "object" && (p as { id?: string }).id === currentUserId) as
    | {
        onTimePayments?: unknown;
        latePayments?: unknown;
        loansCompleted?: unknown;
        identityVerified?: unknown;
        rolePreference?: unknown;
      }
    | undefined;

  const onTimePayments = Math.max(0, Number(me?.onTimePayments) || 0);
  const latePayments = Math.max(0, Number(me?.latePayments) || 0);
  const loansCompleted = Math.max(0, Number(me?.loansCompleted) || 0);
  const identityVerified =
    typeof me?.identityVerified === "boolean" ? me.identityVerified : identityVerifiedFallback;

  const rolePreference =
    me?.rolePreference === "lender" || me?.rolePreference === "borrower" || me?.rolePreference === "both"
      ? me.rolePreference
      : null;

  const loans = Array.isArray(store.loans) ? store.loans : [];
  let activeLoanCount = 0;
  let hasOverdue = false;
  let hasPending = false;
  let hasSettled = false;

  for (const loan of loans) {
    if (!loan || typeof loan !== "object") continue;
    const status = String((loan as { status?: unknown }).status ?? "");
    if (status === "active") activeLoanCount += 1;
    if (status === "overdue") {
      activeLoanCount += 1;
      hasOverdue = true;
    }
    if (status === "pending_approval" || status === "pending_signature" || status === "draft") {
      hasPending = true;
    }
    if (status === "settled" || status === "completed") hasSettled = true;
  }

  // Prefer completed count from party; fall back to loan statuses if party is empty.
  const completedFromLoans = loans.filter((loan) => {
    if (!loan || typeof loan !== "object") return false;
    const status = String((loan as { status?: unknown }).status ?? "");
    return status === "completed" || status === "settled";
  }).length;

  const currentLoanStatus: P2PCurrentLoanStatus = hasOverdue
    ? "overdue"
    : activeLoanCount > 0
      ? "active"
      : hasPending
        ? "pending"
        : hasSettled
          ? "settled"
          : "none";

  return {
    onTimePayments,
    latePayments,
    loansCompleted: loansCompleted > 0 ? loansCompleted : completedFromLoans,
    identityVerified,
    activeLoanCount,
    currentLoanStatus,
    rolePreference,
  };
}

function repaymentPerformanceLabel(metrics: P2PLendingMetrics, onTimePct: number): string {
  const total = metrics.onTimePayments + metrics.latePayments;
  if (total === 0) return "No repayment history yet";
  if (onTimePct >= 95) return "Excellent repayment discipline";
  if (onTimePct >= 80) return "Strong repayment performance";
  if (onTimePct >= 60) return "Mixed repayment performance";
  return "Needs attention on repayments";
}

function lendingHistorySummary(metrics: P2PLendingMetrics): string {
  const parts = [
    `${metrics.loansCompleted} completed`,
    `${metrics.activeLoanCount} active`,
    `${metrics.onTimePayments} on-time payments`,
  ];
  if (metrics.latePayments > 0) parts.push(`${metrics.latePayments} late`);
  return parts.join(" · ");
}

export function buildP2PMemberSearchHit(
  row: P2PProfileSourceRow,
  metrics: P2PLendingMetrics,
): P2PMemberSearchHit {
  const breakdown = computeTrustScoreBreakdown(metrics);
  const hit: P2PMemberSearchHit = {
    fireNepalId: row.fire_nepal_id!.trim(),
    displayName: resolveDisplayName(row),
    avatarUrl: row.avatar_url?.trim() || null,
    verificationStatus: resolveVerificationStatus(row),
    trustScore: breakdown.score,
    trustLabel: breakdown.label,
    completedLoans: metrics.loansCompleted,
    onTimeRepaymentPct: breakdown.onTimeRepaymentPct,
    onTimePayments: metrics.onTimePayments,
    latePayments: metrics.latePayments,
    activeLoanCount: metrics.activeLoanCount,
  };
  assertNoForbiddenP2PFields(hit as unknown as Record<string, unknown>, "search-hit");
  return hit;
}

export function buildP2PLendingProfile(
  row: P2PProfileSourceRow,
  metrics: P2PLendingMetrics,
): P2PLendingProfile {
  const breakdown = computeTrustScoreBreakdown(metrics);
  // Ensure score always comes from the verified calculator (never trust a stored client number alone).
  const score = computeTrustScore(metrics);
  const profile: P2PLendingProfile = {
    fireNepalId: row.fire_nepal_id!.trim(),
    displayName: resolveDisplayName(row),
    avatarUrl: row.avatar_url?.trim() || null,
    verificationStatus: resolveVerificationStatus(row),
    trustScore: score,
    trustLabel: breakdown.label,
    trustBreakdown: breakdown.factors,
    activeLoanCount: metrics.activeLoanCount,
    completedLoans: metrics.loansCompleted,
    repaymentPerformance: repaymentPerformanceLabel(metrics, breakdown.onTimeRepaymentPct),
    onTimeRepaymentPct: breakdown.onTimeRepaymentPct,
    currentLoanStatus: metrics.currentLoanStatus,
    lendingHistorySummary: lendingHistorySummary(metrics),
    memberSince: row.created_at ?? row.membership_start ?? null,
    publicLendingInfo: {
      membershipPlan: row.membership_plan,
      countryOfWork: row.country_of_work,
      preferredCurrency: row.preferred_currency,
      rolePreference: metrics.rolePreference,
    },
  };
  assertNoForbiddenP2PFields(profile as unknown as Record<string, unknown>, "lending-profile");
  assertNoForbiddenP2PFields(
    profile.publicLendingInfo as unknown as Record<string, unknown>,
    "lending-profile.publicLendingInfo",
  );
  return profile;
}

export function rankP2PSearchHits(query: string, hits: P2PMemberSearchHit[]): P2PMemberSearchHit[] {
  const q = normalizeP2PSearchQuery(query).toLowerCase();
  const qCompact = q.replace(/[^a-z0-9]/gi, "");
  return [...hits].sort((a, b) => {
    const score = (h: P2PMemberSearchHit) => {
      const id = h.fireNepalId.toLowerCase();
      const name = h.displayName.toLowerCase();
      if (id === q || name === q) return 0;
      if (id.startsWith(q) || name.startsWith(q)) return 1;
      if (id.replace(/[^a-z0-9]/gi, "").startsWith(qCompact)) return 2;
      return 3;
    };
    const d = score(a) - score(b);
    if (d !== 0) return d;
    return b.trustScore - a.trustScore;
  });
}

export function matchStateForHits(query: string, count: number): "empty_query" | "no_results" | "single" | "multiple" {
  if (!isP2PSearchQueryReady(query)) return "empty_query";
  if (count === 0) return "no_results";
  if (count === 1) return "single";
  return "multiple";
}
