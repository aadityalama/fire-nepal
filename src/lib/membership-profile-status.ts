import { differenceInCalendarDays, startOfDay } from "date-fns";

export type MembershipUiBucket = "free" | "active" | "expiring_soon" | "expired" | "suspended";

export type PlanType = "free" | "premium" | "elite";

/** Mirrors `public.profile_membership_ui_bucket` for admin UI + filters. */
export function membershipUiBucket(input: {
  planType: PlanType;
  expiresAtIso: string | null | undefined;
  suspendedAtIso: string | null | undefined;
  now?: Date;
}): MembershipUiBucket {
  const now = input.now ?? new Date();
  if (input.suspendedAtIso) return "suspended";
  if (input.planType === "free") return "free";
  const exp = input.expiresAtIso ? new Date(input.expiresAtIso) : null;
  if (exp && !Number.isNaN(exp.getTime())) {
    if (exp.getTime() <= now.getTime()) return "expired";
    const calDays = differenceInCalendarDays(startOfDay(exp), startOfDay(now));
    if (calDays >= 0 && calDays <= 7) return "expiring_soon";
  }
  if (input.planType === "premium" || input.planType === "elite") return "active";
  return "free";
}

/** Calendar days from start of today to expiry (exclusive of time); paid + no date → null (treat as open-ended active). */
export function membershipDaysRemaining(expiresAtIso: string | null | undefined, now?: Date): number | null {
  if (!expiresAtIso) return null;
  const exp = new Date(expiresAtIso);
  if (Number.isNaN(exp.getTime())) return null;
  const n = now ?? new Date();
  return differenceInCalendarDays(startOfDay(exp), startOfDay(n));
}

export function formatDaysLeftLabel(
  planType: PlanType,
  expiresAtIso: string | null | undefined,
  suspendedAtIso: string | null | undefined,
  now?: Date,
): string {
  if (suspendedAtIso) return "—";
  if (planType === "free") return "—";
  const days = membershipDaysRemaining(expiresAtIso, now);
  if (days === null) return "—";
  if (days <= 0) return "Expired";
  return String(days);
}
