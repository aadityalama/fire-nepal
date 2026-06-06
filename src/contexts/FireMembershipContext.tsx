"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useProductAuth } from "@/contexts/ProductAuthContext";
import {
  applyDemoTierChange,
  applyServerEntitlement,
  applyServerFreeEntitlement,
  defaultMembershipRecord,
  getMembershipRecordForUser,
  hasActivePaidMembership,
  type FireMembershipRecord,
  type FireMembershipTier,
} from "@/lib/fire-membership";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export type PendingMembershipRequest = { plan: "premium" | "elite" };

type FireMembershipContextValue = {
  tier: FireMembershipTier;
  record: FireMembershipRecord;
  /** Anonymous / logged out → free + default record (not persisted). */
  refresh: () => void;
  setTierDemo: (tier: FireMembershipTier) => void;
  /** When Supabase is enabled, pull server truth into local gates (admin-approved plan + pending QR requests). */
  syncServerEntitlement: () => Promise<void>;
  /** Latest `membership_requests` row with status pending (for UI only; does not grant access). */
  pendingMembershipRequest: PendingMembershipRequest | null;
};

const FireMembershipContext = createContext<FireMembershipContextValue | null>(null);

export function FireMembershipProvider({ children }: { children: ReactNode }) {
  const { user } = useProductAuth();
  const [tick, setTick] = useState(0);
  const [pendingMembershipRequestState, setPendingMembershipRequestState] = useState<PendingMembershipRequest | null>(
    null,
  );

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    const on = () => refresh();
    window.addEventListener("storage", on);
    window.addEventListener("fn-membership-changed", on);
    return () => {
      window.removeEventListener("storage", on);
      window.removeEventListener("fn-membership-changed", on);
    };
  }, [refresh]);

  const record = useMemo(() => {
    void tick;
    return user ? getMembershipRecordForUser(user) : defaultMembershipRecord();
  }, [user, tick]);

  const tier = record.tier;

  const pendingMembershipRequest = user ? pendingMembershipRequestState : null;

  const setTierDemo = useCallback(
    (next: FireMembershipTier) => {
      if (!user) return;
      if (isSupabaseConfigured() && (next === "premium" || next === "elite")) {
        return;
      }
      applyDemoTierChange(user.id, next);
      refresh();
    },
    [user, refresh],
  );

  const syncServerEntitlement = useCallback(async () => {
    if (!user || !isSupabaseConfigured()) return;
    try {
      const r = await fetch("/api/membership/entitlement", { credentials: "include", cache: "no-store" });
      if (!r.ok) return;
      const j = (await r.json()) as {
        effectivePlan?: string;
        currentPeriodEnd?: string | null;
        pendingMembershipRequest?: PendingMembershipRequest | null;
      };
      setPendingMembershipRequestState(j.pendingMembershipRequest ?? null);

      if (j.effectivePlan === "premium" || j.effectivePlan === "elite") {
        applyServerEntitlement(user.id, j.effectivePlan, j.currentPeriodEnd ?? null);
      } else if (hasActivePaidMembership(getMembershipRecordForUser(user))) {
        applyServerFreeEntitlement(user.id);
      }
      refresh();
    } catch {
      /* offline / misconfigured */
    }
  }, [user, refresh]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) void syncServerEntitlement();
    });
    return () => {
      cancelled = true;
    };
  }, [syncServerEntitlement]);

  const value = useMemo<FireMembershipContextValue>(
    () => ({
      tier,
      record,
      refresh,
      setTierDemo,
      syncServerEntitlement,
      pendingMembershipRequest,
    }),
    [tier, record, refresh, setTierDemo, syncServerEntitlement, pendingMembershipRequest],
  );

  return <FireMembershipContext.Provider value={value}>{children}</FireMembershipContext.Provider>;
}

export function useFireMembership(): FireMembershipContextValue {
  const ctx = useContext(FireMembershipContext);
  if (!ctx) {
    throw new Error("useFireMembership must be used within FireMembershipProvider");
  }
  return ctx;
}
