import {
  defaultCashflowState,
  loadCashflowState,
  sanitizeCashflowState,
  saveCashflowState,
} from "@/components/cashflow/cashflow-storage";
import { CASHFLOW_EXTERNAL_SYNC_EVENT } from "@/components/cashflow/portfolio-dividend-sync";
import type { CashflowDashboardState } from "@/components/cashflow/types";
import { isSupabaseConfigured } from "@/lib/supabase/config";

function patchLocalCashflowState(
  userId: string | null | undefined,
  patcher: (state: CashflowDashboardState) => CashflowDashboardState,
): CashflowDashboardState {
  const next = sanitizeCashflowState(patcher(loadCashflowState(userId)));
  saveCashflowState(next, userId);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(CASHFLOW_EXTERNAL_SYNC_EVENT));
  }
  return next;
}

/**
 * Apply a cashflow mutation.
 * Authenticated + Supabase: load → patch → PUT cloud → cache local only after success.
 * Guest / legacy (no Supabase): localStorage only (user-scoped when signed in).
 */
export async function patchCashflowState(
  userId: string | null | undefined,
  patcher: (state: CashflowDashboardState) => CashflowDashboardState,
): Promise<CashflowDashboardState> {
  if (typeof window === "undefined") return defaultCashflowState();

  if (!userId || !isSupabaseConfigured()) {
    return patchLocalCashflowState(userId, patcher);
  }

  const loadRes = await fetch("/api/cashflow", { credentials: "include", cache: "no-store" });
  const loadJson = (await loadRes.json()) as {
    ok: boolean;
    snapshot?: { state: CashflowDashboardState } | null;
    error?: string;
  };
  if (!loadRes.ok || !loadJson.ok) {
    throw new Error(loadJson.error ?? "Could not load cashflow from Supabase.");
  }

  const current = loadJson.snapshot?.state
    ? sanitizeCashflowState(loadJson.snapshot.state)
    : defaultCashflowState();
  const next = sanitizeCashflowState(patcher(current));

  const saveRes = await fetch("/api/cashflow", {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ state: next }),
  });
  const saveJson = (await saveRes.json()) as { ok: boolean; error?: string };
  if (!saveRes.ok || !saveJson.ok) {
    throw new Error(saveJson.error ?? "Could not save cashflow to Supabase.");
  }

  // Optional cache only after successful cloud sync.
  saveCashflowState(next, userId);
  window.dispatchEvent(new Event(CASHFLOW_EXTERNAL_SYNC_EVENT));
  return next;
}
