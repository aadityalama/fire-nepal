"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useProductAuth } from "@/contexts/ProductAuthContext";
import {
  applyDemoTierChange,
  applyServerEntitlement,
  defaultMembershipRecord,
  getMembershipRecordForUser,
  type FireMembershipRecord,
  type FireMembershipTier,
} from "@/lib/fire-membership";
import { isSupabaseConfigured } from "@/lib/supabase/config";

type FireMembershipContextValue = {
  tier: FireMembershipTier;
  record: FireMembershipRecord;
  /** Anonymous / logged out → free + default record (not persisted). */
  refresh: () => void;
  setTierDemo: (tier: FireMembershipTier) => void;
  /** When Supabase is enabled, pull `profiles.plan_type` into local gates (e.g. after admin approval). */
  syncServerEntitlement: () => Promise<void>;
};

const FireMembershipContext = createContext<FireMembershipContextValue | null>(null);

export function FireMembershipProvider({ children }: { children: ReactNode }) {
  const { user } = useProductAuth();
  const [tick, setTick] = useState(0);

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

  const setTierDemo = useCallback(
    (next: FireMembershipTier) => {
      if (!user) return;
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
      const j = (await r.json()) as { planType?: string; currentPeriodEnd?: string | null };
      if (j.planType === "premium" || j.planType === "elite") {
        applyServerEntitlement(user.id, j.planType, j.currentPeriodEnd ?? null);
        refresh();
      }
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
    }),
    [tier, record, refresh, setTierDemo, syncServerEntitlement],
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
