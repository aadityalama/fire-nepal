import {
  COL_EXPENSE_META,
  COL_PLAN_STORAGE_KEY,
  defaultColPlan,
  emptyColPlan,
  resetColPlanData,
  sanitizeColPlan,
  type ColPlanState,
} from "@/lib/nepal-col-dashboard";

export const COL_PLAN_PERSIST_VERSION = 3 as const;

export type ColPlanPersistedDocument = {
  version: typeof COL_PLAN_PERSIST_VERSION;
  updatedAt: string;
  plan: ColPlanState;
};

export function colPlanStorageKey(userId?: string | null): string {
  return userId ? `${COL_PLAN_STORAGE_KEY}:${userId}` : COL_PLAN_STORAGE_KEY;
}

function parseDocument(raw: string | null): ColPlanPersistedDocument | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<ColPlanPersistedDocument> | ColPlanState;
    if (parsed && typeof parsed === "object" && "plan" in parsed && parsed.plan) {
      return {
        version: COL_PLAN_PERSIST_VERSION,
        updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : new Date().toISOString(),
        plan: sanitizeColPlan(parsed.plan),
      };
    }
    return {
      version: COL_PLAN_PERSIST_VERSION,
      updatedAt: new Date().toISOString(),
      plan: sanitizeColPlan(parsed),
    };
  } catch {
    return null;
  }
}

export function loadColPlanDocument(userId?: string | null): ColPlanPersistedDocument {
  if (typeof window === "undefined") {
    return { version: COL_PLAN_PERSIST_VERSION, updatedAt: new Date().toISOString(), plan: defaultColPlan() };
  }
  const key = colPlanStorageKey(userId);
  const doc = parseDocument(window.localStorage.getItem(key));
  if (doc) return doc;
  return {
    version: COL_PLAN_PERSIST_VERSION,
    updatedAt: new Date().toISOString(),
    plan: defaultColPlan(),
  };
}

export function saveColPlanDocument(plan: ColPlanState, userId?: string | null): ColPlanPersistedDocument {
  const document: ColPlanPersistedDocument = {
    version: COL_PLAN_PERSIST_VERSION,
    updatedAt: new Date().toISOString(),
    plan: sanitizeColPlan(plan),
  };
  if (typeof window === "undefined") return document;
  try {
    window.localStorage.setItem(colPlanStorageKey(userId), JSON.stringify(document));
  } catch {
    /* quota / private mode */
  }
  return document;
}

/** Remove stale browser cache for an authenticated user (never used as SoT after login). */
export function clearColPlanLocalCache(userId: string): void {
  if (typeof window === "undefined" || !userId) return;
  try {
    window.localStorage.removeItem(colPlanStorageKey(userId));
  } catch {
    /* private mode */
  }
}

/**
 * Persist a fully cleared Cost of Living plan for the guest/local slot (or user cache).
 * Only writes the `nepal_col` storage key — other module keys are untouched.
 */
export function persistResetColPlanData(userId?: string | null): ColPlanPersistedDocument {
  return saveColPlanDocument(resetColPlanData(), userId ?? null);
}

/** True when the plan matches the empty reset slate (no user amounts / no suggested dataset). */
export function isClearedColPlan(plan: ColPlanState): boolean {
  const empty = emptyColPlan();
  return (
    plan.monthlyIncomeNpr === empty.monthlyIncomeNpr &&
    plan.monthlyKoreaSpendNpr === empty.monthlyKoreaSpendNpr &&
    plan.lifestyle === empty.lifestyle &&
    plan.family.adults === empty.family.adults &&
    plan.family.children === empty.family.children &&
    plan.family.parents === empty.family.parents &&
    COL_EXPENSE_META.every((meta) => plan.expenses[meta.id] === 0)
  );
}

/** Copy anonymous plan into the signed-in user's storage slot on first login (guest-only migration). */
export function migrateAnonymousColPlanToUser(userId: string): ColPlanState | null {
  if (typeof window === "undefined" || !userId) return null;
  const userKey = colPlanStorageKey(userId);
  const anonKey = colPlanStorageKey(null);
  if (userKey === anonKey) return null;

  const existingUserDoc = parseDocument(window.localStorage.getItem(userKey));
  if (existingUserDoc) return null;

  const anonDoc = parseDocument(window.localStorage.getItem(anonKey));
  if (!anonDoc) return null;

  saveColPlanDocument(anonDoc.plan, userId);
  return anonDoc.plan;
}
