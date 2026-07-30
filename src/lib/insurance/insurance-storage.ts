import { INSURANCE_MODULE_SYNC_EVENT } from "@/lib/cashflow/live-sync-events";
import { normalizeInsurancePolicy } from "@/lib/insurance/insurance-normalize";
import type { InsurancePolicy, InsuranceWorkspaceState } from "@/lib/insurance/insurance-types";

export const INSURANCE_WORKSPACE_STORAGE_KEY = "fire-nepal-insurance-workspace-v1";
/** Marks that Supabase is source of truth for this user; localStorage is cache-only. */
export const INSURANCE_CLOUD_PRIMARY_KEY = "fire-nepal-insurance-cloud-primary-v1";
/** Per-user fingerprints already migrated — prevents repeat localStorage imports. */
export const INSURANCE_MIGRATION_LEDGER_KEY = "fire-nepal-insurance-migration-ledger-v1";

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

export function loadInsuranceWorkspaceState(): InsuranceWorkspaceState {
  if (typeof window === "undefined") return DEFAULT_STATE;
  try {
    const raw = window.localStorage.getItem(INSURANCE_WORKSPACE_STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw) as InsuranceWorkspaceState;
    if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.policies)) return DEFAULT_STATE;
    return {
      version: 1,
      policies: sortPolicies(parsed.policies.map((policy) => normalizeInsurancePolicy(policy))),
    };
  } catch {
    return DEFAULT_STATE;
  }
}

export function saveInsuranceWorkspaceState(state: InsuranceWorkspaceState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      INSURANCE_WORKSPACE_STORAGE_KEY,
      JSON.stringify({
        ...state,
        policies: sortPolicies(state.policies.map((policy) => normalizeInsurancePolicy(policy))),
      }),
    );
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
      window.localStorage.setItem(INSURANCE_WORKSPACE_STORAGE_KEY, JSON.stringify(slim));
      window.dispatchEvent(new Event(INSURANCE_MODULE_SYNC_EVENT));
    } catch {
      /* ignore — keep in-memory state only */
    }
  }
}

/** Write-through offline cache of cloud rows (never the primary store once cloud-ready). */
export function cacheInsurancePoliciesLocally(policies: InsurancePolicy[]) {
  saveInsuranceWorkspaceState({ version: 1, policies });
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

export function createPolicyId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `policy-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
