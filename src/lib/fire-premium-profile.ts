/**
 * STEP 6C — premium member profile + membership metadata (local-first).
 * Binds to `ProductAuthUser.id`; replace with API sync when backend exists.
 */

import type { ProductAuthUser } from "@/lib/product-auth-storage";

export const PREMIUM_PROFILE_STORAGE_KEY = "fire-nepal-premium-profile-v1";

export type RiskProfile = "conservative" | "balanced" | "growth" | "aggressive";

export type PremiumMemberProfileFields = {
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

export type PremiumProfileStore = {
  version: 1;
  byUserId: Record<string, PremiumMemberProfileFields>;
};

function defaultFields(user: ProductAuthUser): PremiumMemberProfileFields {
  return {
    fullName: user.name,
    avatarDataUrl: user.avatarUrl ?? null,
    phoneDialCode: "+977",
    phoneNationalDigits: "",
    country: "Nepal",
    countryOfWork: "South Korea",
    preferredCurrency: "NPR",
    fireGoalAmount: 50_000_000,
    monthlyInvestment: 150_000,
    riskProfile: "balanced",
  };
}

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

function safeParse(raw: string | null): PremiumProfileStore | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as PremiumProfileStore;
    if (v?.version !== 1 || typeof v.byUserId !== "object" || !v.byUserId) return null;
    return v;
  } catch {
    return null;
  }
}

export function loadPremiumProfileStore(): PremiumProfileStore {
  if (typeof window === "undefined") return { version: 1, byUserId: {} };
  return safeParse(window.localStorage.getItem(PREMIUM_PROFILE_STORAGE_KEY)) ?? { version: 1, byUserId: {} };
}

export function savePremiumProfileStore(store: PremiumProfileStore): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PREMIUM_PROFILE_STORAGE_KEY, JSON.stringify(store));
  } catch {
    /* quota */
  }
}

export function getPremiumProfileForUser(user: ProductAuthUser): PremiumMemberProfileFields {
  const store = loadPremiumProfileStore();
  const base = defaultFields(user);
  const existing = store.byUserId[user.id];
  if (!existing) return base;
  const dial = typeof existing.phoneDialCode === "string" && existing.phoneDialCode.startsWith("+")
    ? existing.phoneDialCode
    : base.phoneDialCode;
  const rawNational = typeof existing.phoneNationalDigits === "string" ? existing.phoneNationalDigits : "";
  return {
    ...base,
    ...existing,
    phoneDialCode: dial,
    phoneNationalDigits: normalizePhoneNationalDigits(dial, rawNational),
  };
}

export function savePremiumProfileFull(userId: string, fields: PremiumMemberProfileFields): void {
  const store = loadPremiumProfileStore();
  store.byUserId[userId] = fields;
  savePremiumProfileStore(store);
}

/** Deterministic 1…999_999 from user id (FIRE Nepal member serial). */
export function stableSerialFromUserId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (Math.imul(31, h) + id.charCodeAt(i)) >>> 0;
  }
  return (h % 999_999) + 1;
}

export function deriveFireNepalId(user: ProductAuthUser): string {
  const year = new Date(user.createdAt).getFullYear();
  const n = stableSerialFromUserId(user.id);
  return `FN-${year}-${String(n).padStart(6, "0")}`;
}

export function membershipActiveIso(user: ProductAuthUser): string {
  return user.createdAt;
}

/** Annual membership window from verified join. */
export function membershipExpiryIso(user: ProductAuthUser): string {
  const d = new Date(user.createdAt);
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString();
}

export function displayName(user: ProductAuthUser, profile: PremiumMemberProfileFields): string {
  const n = profile.fullName?.trim();
  if (n) return n;
  return user.name;
}

export function displayAvatar(user: ProductAuthUser, profile: PremiumMemberProfileFields): string | null {
  if (profile.avatarDataUrl) return profile.avatarDataUrl;
  return user.avatarUrl ?? null;
}
