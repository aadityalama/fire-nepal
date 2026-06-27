import {
  COL_PLAN_STORAGE_KEY,
  defaultColPlan,
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

/** Copy anonymous plan into the signed-in user's storage slot on first login. */
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
