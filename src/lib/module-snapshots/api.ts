import type { ModuleSnapshotKey } from "@/lib/module-snapshots/keys";

/** Bound cloud snapshot reads/writes so a hung API cannot blank the UI forever. */
export const MODULE_SNAPSHOT_TIMEOUT_MS = 12_000;

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

async function fetchWithTimeout(input: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchModuleSnapshot<T>(moduleKey: ModuleSnapshotKey): Promise<T | null> {
  try {
    const res = await fetchWithTimeout(
      `/api/module-snapshots/${encodeURIComponent(moduleKey)}`,
      { credentials: "include", cache: "no-store" },
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
  } catch (error) {
    if (
      (error instanceof DOMException && error.name === "AbortError") ||
      (error instanceof Error && error.name === "AbortError")
    ) {
      throw new ModuleSnapshotTimeoutError(moduleKey, "load");
    }
    throw error;
  }
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
