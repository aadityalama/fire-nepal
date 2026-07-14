/**
 * Membership tier helpers + feature-gate metadata.
 * Plan/expiry SOT is `public.user_profiles` via MembershipService — never localStorage.
 */

import type { ProductAuthUser } from "@/lib/product-auth-storage";

/** @deprecated Legacy key — purged on read; never used as plan SOT. */
export const MEMBERSHIP_STORAGE_KEY = "fire-nepal-membership-v1";

export type FireMembershipTier = "free" | "premium" | "elite";

export type SubscriptionStatus = "none" | "trialing" | "active" | "past_due" | "canceled";

/** Feature keys for `canAccessFeature` / `<FireFeatureGate />`. */
export type FireFeatureKey =
  | "ocr_payslip"
  | "pdf_reports"
  | "portfolio_analytics"
  | "ai_wealth_intel"
  | "ai_financial_coach"
  | "smart_financial_intel"
  | "elite_bloomberg_layer"
  | "ai_scenario_lab";

export type FireMembershipRecord = {
  tier: FireMembershipTier;
  status: SubscriptionStatus;
  /** ISO end of current paid period — future: Stripe `current_period_end` */
  currentPeriodEnd: string | null;
  trialEndsAt: string | null;
  stripeCustomerId: string | null;
  /** YYYY-MM for usage counters */
  usageMonthYm: string;
  aiCoachQueries: number;
  ocrImports: number;
};

export type FireMembershipStore = {
  version: 1;
  byUserId: Record<string, FireMembershipRecord>;
};

const TIER_RANK: Record<FireMembershipTier, number> = {
  free: 0,
  premium: 1,
  elite: 2,
};

/** Minimum tier required to unlock a product surface. */
export const FEATURE_MIN_TIER: Record<FireFeatureKey, FireMembershipTier> = {
  ocr_payslip: "premium",
  pdf_reports: "premium",
  portfolio_analytics: "premium",
  ai_wealth_intel: "premium",
  ai_financial_coach: "premium",
  smart_financial_intel: "premium",
  elite_bloomberg_layer: "elite",
  ai_scenario_lab: "elite",
};

export const USAGE_LIMITS: Record<
  FireMembershipTier,
  { aiCoachQueries: number; ocrImports: number }
> = {
  free: { aiCoachQueries: 5, ocrImports: 0 },
  premium: { aiCoachQueries: 200, ocrImports: 40 },
  elite: { aiCoachQueries: Number.POSITIVE_INFINITY, ocrImports: Number.POSITIVE_INFINITY },
};

export const TIER_DISPLAY: Record<
  FireMembershipTier,
  { label: string; short: string; accent: string }
> = {
  free: { label: "Free", short: "Free", accent: "from-zinc-500/30 to-zinc-600/20" },
  premium: { label: "Premium", short: "Premium", accent: "from-emerald-500/40 to-lime-400/30" },
  elite: { label: "Elite", short: "Elite", accent: "from-amber-500/40 to-yellow-300/25" },
};

