/** Premium member profile display helpers. Profile fields come from public.user_profiles only. */

export type RiskProfile = "conservative" | "balanced" | "growth" | "aggressive";

export type PremiumMemberProfileFields = {
  /** Canonical member ID assigned by Supabase. UI must not derive or reformat it. */
  fireNepalId: string;
  /** Overrides display name in dashboard when set. */
  fullName: string;
  avatarDataUrl: string | null;
  /** E.164-style dial including + (e.g. +977, +82). */
  phoneDialCode: string;
  /** National significant number; digits only (no country code). */
  phoneNationalDigits: string;
  country: string;
  countryOfWork: string;
  preferredCurrency: "NPR" | "KRW" | "USD";
  fireGoalAmount: number;
  monthlyInvestment: number;
  riskProfile: RiskProfile;
};

/** Preset dial codes for profile phone UI (extend as needed). */
export const PHONE_DIAL_PRESETS: { value: string; label: string }[] = [
  { value: "+977", label: "Nepal +977" },
  { value: "+82", label: "Korea +82" },
  { value: "+1", label: "US/CA +1" },
  { value: "+44", label: "UK +44" },
  { value: "+61", label: "Australia +61" },
  { value: "+91", label: "India +91" },
  { value: "+971", label: "UAE +971" },
  { value: "+49", label: "Germany +49" },
];

/** Strip non-digits; Korea (+82) drops a single leading 0 from local input. */
export function normalizePhoneNationalDigits(dial: string, raw: string): string {
  let d = raw.replace(/\D/g, "");
  if (dial === "+82" && d.startsWith("0")) d = d.slice(1);
  return d.slice(0, 12);
}

export function validatePremiumPhone(
  dial: string,
  nationalDigits: string,
): { ok: true } | { ok: false; message: string } {
  const n = normalizePhoneNationalDigits(dial, nationalDigits);
  if (n.length === 0) return { ok: true };
  if (!/^\+\d{1,4}$/.test(dial) || dial.length < 3) {
    return { ok: false, message: "Choose a valid country code (e.g. +977, +82)." };
  }
  if (n.length < 8 || n.length > 12) {
    return { ok: false, message: "Local number should be 8–12 digits." };
  }
  if (dial === "+977" && (n.length < 9 || n.length > 10)) {
    return { ok: false, message: "Nepal mobile numbers are usually 9–10 digits." };
  }
  if (dial === "+82" && (n.length < 9 || n.length > 11)) {
    return { ok: false, message: "Korea numbers are usually 9–11 digits (omit leading 0)." };
  }
  return { ok: true };
}

/** Readable international display (no libphonenumber dependency). */
export function formatPremiumPhoneDisplay(dial: string, nationalDigits: string): string {
  const g = normalizePhoneNationalDigits(dial, nationalDigits);
  if (!g) return "";
  const parts: string[] = [];
  let i = 0;
  while (i < g.length) {
    const take = i === 0 && g.length >= 10 ? 3 : Math.min(4, g.length - i);
    parts.push(g.slice(i, i + take));
    i += take;
  }
  return `${dial} ${parts.join(" ")}`.trim();
}

export function membershipActiveIso(user: { createdAt: string }): string {
  return user.createdAt;
}

/** Annual membership window from verified join. */
export function membershipExpiryIso(user: { createdAt: string }): string {
  const d = new Date(user.createdAt);
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString();
}

export function displayName(profile: PremiumMemberProfileFields): string {
  const n = profile.fullName?.trim();
  if (n) return n;
  return "Not added";
}

export function displayAvatar(profile: PremiumMemberProfileFields): string | null {
  if (profile.avatarDataUrl) return profile.avatarDataUrl;
  return null;
}
