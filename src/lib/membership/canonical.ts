import type { FireMembershipTier } from "@/lib/fire-membership";
import {
  computeMembershipExpiryStatus,
  type MembershipExpiryStatus,
} from "@/lib/membership-expiry-status";

/** Lifecycle status for admin badges and gates (derived from user_profiles only). */
export type MembershipLifecycleStatus =
  | "free"
  | "active"
  | "expiring_soon"
  | "expired"
  | "suspended"
  | "archived";

/** Canonical membership snapshot — the only shape pages should display. */
export type CanonicalMembership = {
  userId: string;
  /** Stored plan column on public.user_profiles (display source of truth). */
  plan: FireMembershipTier;
  membershipStart: string | null;
  membershipExpiry: string | null;
  suspendedAt: string | null;
  archivedAt: string | null;
  /**
   * Plan used for feature gates / AI quotas.
   * Free when suspended, archived, or expired — otherwise equals `plan`.
   */
  accessPlan: FireMembershipTier;
  status: MembershipLifecycleStatus;
  expiryStatus: MembershipExpiryStatus;
  daysRemaining: number;
};

export type UserProfilesMembershipRow = {
  id: string;
  membership_plan: string | null;
  membership_start: string | null;
  membership_expiry: string | null;
  membership_suspended_at?: string | null;
  membership_archived_at?: string | null;
};

export function normalizeMembershipPlan(value: unknown): FireMembershipTier {
  return value === "premium" || value === "elite" ? value : "free";
}

export function deriveCanonicalMembership(
  row: UserProfilesMembershipRow | null | undefined,
  userId: string,
  now: Date = new Date(),
): CanonicalMembership {
  const plan = normalizeMembershipPlan(row?.membership_plan);
  const membershipStart = row?.membership_start ?? null;
  const membershipExpiry = row?.membership_expiry ?? null;
  const suspendedAt = row?.membership_suspended_at ?? null;
  const archivedAt = row?.membership_archived_at ?? null;
  const expiry = computeMembershipExpiryStatus(membershipExpiry, now);

  let status: MembershipLifecycleStatus;
  if (archivedAt) status = "archived";
  else if (suspendedAt) status = "suspended";
  else if (plan === "free") status = "free";
  else if (expiry.status === "expired") status = "expired";
  else if (expiry.status === "expiring_soon") status = "expiring_soon";
  else status = "active";

  const accessBlocked =
    Boolean(archivedAt) || Boolean(suspendedAt) || expiry.status === "expired" || plan === "free";

  return {
    userId,
    plan,
    membershipStart,
    membershipExpiry,
    suspendedAt,
    archivedAt,
    accessPlan: accessBlocked ? "free" : plan,
    status,
    expiryStatus: expiry.status,
    daysRemaining: expiry.daysRemaining,
  };
}

/**
 * Validates that a UI-shown plan matches user_profiles SOT.
 * Logs an error on mismatch so the TEJESH-class bug cannot recur silently.
 */
export function assertDisplayedPlanMatchesCanonical(
  surface: string,
  displayedPlan: unknown,
  canonical: CanonicalMembership,
): void {
  const shown = normalizeMembershipPlan(displayedPlan);
  if (shown !== canonical.plan) {
    console.error(
      `[membership-sync] MISMATCH on ${surface}: UI shows "${shown}" but user_profiles.membership_plan is "${canonical.plan}" for user ${canonical.userId}`,
      { surface, displayedPlan: shown, canonicalPlan: canonical.plan, userId: canonical.userId, status: canonical.status },
    );
  }
}
