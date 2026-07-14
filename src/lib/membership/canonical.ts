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
   * Never mutates stored `plan`.
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

/** Parse plan without inventing Free. Null = missing/invalid. */
export function parseMembershipPlan(value: unknown): FireMembershipTier | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  if (normalized === "free" || normalized === "premium" || normalized === "elite") return normalized;
  return null;
}

/**
 * Normalize for write paths only.
 * Empty/null → free (new profile default). Invalid non-empty tokens throw — never silent Free.
 */
export function normalizeMembershipPlan(value: unknown): FireMembershipTier {
  const parsed = parseMembershipPlan(value);
  if (parsed) return parsed;
  if (value == null || String(value).trim() === "") return "free";
  throw new Error(`Invalid membership_plan: ${String(value)}`);
}

export function deriveCanonicalMembership(
  row: UserProfilesMembershipRow | null | undefined,
  userId: string,
  now: Date = new Date(),
): CanonicalMembership {
  // Missing row (brand-new user) may be Free. Callers must not pass null on query failure.
  const plan = parseMembershipPlan(row?.membership_plan) ?? "free";
  const membershipStart = row?.membership_start ?? null;
  const membershipExpiry = row?.membership_expiry ?? null;
  const suspendedAt = row?.membership_suspended_at ?? null;
  const archivedAt = row?.membership_archived_at ?? null;

  const hasExpiry = Boolean(membershipExpiry?.trim());
  // Paid plan with null expiry = open-ended active (never invent Expired/Free).
  const expiry = hasExpiry
    ? computeMembershipExpiryStatus(membershipExpiry, now)
    : plan === "free"
      ? { status: "expired" as const, daysRemaining: 0, isActive: false, expiryIso: null }
      : { status: "active" as const, daysRemaining: Number.POSITIVE_INFINITY, isActive: true, expiryIso: null };

  let status: MembershipLifecycleStatus;
  if (archivedAt) status = "archived";
  else if (suspendedAt) status = "suspended";
  else if (plan === "free") status = "free";
  else if (hasExpiry && expiry.status === "expired") status = "expired";
  else if (hasExpiry && expiry.status === "expiring_soon") status = "expiring_soon";
  else status = "active";

  const accessBlocked =
    Boolean(archivedAt) ||
    Boolean(suspendedAt) ||
    (hasExpiry && expiry.status === "expired") ||
    plan === "free";

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
    daysRemaining: Number.isFinite(expiry.daysRemaining) ? expiry.daysRemaining : 0,
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
  const shown = parseMembershipPlan(displayedPlan) ?? "free";
  if (shown !== canonical.plan) {
    console.error(
      `[membership-sync] MISMATCH on ${surface}: UI shows "${shown}" but user_profiles.membership_plan is "${canonical.plan}" for user ${canonical.userId}`,
      { surface, displayedPlan: shown, canonicalPlan: canonical.plan, userId: canonical.userId, status: canonical.status },
    );
  }
}

/** Refuse Free demotion of a paid plan unless explicitly allowed. */
export function assertPlanWriteAllowed(
  previousPlan: FireMembershipTier,
  nextPlan: FireMembershipTier,
  opts?: { allowDemoteToFree?: boolean; reason?: string },
): void {
  if ((previousPlan === "premium" || previousPlan === "elite") && nextPlan === "free") {
    if (!opts?.allowDemoteToFree && !opts?.reason?.trim()) {
      throw new Error("Refusing to demote paid membership to Free without an explicit admin reason.");
    }
  }
}
