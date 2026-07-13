import type { FireMembershipTier } from "@/lib/fire-membership";
import { formatPremiumPhoneDisplay } from "@/lib/fire-premium-profile";
import type { Database } from "@/types/supabase-database";

export type UserProfileRow = Database["public"]["Tables"]["user_profiles"]["Row"];

export type MemberCardStatus = "active" | "expiring_soon" | "expired";

export type MemberCardData = {
  fullName: string;
  fireNepalId: string;
  avatarUrl: string | null;
  membershipPlan: FireMembershipTier;
  membershipStart: string | null;
  membershipExpiry: string | null;
  country: string | null;
  countryOfWork: string | null;
  preferredCurrency: string | null;
  phone: string | null;
  email: string | null;
};

export type PublicMemberVerification = {
  found: boolean;
  fullName?: string | null;
  avatarUrl?: string | null;
  fireNepalId?: string | null;
  membershipPlan?: FireMembershipTier | null;
  membershipStart?: string | null;
  membershipExpiry?: string | null;
  countryOfWork?: string | null;
  preferredCurrency?: string | null;
  status?: MemberCardStatus;
};

const PLANS = new Set<FireMembershipTier>(["free", "premium", "elite"]);

function planOrFree(value: string | null | undefined): FireMembershipTier {
  return PLANS.has(value as FireMembershipTier) ? (value as FireMembershipTier) : "free";
}

export function mapUserProfileRowToMemberCard(row: UserProfileRow): MemberCardData {
  const phoneFromParts =
    row.phone_national_digits && row.phone_national_digits.trim()
      ? formatPremiumPhoneDisplay(row.phone_dial_code ?? "+977", row.phone_national_digits)
      : null;

  return {
    fullName: row.full_name?.trim() ?? "",
    fireNepalId: row.fire_nepal_id?.trim() ?? "",
    avatarUrl: row.avatar_url,
    membershipPlan: planOrFree(row.membership_plan),
    membershipStart: row.membership_start,
    membershipExpiry: row.membership_expiry,
    country: row.country,
    countryOfWork: row.country_of_work,
    preferredCurrency: row.preferred_currency,
    phone: row.phone?.trim() || phoneFromParts,
    email: row.email?.trim().toLowerCase() ?? null,
  };
}

export function computeMemberCardStatus(
  membershipExpiry: string | null,
  membershipPlan: FireMembershipTier = "free",
  now: Date = new Date(),
): MemberCardStatus {
  if (membershipPlan === "free") return "active";
  if (!membershipExpiry) return "expired";
  const expiry = new Date(membershipExpiry);
  if (Number.isNaN(expiry.getTime())) return "expired";
  const days = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (days < 0) return "expired";
  if (days < 30) return "expiring_soon";
  return "active";
}

export function membershipDaysRemaining(membershipExpiry: string | null, now: Date = new Date()): number {
  if (!membershipExpiry) return 0;
  const expiry = new Date(membershipExpiry);
  if (Number.isNaN(expiry.getTime())) return 0;
  return Math.max(0, Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
}

export function formatMemberCardDate(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function tierBadgeLabel(plan: FireMembershipTier): string {
  if (plan === "elite") return "ELITE MEMBER";
  if (plan === "premium") return "PREMIUM MEMBER";
  return "FREE MEMBER";
}

export function tierDisplayName(plan: FireMembershipTier): string {
  if (plan === "elite") return "Elite Member";
  if (plan === "premium") return "Premium Member";
  return "Free Member";
}

export function currencyDisplay(code: string | null): string {
  if (!code) return "";
  if (code === "KRW") return "KRW (₩)";
  if (code === "USD") return "USD ($)";
  if (code === "NPR") return "NPR (रु)";
  return code;
}

export function validateMemberCardData(data: MemberCardData): string | null {
  if (!data.fullName) return "Full name is missing on your profile.";
  if (!data.fireNepalId) return "FIRE Nepal ID is missing on your profile.";
  return null;
}

export function mapVerificationPayload(payload: Record<string, unknown>): PublicMemberVerification {
  if (payload.found !== true) return { found: false };
  const expiry = typeof payload.membership_expiry === "string" ? payload.membership_expiry : null;
  return {
    found: true,
    fullName: typeof payload.full_name === "string" ? payload.full_name : null,
    avatarUrl: typeof payload.avatar_url === "string" ? payload.avatar_url : null,
    fireNepalId: typeof payload.fire_nepal_id === "string" ? payload.fire_nepal_id : null,
    membershipPlan: planOrFree(typeof payload.membership_plan === "string" ? payload.membership_plan : null),
    membershipStart: typeof payload.membership_start === "string" ? payload.membership_start : null,
    membershipExpiry: expiry,
    countryOfWork: typeof payload.country_of_work === "string" ? payload.country_of_work : null,
    preferredCurrency: typeof payload.preferred_currency === "string" ? payload.preferred_currency : null,
    status: computeMemberCardStatus(expiry, planOrFree(typeof payload.membership_plan === "string" ? payload.membership_plan : null)),
  };
}
