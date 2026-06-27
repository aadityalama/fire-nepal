"use client";

import { useCallback, useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { useProductAuth } from "@/contexts/ProductAuthContext";
import { defaultColPlan, sanitizeColPlan, type ColPlanState } from "@/lib/nepal-col-dashboard";
import {
  colPlanStorageKey,
  loadColPlanDocument,
  migrateAnonymousColPlanToUser,
  saveColPlanDocument,
  type ColPlanPersistedDocument,
} from "@/lib/nepal-col-storage";

/**
 * Cost-of-living plan state — local-first persistence keyed by signed-in user when available.
 */
export function useColPlanState(): {
  plan: ColPlanState;
  setPlan: Dispatch<SetStateAction<ColPlanState>>;
  hydrated: boolean;
  persistPlan: (next?: ColPlanState) => ColPlanPersistedDocument;
  userId: string | undefined;
} {
  const { user } = useProductAuth();
  const userId = user?.id;
  const storageKey = colPlanStorageKey(userId);
  const [plan, setPlanState] = useState<ColPlanState>(() => defaultColPlan());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(false);
    if (typeof window === "undefined") {
      setHydrated(true);
      return;
    }

    if (userId) {
      const migrated = migrateAnonymousColPlanToUser(userId);
      if (migrated) {
        setPlanState(migrated);
        setHydrated(true);
        return;
      }
    }

    const doc = loadColPlanDocument(userId);
    setPlanState(doc.plan);
    setHydrated(true);
  }, [storageKey, userId]);

  const setPlan = useCallback<Dispatch<SetStateAction<ColPlanState>>>(
    (value) => {
      setPlanState((current) => {
        const next = typeof value === "function" ? value(current) : value;
        const sanitized = sanitizeColPlan(next);
        saveColPlanDocument(sanitized, userId);
        return sanitized;
      });
    },
    [userId],
  );

  const persistPlan = useCallback(
    (next?: ColPlanState) => {
      const snapshot = sanitizeColPlan(next ?? plan);
      setPlanState(snapshot);
      return saveColPlanDocument(snapshot, userId);
    },
    [plan, userId],
  );

  return useMemo(
    () => ({ plan, setPlan, hydrated, persistPlan, userId }),
    [plan, setPlan, hydrated, persistPlan, userId],
  );
}
