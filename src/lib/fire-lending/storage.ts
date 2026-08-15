import { createSeedStore } from "@/lib/fire-lending/seed";
import { normalizeStoreLoanIdentities } from "@/lib/fire-lending/loan-party-identity";
import { computeTrustScore } from "@/lib/fire-lending/trust-score";
import type { FireLendingParty, FireLendingStore } from "@/lib/fire-lending/types";

export const FIRE_LENDING_STORAGE_KEY = "fire-nepal.fire-lending.v1";

const FALLBACK_SELF_ID = "party_me";

export function createEmptyLendingStore(): FireLendingStore {
  return {
    currentUserId: FALLBACK_SELF_ID,
    parties: [],
    loans: [],
    payments: [],
    installments: [],
    requests: [],
    agreements: [],
    notifications: [],
    documents: [],
  };
}

function ensureSelfParty(store: FireLendingStore): FireLendingParty {
  const currentUserId = store.currentUserId?.trim() || FALLBACK_SELF_ID;
  const existing =
    store.parties.find((p) => p.id === currentUserId) ||
    store.parties.find((p) => p.id === FALLBACK_SELF_ID);

  if (existing) {
    const cleared: FireLendingParty = {
      ...existing,
      id: currentUserId,
      // Reset P2P lending-specific counters / activity only — keep identity fields.
      onTimePayments: 0,
      latePayments: 0,
      loansCompleted: 0,
      notes: existing.notes,
    };
    return { ...cleared, trustScore: computeTrustScore(cleared) };
  }

  const synthesized: FireLendingParty = {
    id: currentUserId,
    fireNepalId: "FN-LOCAL-USER",
    name: "Local Member",
    mobile: "",
    trustScore: 0,
    verified: false,
    rolePreference: "both",
    onTimePayments: 0,
    latePayments: 0,
    loansCompleted: 0,
    identityVerified: false,
  };
  return { ...synthesized, trustScore: computeTrustScore(synthesized) };
}

/**
 * Reset only the current user's P2P lending/loan demo data.
 * Clears loans, payments, installments, requests, agreements, notifications,
 * documents, and borrower/demo counterparties — while preserving the current
 * user's lending profile identity so downloads/wizard never hit a missing profile.
 * Does not touch FIRE Nepal account, membership, finance, pension, or other modules.
 */
export function resetUserLoanData(store: FireLendingStore): FireLendingStore {
  const me = ensureSelfParty(store);
  return {
    currentUserId: me.id,
    parties: [me],
    loans: [],
    payments: [],
    installments: [],
    requests: [],
    agreements: [],
    notifications: [],
    documents: [],
  };
}

export function sanitizeFireLendingStore(raw: unknown): FireLendingStore {
  if (!raw || typeof raw !== "object") return createEmptyLendingStore();
  const parsed = raw as Partial<FireLendingStore>;
  const base: FireLendingStore = {
    currentUserId: typeof parsed.currentUserId === "string" ? parsed.currentUserId : "party_me",
    parties: Array.isArray(parsed.parties) ? parsed.parties : [],
    loans: Array.isArray(parsed.loans) ? (parsed.loans as FireLendingStore["loans"]) : [],
    payments: Array.isArray(parsed.payments) ? parsed.payments : [],
    installments: Array.isArray(parsed.installments) ? parsed.installments : [],
    requests: Array.isArray(parsed.requests) ? parsed.requests : [],
    agreements: Array.isArray(parsed.agreements) ? parsed.agreements : [],
    notifications: Array.isArray(parsed.notifications) ? parsed.notifications : [],
    documents: Array.isArray(parsed.documents) ? parsed.documents : [],
  };
  return normalizeStoreLoanIdentities(base);
}

export function clearFireLendingLocalCache(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(FIRE_LENDING_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/** Guest path: localStorage with demo seed when empty. */
export function loadLendingStore(): FireLendingStore {
  if (typeof window === "undefined") return createSeedStore();
  try {
    const raw = window.localStorage.getItem(FIRE_LENDING_STORAGE_KEY);
    if (!raw) {
      const seed = createSeedStore();
      window.localStorage.setItem(FIRE_LENDING_STORAGE_KEY, JSON.stringify(seed));
      return seed;
    }
    return sanitizeFireLendingStore(JSON.parse(raw) as unknown);
  } catch {
    return createSeedStore();
  }
}

export function saveLendingStore(store: FireLendingStore): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(FIRE_LENDING_STORAGE_KEY, JSON.stringify(store));
  } catch {
    /* ignore quota */
  }
}

/** @deprecated Prefer resetUserLoanData — full seed replace is only for guest bootstrap. */
export function resetLendingStore(): FireLendingStore {
  const seed = createSeedStore();
  saveLendingStore(seed);
  return seed;
}

export function persistResetUserLoanData(store: FireLendingStore): FireLendingStore {
  const next = resetUserLoanData(store);
  saveLendingStore(next);
  return next;
}
