/**
 * Canonical membership status from public.user_profiles.membership_expiry only.
 * Used by Dashboard, Membership Card, and Verification page.
 */

export type MembershipExpiryStatus = "active" | "expiring_soon" | "expired";

export type MembershipExpiryState = {
  status: MembershipExpiryStatus;
  /** 0 when expired or missing expiry */
  daysRemaining: number;
  isActive: boolean;
  expiryIso: string | null;
};

export function computeMembershipExpiryStatus(
  membershipExpiry: string | null | undefined,
  now: Date = new Date(),
): MembershipExpiryState {
  const expiryIso = membershipExpiry?.trim() || null;
  if (!expiryIso) {
    return { status: "expired", daysRemaining: 0, isActive: false, expiryIso: null };
  }

  const expiry = new Date(expiryIso);
  if (Number.isNaN(expiry.getTime())) {
    return { status: "expired", daysRemaining: 0, isActive: false, expiryIso };
  }

  if (expiry.getTime() <= now.getTime()) {
    return { status: "expired", daysRemaining: 0, isActive: false, expiryIso };
  }

  const daysRemaining = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (daysRemaining < 30) {
    return { status: "expiring_soon", daysRemaining, isActive: true, expiryIso };
  }

  return { status: "active", daysRemaining, isActive: true, expiryIso };
}

export function membershipExpiryTone(
  status: MembershipExpiryStatus,
): "emerald" | "amber" | "red" {
  if (status === "expired") return "red";
  if (status === "expiring_soon") return "amber";
  return "emerald";
}
