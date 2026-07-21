import { trustLabel } from "@/lib/fire-lending/trust-score";
import type { FireLendingParty } from "@/lib/fire-lending/types";
import { deriveCanonicalMembership } from "@/lib/membership/canonical";

/** Public borrower card fields returned from user_profiles search. */
export type BorrowerMemberProfile = {
  id: string;
  fireNepalId: string;
  fullName: string;
  avatarUrl: string | null;
  country: string;
  verified: boolean;
  trustScore: number;
  trustLabel: string;
  memberSince: string | null;
  activeLoans: number;
  onTimeRepaymentPct: number;
  riskLevel: "Low" | "Medium" | "High" | "Critical";
  membershipPlan: string;
};

export type UserProfileSearchRow = {
  id: string;
  fire_nepal_id: string | null;
  full_name: string | null;
  avatar_url: string | null;
  country: string | null;
  country_of_work: string | null;
  membership_plan: string | null;
  membership_start: string | null;
  membership_expiry: string | null;
  membership_suspended_at?: string | null;
  membership_archived_at?: string | null;
  risk_profile: string | null;
  created_at?: string | null;
};

function planTrustBase(plan: string): number {
  const p = plan.toLowerCase();
  if (p === "elite") return 90;
  if (p === "premium") return 78;
  return 58;
}

function riskFromProfileAndTrust(
  riskProfile: string | null | undefined,
  trustScore: number,
): BorrowerMemberProfile["riskLevel"] {
  const rp = (riskProfile ?? "").toLowerCase();
  if (rp === "aggressive" || trustScore < 40) return "Critical";
  if (rp === "growth" || trustScore < 55) return "High";
  if (rp === "balanced" || trustScore < 70) return "Medium";
  return "Low";
}

/** Map a user_profiles row into a borrower search card model. */
export function mapUserProfileToBorrowerMember(
  row: UserProfileSearchRow,
  activeLoans = 0,
): BorrowerMemberProfile | null {
  const fireNepalId = row.fire_nepal_id?.trim() ?? "";
  if (!fireNepalId) return null;

  const canonical = deriveCanonicalMembership(
    {
      id: row.id,
      membership_plan: row.membership_plan,
      membership_start: row.membership_start,
      membership_expiry: row.membership_expiry,
      membership_suspended_at: row.membership_suspended_at ?? null,
      membership_archived_at: row.membership_archived_at ?? null,
    },
    row.id,
  );

  const verified =
    canonical.status === "active" ||
    canonical.status === "expiring_soon" ||
    (canonical.plan !== "free" && canonical.status !== "suspended" && canonical.status !== "archived");

  let trustScore = planTrustBase(canonical.plan);
  if (verified) trustScore += 6;
  if ((row.risk_profile ?? "").toLowerCase() === "conservative") trustScore += 4;
  if ((row.risk_profile ?? "").toLowerCase() === "aggressive") trustScore -= 8;
  trustScore = Math.max(15, Math.min(100, trustScore));

  const onTimeRepaymentPct = Math.max(
    40,
    Math.min(100, Math.round(52 + trustScore * 0.48)),
  );

  const fullName = row.full_name?.trim() || "FIRE Nepal Member";
  const country = (row.country || row.country_of_work || "").trim() || "—";

  return {
    id: row.id,
    fireNepalId,
    fullName,
    avatarUrl: row.avatar_url,
    country,
    verified,
    trustScore,
    trustLabel: trustLabel(trustScore),
    memberSince: row.membership_start || row.created_at || null,
    activeLoans: Math.max(0, activeLoans),
    onTimeRepaymentPct,
    riskLevel: riskFromProfileAndTrust(row.risk_profile, trustScore),
    membershipPlan: canonical.plan,
  };
}

/** Convert a connected borrower member into a local lending party record. */
export function borrowerMemberToParty(member: BorrowerMemberProfile): FireLendingParty {
  const onTime = Math.round(member.onTimeRepaymentPct / 10);
  const late = Math.max(0, 10 - onTime);
  return {
    id: member.id,
    fireNepalId: member.fireNepalId,
    name: member.fullName,
    mobile: "",
    photoUrl: member.avatarUrl ?? undefined,
    trustScore: member.trustScore,
    verified: member.verified,
    rolePreference: "borrower",
    onTimePayments: onTime,
    latePayments: late,
    loansCompleted: member.activeLoans,
    identityVerified: member.verified,
    notes: `Connected via FIRE Nepal ID ${member.fireNepalId}`,
  };
}

/** Filter helper used by mutual A↔B search verification tests. */
export function filterMembersExcludingSelf(
  rows: UserProfileSearchRow[],
  query: string,
  excludeUserId: string,
): UserProfileSearchRow[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  return rows.filter((row) => {
    if (row.id === excludeUserId) return false;
    const id = row.fire_nepal_id?.toLowerCase() ?? "";
    const name = row.full_name?.toLowerCase() ?? "";
    return id.includes(q) || name.includes(q);
  });
}
