"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useProductAuth } from "@/contexts/ProductAuthContext";
import {
  defaultMembershipRecord,
  type FireMembershipRecord,
  type FireMembershipTier,
} from "@/lib/fire-membership";
import type { CanonicalMembership } from "@/lib/membership/canonical";
import { deriveCanonicalMembership } from "@/lib/membership/canonical";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  MEMBERSHIP_UPDATED_EVENT,
  broadcastMembershipUpdated,
} from "@/services/membership-service";

export type PendingMembershipRequest = { plan: "premium" | "elite" };

type FireMembershipContextValue = {
  tier: FireMembershipTier;
  /** Access-oriented record (accessPlan) for feature gates. */
  record: FireMembershipRecord;
  /** Canonical SOT snapshot from user_profiles (plan display). */
  membership: CanonicalMembership;
  /** Anonymous / logged out → free + default record (not persisted). */
  refresh: () => void;
  /** @deprecated Demo tier mutation disabled when Supabase is configured — SOT is user_profiles. */
  setTierDemo: (tier: FireMembershipTier) => void;
  /** Pull server truth from MembershipService (/api/membership/entitlement → user_profiles). */
  syncServerEntitlement: () => Promise<CanonicalMembership | null>;
  /** Latest `membership_requests` row with status pending (UI only; never grants access). */
  pendingMembershipRequest: PendingMembershipRequest | null;
};

const FireMembershipContext = createContext<FireMembershipContextValue | null>(null);

function emptyMembership(userId = ""): CanonicalMembership {
  return deriveCanonicalMembership(null, userId);
}

function recordFromCanonical(canonical: CanonicalMembership): FireMembershipRecord {
  const base = defaultMembershipRecord();
  const paid = canonical.accessPlan === "premium" || canonical.accessPlan === "elite";
  return {
    ...base,
    tier: canonical.accessPlan,
    status: paid ? "active" : "none",
    currentPeriodEnd: paid ? canonical.membershipExpiry : null,
    trialEndsAt: null,
  };
}

export function FireMembershipProvider({ children }: { children: ReactNode }) {
  const { user } = useProductAuth();
  const [membership, setMembership] = useState<CanonicalMembership>(() => emptyMembership());
  const [pendingMembershipRequestState, setPendingMembershipRequestState] = useState<PendingMembershipRequest | null>(
    null,
  );
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  const syncServerEntitlement = useCallback(async (): Promise<CanonicalMembership | null> => {
    if (!user) {
      setMembership(emptyMembership());
      setPendingMembershipRequestState(null);
      return emptyMembership();
    }
    if (!isSupabaseConfigured()) {
      const local = emptyMembership(user.id);
      setMembership(local);
      return local;
    }
    try {
      const r = await fetch("/api/membership/entitlement", { credentials: "include", cache: "no-store" });
      if (!r.ok) return null;
      const j = (await r.json()) as {
        planType?: string;
        effectivePlan?: string;
        membershipStart?: string | null;
        membershipExpiry?: string | null;
        currentPeriodEnd?: string | null;
        suspendedAt?: string | null;
        archivedAt?: string | null;
        pendingMembershipRequest?: PendingMembershipRequest | null;
      };
      setPendingMembershipRequestState(j.pendingMembershipRequest ?? null);

      const plan = j.planType === "premium" || j.planType === "elite" ? j.planType : "free";
      const next = deriveCanonicalMembership(
        {
          id: user.id,
          membership_plan: plan,
          membership_start: j.membershipStart ?? null,
          membership_expiry: j.membershipExpiry ?? j.currentPeriodEnd ?? null,
          membership_suspended_at: j.suspendedAt ?? null,
          membership_archived_at: j.archivedAt ?? null,
        },
        user.id,
      );
      setMembership(next);

      // Purge legacy localStorage plan cache so stale Free/Elite mismatches cannot resurface.
      try {
        window.localStorage.removeItem("fire-nepal-membership-v1");
      } catch {
        /* ignore */
      }
      return next;
    } catch {
      /* offline / misconfigured */
      return null;
    }
  }, [user]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) void syncServerEntitlement();
    });
    return () => {
      cancelled = true;
    };
  }, [syncServerEntitlement, tick]);

  useEffect(() => {
    const onUpdated = () => {
      void syncServerEntitlement();
    };
    window.addEventListener(MEMBERSHIP_UPDATED_EVENT, onUpdated);
    window.addEventListener("focus", onUpdated);
    return () => {
      window.removeEventListener(MEMBERSHIP_UPDATED_EVENT, onUpdated);
      window.removeEventListener("focus", onUpdated);
    };
  }, [syncServerEntitlement]);

  const record = useMemo(() => recordFromCanonical(membership), [membership]);
  /** Feature-gate tier (free when suspended/archived/expired). Display plan is membership.plan. */
  const tier = membership.accessPlan;
  const pendingMembershipRequest = user ? pendingMembershipRequestState : null;

  const setTierDemo = useCallback(
    (next: FireMembershipTier) => {
      // Never write paid tiers locally when Supabase is the SOT.
      if (!user || isSupabaseConfigured()) return;
      setMembership(
        deriveCanonicalMembership(
          {
            id: user.id,
            membership_plan: next,
            membership_start: next === "free" ? null : new Date().toISOString(),
            membership_expiry:
              next === "free" ? null : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
            membership_suspended_at: null,
            membership_archived_at: null,
          },
          user.id,
        ),
      );
      broadcastMembershipUpdated(user.id);
    },
    [user],
  );

  const value = useMemo<FireMembershipContextValue>(
    () => ({
      tier,
      record,
      membership,
      refresh,
      setTierDemo,
      syncServerEntitlement,
      pendingMembershipRequest,
    }),
    [tier, record, membership, refresh, setTierDemo, syncServerEntitlement, pendingMembershipRequest],
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
