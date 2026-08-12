import type { ModuleSnapshotKey } from "@/lib/module-snapshots/keys";

/** Bound cloud snapshot reads/writes so a hung API cannot blank the UI forever. */
export const MODULE_SNAPSHOT_TIMEOUT_MS = 12_000;

/**
 * Client memory TTL for GET responses. Prevents remount / navigation storms from
 * re-hitting `/api/module-snapshots/[moduleKey]` (auth'd private data — not CDN-cacheable).
 */
export const MODULE_SNAPSHOT_CLIENT_CACHE_TTL_MS = 60_000;

class ModuleSnapshotTimeoutError extends Error {
  constructor(moduleKey: string, action: "load" | "save") {
    super(
      action === "load"
        ? `Timed out loading ${moduleKey} from cloud. Check your connection and retry.`
        : `Timed out saving ${moduleKey} to cloud. Check your connection and retry.`,
    );
    this.name = "ModuleSnapshotTimeoutError";
  }
}

type CacheEntry = {
  expiresAt: number;
  /** Parsed module state (or null when no row). */
  state: unknown;
};

const inflightLoads = new Map<string, Promise<unknown>>();
const loadCache = new Map<string, CacheEntry>();

function cacheKey(moduleKey: ModuleSnapshotKey): string {
  return moduleKey;
}

/** Drop cached GET for a module (call after successful PUT or forced refresh). */
export function invalidateModuleSnapshotCache(moduleKey?: ModuleSnapshotKey): void {
  if (moduleKey) {
    loadCache.delete(cacheKey(moduleKey));
    inflightLoads.delete(cacheKey(moduleKey));
    return;
  }
  loadCache.clear();
  inflightLoads.clear();
}

function readCache(moduleKey: ModuleSnapshotKey): unknown | undefined {
  const entry = loadCache.get(cacheKey(moduleKey));
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    loadCache.delete(cacheKey(moduleKey));
    return undefined;
  }
  return entry.state;
}

function writeCache(moduleKey: ModuleSnapshotKey, state: unknown): void {
  loadCache.set(cacheKey(moduleKey), {
    state,
    expiresAt: Date.now() + MODULE_SNAPSHOT_CLIENT_CACHE_TTL_MS,
  });
}

async function fetchWithTimeout(input: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function loadModuleSnapshotNetwork<T>(moduleKey: ModuleSnapshotKey): Promise<T | null> {
  const res = await fetchWithTimeout(
    `/api/module-snapshots/${encodeURIComponent(moduleKey)}`,
    {
      credentials: "include",
      // Prefer private HTTP revalidation when the route sends Cache-Control; still
      // dedupe via the in-memory layer for Strict Mode / remount storms.
      headers: { Accept: "application/json" },
    },
    MODULE_SNAPSHOT_TIMEOUT_MS,
  );
  const json = (await res.json()) as {
    ok: boolean;
    snapshot?: { state: T } | null;
    error?: string;
  };
  if (!res.ok || !json.ok) {
    throw new Error(json.error ?? `Could not load ${moduleKey} from Supabase.`);
  }
  return json.snapshot?.state ?? null;
}

/**
 * Load a module snapshot with:
 * - in-flight promise dedupe (Strict Mode / parallel mounts)
 * - short TTL memory cache (navigation remounts)
 */
export async function fetchModuleSnapshot<T>(
  moduleKey: ModuleSnapshotKey,
  opts?: { force?: boolean },
): Promise<T | null> {
  const key = cacheKey(moduleKey);

  if (!opts?.force) {
    const cached = readCache(moduleKey);
    if (cached !== undefined) {
      return cached as T | null;
    }
    const pending = inflightLoads.get(key);
    if (pending) {
      return (await pending) as T | null;
    }
  } else {
    invalidateModuleSnapshotCache(moduleKey);
  }

  const request = (async () => {
    try {
      const state = await loadModuleSnapshotNetwork<T>(moduleKey);
      writeCache(moduleKey, state);
      return state;
    } catch (error) {
      if (
        (error instanceof DOMException && error.name === "AbortError") ||
        (error instanceof Error && error.name === "AbortError")
      ) {
        throw new ModuleSnapshotTimeoutError(moduleKey, "load");
      }
      throw error;
    } finally {
      inflightLoads.delete(key);
    }
  })();

  inflightLoads.set(key, request);
  return request;
}

export async function saveModuleSnapshotToCloud<T>(moduleKey: ModuleSnapshotKey, state: T): Promise<void> {
  try {
    const res = await fetchWithTimeout(
      `/api/module-snapshots/${encodeURIComponent(moduleKey)}`,
      {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state }),
      },
      MODULE_SNAPSHOT_TIMEOUT_MS,
    );
    const json = (await res.json()) as { ok: boolean; error?: string };
    if (!res.ok || !json.ok) {
      throw new Error(json.error ?? `Could not save ${moduleKey} to Supabase.`);
    }
    // Keep client cache coherent so remounts do not immediately re-GET stale/null.
    writeCache(moduleKey, state);
  } catch (error) {
    if (
      (error instanceof DOMException && error.name === "AbortError") ||
      (error instanceof Error && error.name === "AbortError")
    ) {
      throw new ModuleSnapshotTimeoutError(moduleKey, "save");
    }
    throw error;
  }
}
