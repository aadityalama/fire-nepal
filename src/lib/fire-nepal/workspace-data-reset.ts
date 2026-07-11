/** Permanent data policy helpers for local FIRE Nepal workspaces. */

import type { PortfolioLedgerBucket, WealthPortfolioStateV2 } from "@/components/portfolio/types";

/** Same-tab portfolio reload (WealthPortfolioProvider listens). */
export const FIRE_NEPAL_PORTFOLIO_STORAGE_SYNC_EVENT = "fire-nepal-portfolio-storage-sync";

/** Cross-cutting workspace reset for providers that hydrate from localStorage. */
export const FIRE_NEPAL_GLOBAL_WORKSPACE_RESET_EVENT = "fire-nepal-global-workspace-reset";

export type PortfolioWorkspaceModule = "banking_cash" | "metals" | "vehicles" | "real_estate" | "pension";

function ledgerBucketForModule(module: PortfolioWorkspaceModule): PortfolioLedgerBucket {
  switch (module) {
    case "banking_cash":
      return "liquid_cash";
    case "metals":
      return "metal";
    case "vehicles":
      return "vehicle";
    case "real_estate":
      return "real_estate";
    case "pension":
      return "retirement";
    default: {
      const _x: never = module;
      return _x;
    }
  }
}

/** Clears one portfolio asset module and matching ledger rows. */
export function resetPortfolioModuleState(
  state: WealthPortfolioStateV2,
  module: PortfolioWorkspaceModule,
): WealthPortfolioStateV2 {
  const bucket = ledgerBucketForModule(module);
  const ledger = state.ledger.filter((e) => e.bucket !== bucket);
  switch (module) {
    case "banking_cash":
      return { ...state, liquidCash: [], fixedDeposits: [], ledger };
    case "metals":
      return { ...state, metals: [], ledger, metalPurchaseBillUrls: [] };
    case "vehicles":
      return { ...state, vehicles: [], ledger };
    case "real_estate":
      return { ...state, realEstate: [], ledger };
    case "pension":
      return { ...state, globalRetirementAssets: [], ledger };
    default: {
      const _m: never = module;
      return _m;
    }
  }
}

/**
 * Permanent persistence policy: workspace data must not be reset or cleared by
 * app controls. This function is kept as a compatibility no-op for older UI
 * callers and tests; explicit per-record deletion must use module-specific
 * delete flows with audit/history semantics.
 */
export function performGlobalFireNepalWorkspaceDataReset(userId?: string | null): void {
  if (typeof window === "undefined") return;
  void userId;
  window.dispatchEvent(new Event(FIRE_NEPAL_GLOBAL_WORKSPACE_RESET_EVENT));
}
