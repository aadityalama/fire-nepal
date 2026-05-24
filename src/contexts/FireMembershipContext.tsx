"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useProductAuth } from "@/contexts/ProductAuthContext";
import {
  applyDemoTierChange,
  defaultMembershipRecord,
  getMembershipRecordForUser,
  type FireMembershipRecord,
  type FireMembershipTier,
} from "@/lib/fire-membership";

type FireMembershipContextValue = {
  tier: FireMembershipTier;
  record: FireMembershipRecord;
  /** Anonymous / logged out → free + default record (not persisted). */
  refresh: () => void;
  setTierDemo: (tier: FireMembershipTier) => void;
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

  const value = useMemo<FireMembershipContextValue>(
    () => ({
      tier,
      record,
      refresh,
      setTierDemo,
    }),
    [tier, record, refresh, setTierDemo],
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
