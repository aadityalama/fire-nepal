import { createSeedStore } from "@/lib/fire-lending/seed";
import type { FireLendingStore } from "@/lib/fire-lending/types";

const STORAGE_KEY = "fire-nepal.fire-lending.v1";

export function loadLendingStore(): FireLendingStore {
  if (typeof window === "undefined") return createSeedStore();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seed = createSeedStore();
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
      return seed;
    }
    return JSON.parse(raw) as FireLendingStore;
  } catch {
    return createSeedStore();
  }
}

export function saveLendingStore(store: FireLendingStore): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    /* ignore quota */
  }
}

export function resetLendingStore(): FireLendingStore {
  const seed = createSeedStore();
  saveLendingStore(seed);
  return seed;
}
