import { INSURANCE_MODULE_SYNC_EVENT } from "@/lib/cashflow/live-sync-events";
import type { InsurancePolicy, InsuranceWorkspaceState } from "@/lib/insurance/insurance-types";

export const INSURANCE_WORKSPACE_STORAGE_KEY = "fire-nepal-insurance-workspace-v1";

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
      policies: sortPolicies(parsed.policies),
    };
  } catch {
    return DEFAULT_STATE;
  }
}

export function saveInsuranceWorkspaceState(state: InsuranceWorkspaceState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    INSURANCE_WORKSPACE_STORAGE_KEY,
    JSON.stringify({
      ...state,
      policies: sortPolicies(state.policies),
    }),
  );
  window.dispatchEvent(new Event(INSURANCE_MODULE_SYNC_EVENT));
}

export function createPolicyId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `policy-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
