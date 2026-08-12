"use client";

import { useCallback, useEffect, useState } from "react";
import { useProductAuth } from "@/contexts/ProductAuthContext";
import { INSURANCE_MODULE_SYNC_EVENT } from "@/lib/cashflow/live-sync-events";
import { fetchInsurancePolicies } from "@/lib/insurance/insurance-api";
import {
  loadInsuranceWorkspaceState,
  replaceInsuranceCacheWithCloud,
} from "@/lib/insurance/insurance-storage";
import type { InsurancePolicy } from "@/lib/insurance/insurance-types";
import { isSupabaseConfigured } from "@/lib/supabase/config";

/**
 * Canonical insurance policies for Return Checklist / readiness.
 * Authenticated: Supabase via /api/insurance (same as Insurance workspace).
 * Guests: localStorage workspace cache.
 */
export function useInsurancePoliciesLive(): {
  policies: InsurancePolicy[];
  loading: boolean;
  resync: () => void;
} {
  const { user } = useProductAuth();
  const uid = user?.id;
  const [policies, setPolicies] = useState<InsurancePolicy[]>(() =>
    typeof window === "undefined" ? [] : loadInsuranceWorkspaceState().policies,
  );
  const [loading, setLoading] = useState(Boolean(uid));

  const resync = useCallback(() => {
    let cancelled = false;
    void (async () => {
      if (uid && isSupabaseConfigured()) {
        setLoading(true);
        try {
          const remote = await fetchInsurancePolicies();
          if (cancelled) return;
          replaceInsuranceCacheWithCloud(remote.policies);
          setPolicies(remote.policies);
        } catch {
          if (!cancelled) setPolicies(loadInsuranceWorkspaceState().policies);
        } finally {
          if (!cancelled) setLoading(false);
        }
        return;
      }
      if (!cancelled) {
        setPolicies(loadInsuranceWorkspaceState().policies);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [uid]);

  useEffect(() => {
    const cancel = resync();
    return cancel;
  }, [resync]);

  useEffect(() => {
    const onSync = () => {
      if (uid && isSupabaseConfigured()) {
        void fetchInsurancePolicies()
          .then((remote) => {
            replaceInsuranceCacheWithCloud(remote.policies);
            setPolicies(remote.policies);
          })
          .catch(() => setPolicies(loadInsuranceWorkspaceState().policies));
        return;
      }
      setPolicies(loadInsuranceWorkspaceState().policies);
    };
    window.addEventListener(INSURANCE_MODULE_SYNC_EVENT, onSync);
    window.addEventListener("focus", onSync);
    return () => {
      window.removeEventListener(INSURANCE_MODULE_SYNC_EVENT, onSync);
      window.removeEventListener("focus", onSync);
    };
  }, [uid]);

  return { policies, loading, resync };
}
