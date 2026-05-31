/**
 * STEP 8 — FIRE Nepal membership tiers, feature gates, and billing-ready metadata.
 * Tier + usage persist per userId in localStorage until Stripe webhooks sync server-side.
 */

import type { ProductAuthUser } from "@/lib/product-auth-storage";

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

function safeParse(raw: string | null): FireMembershipStore | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as FireMembershipStore;
    if (v?.version !== 1 || typeof v.byUserId !== "object" || !v.byUserId) return null;
    return v;
  } catch {
    return null;
  }
}

export function loadMembershipStore(): FireMembershipStore {
  if (typeof window === "undefined") return { version: 1, byUserId: {} };
  return safeParse(window.localStorage.getItem(MEMBERSHIP_STORAGE_KEY)) ?? { version: 1, byUserId: {} };
}

export function saveMembershipStore(store: FireMembershipStore): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(MEMBERSHIP_STORAGE_KEY, JSON.stringify(store));
    window.dispatchEvent(new Event("fn-membership-changed"));
  } catch {
    /* quota */
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
  return {
    tier: r.tier === "premium" || r.tier === "elite" ? r.tier : "free",
    status: r.status ?? "none",
    currentPeriodEnd: r.currentPeriodEnd ?? null,
    trialEndsAt: r.trialEndsAt ?? null,
    stripeCustomerId: r.stripeCustomerId ?? null,
    usageMonthYm: usageMonthYm ?? ym,
    aiCoachQueries: typeof aiCoachQueries === "number" ? aiCoachQueries : 0,
    ocrImports: typeof ocrImports === "number" ? ocrImports : 0,
  };
}

export function getMembershipRecordForUser(user: ProductAuthUser | null): FireMembershipRecord {
  if (!user) return defaultMembershipRecord();
  const store = loadMembershipStore();
  return normalizeRecord(store.byUserId[user.id]);
}

export function setMembershipRecordForUser(userId: string, patch: Partial<FireMembershipRecord>): FireMembershipRecord {
  const store = loadMembershipStore();
  const prev = normalizeRecord(store.byUserId[userId]);
  const next: FireMembershipRecord = { ...prev, ...patch };
  store.byUserId[userId] = normalizeRecord(next);
  saveMembershipStore(store);
  return store.byUserId[userId]!;
}

/** Demo: set tier and synthetic renewal window (annual from now for paid tiers). */
export function applyDemoTierChange(userId: string, tier: FireMembershipTier): FireMembershipRecord {
  const now = new Date();
  const periodEnd = tier === "free" ? null : new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString();
  return setMembershipRecordForUser(userId, {
    tier,
    status: tier === "free" ? "none" : "active",
    currentPeriodEnd: periodEnd,
    trialEndsAt: null,
  });
}

export function canAccessFeature(tier: FireMembershipTier, feature: FireFeatureKey): boolean {
  return TIER_RANK[tier] >= TIER_RANK[FEATURE_MIN_TIER[feature]];
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
  premium: { lookupKey: "fn_premium_monthly", amountNprApprox: 799, interval: "month" },
  elite: { lookupKey: "fn_elite_monthly", amountNprApprox: 1999, interval: "month" },
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
    tagline: "Entry — attract and onboard new savers.",
    priceLabel: "NPR 0",
    bullets: [
      "Basic dashboard & FIRE calculator",
      "Limited charts & cashflow tracking",
      "Basic portfolio workspace",
      "Limited AI insights",
    ],
  },
  premium: {
    tagline: "Revenue core — Korea / Gulf workers & serious FIRE users.",
    priceLabel: "From ~ NPR 799 / mo (placeholder)",
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
    tagline: "Institutional depth · private-client controls.",
    priceLabel: "From ~ NPR 1,999 / mo (placeholder)",
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
