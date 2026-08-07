import { createSeedStore } from "@/lib/fire-lending/seed";
import type { FireLendingStore } from "@/lib/fire-lending/types";

export const FIRE_LENDING_STORAGE_KEY = "fire-nepal.fire-lending.v1";

export function createEmptyLendingStore(): FireLendingStore {
  return {
    currentUserId: "party_me",
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

export function sanitizeFireLendingStore(raw: unknown): FireLendingStore {
  if (!raw || typeof raw !== "object") return createEmptyLendingStore();
  const parsed = raw as Partial<FireLendingStore>;
  return {
    currentUserId: typeof parsed.currentUserId === "string" ? parsed.currentUserId : "party_me",
    parties: Array.isArray(parsed.parties) ? parsed.parties : [],
    loans: Array.isArray(parsed.loans) ? parsed.loans : [],
    payments: Array.isArray(parsed.payments) ? parsed.payments : [],
    installments: Array.isArray(parsed.installments) ? parsed.installments : [],
    requests: Array.isArray(parsed.requests) ? parsed.requests : [],
    agreements: Array.isArray(parsed.agreements) ? parsed.agreements : [],
    notifications: Array.isArray(parsed.notifications) ? parsed.notifications : [],
    documents: Array.isArray(parsed.documents) ? parsed.documents : [],
  };
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

export function resetLendingStore(): FireLendingStore {
  const seed = createSeedStore();
  saveLendingStore(seed);
  return seed;
}
