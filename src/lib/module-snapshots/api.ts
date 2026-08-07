import type { ModuleSnapshotKey } from "@/lib/module-snapshots/keys";

export async function fetchModuleSnapshot<T>(moduleKey: ModuleSnapshotKey): Promise<T | null> {
  const res = await fetch(`/api/module-snapshots/${encodeURIComponent(moduleKey)}`, {
    credentials: "include",
    cache: "no-store",
  });
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

export async function saveModuleSnapshotToCloud<T>(moduleKey: ModuleSnapshotKey, state: T): Promise<void> {
  const res = await fetch(`/api/module-snapshots/${encodeURIComponent(moduleKey)}`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ state }),
  });
  const json = (await res.json()) as { ok: boolean; error?: string };
  if (!res.ok || !json.ok) {
    throw new Error(json.error ?? `Could not save ${moduleKey} to Supabase.`);
  }
}
