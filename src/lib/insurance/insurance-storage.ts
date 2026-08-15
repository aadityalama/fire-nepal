import { INSURANCE_MODULE_SYNC_EVENT } from "@/lib/cashflow/live-sync-events";
import { normalizeInsurancePolicy } from "@/lib/insurance/insurance-normalize";
import type { InsurancePolicy, InsuranceWorkspaceState } from "@/lib/insurance/insurance-types";
import { readJsonWithLegacyMigration, scopedStorageKey, writeJsonScoped } from "@/lib/ux/scoped-storage";

export const INSURANCE_WORKSPACE_STORAGE_KEY = "fire-nepal-insurance-workspace-v1";
/** Marks that Supabase is source of truth for this user; localStorage is cache-only. */
export const INSURANCE_CLOUD_PRIMARY_KEY = "fire-nepal-insurance-cloud-primary-v1";
/** Per-user fingerprints already migrated — prevents repeat localStorage imports. */
export const INSURANCE_MIGRATION_LEDGER_KEY = "fire-nepal-insurance-migration-ledger-v1";

export function insuranceWorkspaceStorageKey(userId?: string | null) {
  return scopedStorageKey(INSURANCE_WORKSPACE_STORAGE_KEY, userId);
}

const DEFAULT_STATE: InsuranceWorkspaceState = {
  version: 1,
  policies: [],
};

function sortPolicies(policies: InsurancePolicy[]) {
  return [...policies].sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    if (a.createdAt !== b.createdAt) return a.createdAt.localeCompare(b.createdAt);
    return a.provider.localeCompare(b.provider);
  });
}

export function loadInsuranceWorkspaceState(userId?: string | null): InsuranceWorkspaceState {
  if (typeof window === "undefined") return DEFAULT_STATE;
  const parsed = readJsonWithLegacyMigration(INSURANCE_WORKSPACE_STORAGE_KEY, userId, (raw) => {
    try {
      const value = JSON.parse(raw) as InsuranceWorkspaceState;
      if (!value || value.version !== 1 || !Array.isArray(value.policies)) return null;
      return {
        version: 1 as const,
        policies: sortPolicies(value.policies.map((policy) => normalizeInsurancePolicy(policy))),
      };
    } catch {
      return null;
    }
  });
  return parsed ?? DEFAULT_STATE;
}

export function saveInsuranceWorkspaceState(state: InsuranceWorkspaceState, userId?: string | null) {
  if (typeof window === "undefined") return;
  const payload = {
    ...state,
    policies: sortPolicies(state.policies.map((policy) => normalizeInsurancePolicy(policy))),
  };
  try {
    writeJsonScoped(INSURANCE_WORKSPACE_STORAGE_KEY, userId, payload);
    window.dispatchEvent(new Event(INSURANCE_MODULE_SYNC_EVENT));
  } catch (error) {
    // Chrome iOS can throw QuotaExceededError when legacy policies store large document dataUrls.
    if (process.env.NODE_ENV !== "production") {
      console.warn("[insurance-storage] save failed", error);
    }
    try {
      const slim = {
        version: 1 as const,
        policies: sortPolicies(
          state.policies.map((policy) => {
            const normalized = normalizeInsurancePolicy(policy);
            return {
              ...normalized,
              documents: [],
              documentDataUrl: null,
              documentFileName: null,
              premiumHistory: (normalized.premiumHistory ?? []).slice(-24),
            };
          }),
        ),
      };
      writeJsonScoped(INSURANCE_WORKSPACE_STORAGE_KEY, userId, slim);
      window.dispatchEvent(new Event(INSURANCE_MODULE_SYNC_EVENT));
    } catch {
      /* ignore — keep in-memory state only */
    }
  }
}

/** Write-through offline cache of cloud rows (never the primary store once cloud-ready). */
export function cacheInsurancePoliciesLocally(policies: InsurancePolicy[], userId?: string | null) {
  saveInsuranceWorkspaceState({ version: 1, policies }, userId);
}

type CloudPrimaryMap = Record<string, { readyAt: string }>;

function readCloudPrimaryMap(): CloudPrimaryMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(INSURANCE_CLOUD_PRIMARY_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as CloudPrimaryMap;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function isInsuranceCloudPrimary(userId: string): boolean {
  if (!userId) return false;
  return Boolean(readCloudPrimaryMap()[userId]?.readyAt);
}

export function markInsuranceCloudPrimary(userId: string) {
  if (typeof window === "undefined" || !userId) return;
  try {
    const next = { ...readCloudPrimaryMap(), [userId]: { readyAt: new Date().toISOString() } };
    window.localStorage.setItem(INSURANCE_CLOUD_PRIMARY_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

export function clearInsuranceCloudPrimary(userId: string) {
  if (typeof window === "undefined" || !userId) return;
  try {
    const next = { ...readCloudPrimaryMap() };
    delete next[userId];
    window.localStorage.setItem(INSURANCE_CLOUD_PRIMARY_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

type MigrationLedger = Record<string, string[]>;

function readMigrationLedger(): MigrationLedger {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(INSURANCE_MIGRATION_LEDGER_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as MigrationLedger;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function getMigratedInsuranceFingerprints(userId: string): Set<string> {
  if (!userId) return new Set();
  const list = readMigrationLedger()[userId];
  return new Set(Array.isArray(list) ? list.filter((item) => typeof item === "string") : []);
}

export function markInsuranceFingerprintsMigrated(userId: string, fingerprints: string[]) {
  if (typeof window === "undefined" || !userId || fingerprints.length === 0) return;
  try {
    const ledger = readMigrationLedger();
    const existing = new Set(ledger[userId] ?? []);
    for (const fp of fingerprints) {
      if (fp) existing.add(fp);
    }
    ledger[userId] = [...existing];
    window.localStorage.setItem(INSURANCE_MIGRATION_LEDGER_KEY, JSON.stringify(ledger));
  } catch {
    /* ignore */
  }
}

/** Wipe insurance workspace cache (localStorage policies). */
export function clearInsuranceWorkspaceCache(userId?: string | null) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(insuranceWorkspaceStorageKey(userId));
    window.dispatchEvent(new Event(INSURANCE_MODULE_SYNC_EVENT));
  } catch {
    /* ignore */
  }
}

/** After cloud sync: drop stale local rows, keep only the Supabase snapshot as cache. */
export function replaceInsuranceCacheWithCloud(policies: InsurancePolicy[], userId?: string | null) {
  clearInsuranceWorkspaceCache(userId);
  cacheInsurancePoliciesLocally(policies, userId);
}

export function countInsurancePoliciesInLocalStorage(userId?: string | null): number {
  return loadInsuranceWorkspaceState(userId).policies.length;
}

export function createPolicyId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `policy-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