function ymNow(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function defaultMembershipRecord(): FireMembershipRecord {
  const ym = ymNow();
  return {
    tier: "free",
    status: "none",
    currentPeriodEnd: null,
    trialEndsAt: null,
    stripeCustomerId: null,
    usageMonthYm: ym,
    aiCoachQueries: 0,
    ocrImports: 0,
  };
}

export function loadMembershipStore(): FireMembershipStore {
  // Purge any stale plan cache so Admin/Profile mismatches cannot resurface from localStorage.
  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem(MEMBERSHIP_STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }
  return { version: 1, byUserId: {} };
}

/** No-op: membership plan must never be cached in localStorage. */
export function saveMembershipStore(_store: FireMembershipStore): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(MEMBERSHIP_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

function normalizeRecord(r: Partial<FireMembershipRecord> | undefined): FireMembershipRecord {
  const base = defaultMembershipRecord();
  if (!r) return base;
  const ym = ymNow();
  let { aiCoachQueries, ocrImports, usageMonthYm } = r;
  if (usageMonthYm !== ym) {
    aiCoachQueries = 0;
    ocrImports = 0;
    usageMonthYm = ym;
  }
  const rawTier: FireMembershipTier = r.tier === "premium" || r.tier === "elite" ? r.tier : "free";
  const status = (r.status ?? "none") as SubscriptionStatus;
  /** Paid surfaces unlock only with an active subscription (admin-approved), never from local intent alone. */
  const tier: FireMembershipTier =
    (rawTier === "premium" || rawTier === "elite") && status === "active" ? rawTier : "free";
  return {
    tier,
    status,
    currentPeriodEnd: r.currentPeriodEnd ?? null,
    trialEndsAt: r.trialEndsAt ?? null,
    stripeCustomerId: r.stripeCustomerId ?? null,
    usageMonthYm: usageMonthYm ?? ym,
    aiCoachQueries: typeof aiCoachQueries === "number" ? aiCoachQueries : 0,
    ocrImports: typeof ocrImports === "number" ? ocrImports : 0,
  };
}

/** @deprecated Use MembershipService / useFireMembership().membership — returns free defaults only. */
export function getMembershipRecordForUser(_user: ProductAuthUser | null): FireMembershipRecord {
  loadMembershipStore();
  return defaultMembershipRecord();
}

/** @deprecated Plan writes go through MembershipService.writeMembership — does not persist. */
export function setMembershipRecordForUser(
  _userId: string,
  patch: Partial<FireMembershipRecord>,
): FireMembershipRecord {
  loadMembershipStore();
  return normalizeRecord({ ...defaultMembershipRecord(), ...patch });
}

/** Demo-only in-memory tier change (no localStorage; Supabase SOT when configured). */
export function applyDemoTierChange(_userId: string, tier: FireMembershipTier): FireMembershipRecord {
  const now = new Date();
  const periodEnd = tier === "free" ? null : new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString();
  return {
    ...defaultMembershipRecord(),
    tier,
    status: tier === "free" ? "none" : "active",
    currentPeriodEnd: periodEnd,
    trialEndsAt: null,
  };
}

/** True when moving to a higher-paid tier (opens payment flow instead of instant demo). */
export function isMembershipUpgrade(current: FireMembershipTier, target: FireMembershipTier): boolean {
  return TIER_RANK[target] > TIER_RANK[current];
}

/** @deprecated Entitlement sync is MembershipService via /api/membership/entitlement — no local cache. */
export function applyServerEntitlement(
  _userId: string,
  tier: "premium" | "elite",
  currentPeriodEnd: string | null,
): FireMembershipRecord {
  const end =
    currentPeriodEnd ?? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
  return {
    ...defaultMembershipRecord(),
    tier,
    status: "active",
    currentPeriodEnd: end,
    trialEndsAt: null,
  };
}

/** True when the user has an admin-approved, active paid plan (mirrors Supabase profile + subscription). */
export function hasActivePaidMembership(record: FireMembershipRecord): boolean {
  return (record.tier === "premium" || record.tier === "elite") && record.status === "active";
}

/** Tier used for quotas, limits, and product gates (pending payment review → free). */
export function effectiveFeatureTier(record: FireMembershipRecord): FireMembershipTier {
  return hasActivePaidMembership(record) ? record.tier : "free";
}

/** @deprecated Entitlement sync is MembershipService — no local cache. */
export function applyServerFreeEntitlement(_userId: string): FireMembershipRecord {
  return defaultMembershipRecord();
}

export function canAccessFeature(record: FireMembershipRecord, feature: FireFeatureKey): boolean {
  if (!hasActivePaidMembership(record)) return false;
  return TIER_RANK[record.tier] >= TIER_RANK[FEATURE_MIN_TIER[feature]];
}

export function tierMeets(tier: FireMembershipTier, min: FireMembershipTier): boolean {
  return TIER_RANK[tier] >= TIER_RANK[min];
}

export function usageRemaining(
  tier: FireMembershipTier,
  record: FireMembershipRecord,
  kind: "aiCoachQueries" | "ocrImports",
): number {
  const lim = USAGE_LIMITS[tier][kind];
  if (!Number.isFinite(lim)) return Number.POSITIVE_INFINITY;
  return Math.max(0, lim - record[kind]);
}

/** Stripe / billing extension points (no network calls yet). */
export type StripePriceRef = {
  lookupKey: string;
  /** NPR display hints only */
  amountNprApprox: number;
  interval: "month" | "year";
};

export const STRIPE_PRICE_PLACEHOLDERS: Record<"premium" | "elite", StripePriceRef> = {
  premium: { lookupKey: "fn_premium_yearly", amountNprApprox: 500, interval: "year" },
  elite: { lookupKey: "fn_elite_yearly", amountNprApprox: 800, interval: "year" },
};

export const BILLING_PIPELINE = [
  "Checkout Session → customer + subscription id",
  "Webhook: invoice.paid / customer.subscription.updated → renew `currentPeriodEnd`",
  "Portal: cancel_at_period_end + proration rules",
  "Trials: subscription `trialing` + `trial_end` mirrored into `trialEndsAt`",
] as const;

/** Elite tier — merged family + education positioning (card + comparison table). */
export const ELITE_FAMILY_WEALTH_FEATURE_LABEL = "Family Wealth Planning + Child Education" as const;

/** Conceptual scope shown in popover / tooltips (not separate card lines). */
export const ELITE_FAMILY_WEALTH_DETAILS = [
  "Child education planner",
  "School fee reminders",
  "Educational progress tracking",
  "Family financial timeline",
  "Education fund tracking",
] as const;

export const TIER_CATALOG: Record<
  FireMembershipTier,
  { tagline: string; bullets: string[]; priceLabel: string }
> = {
  free: {
    tagline: "Core workspace for tracking FIRE progress and exploring tools.",
    priceLabel: "NPR 0",
    bullets: [
      "Basic dashboard & FIRE calculator",
      "Limited charts & cashflow tracking",
      "Basic portfolio workspace",
      "Limited AI insights",
    ],
  },
  premium: {
    tagline: "Full analytics, AI coach, OCR, and exports for serious savers abroad.",
    priceLabel: "NPR 500 / year",
    bullets: [
      "Advanced FIRE dashboard & simulations",
      "AI financial coach",
      "OCR payslip import",
      "CAGR & multi-currency intelligence",
      "Cloud sync & PDF reports",
      "Advanced charts",
    ],
  },
  elite: {
    tagline: "Strategy lab, return planning, and institutional-grade desk tools.",
    priceLabel: "NPR 800 / year",
    bullets: [
      "AI Wealth Dashboard",
      ELITE_FAMILY_WEALTH_FEATURE_LABEL,
      "Nepal Return Simulator",
      "Real Estate Intelligence",
      "AI Portfolio Allocation",
      "Private Advisory Tools",
      "Business Finance Suite",
    ],
  },
};
