import type { SavingsWorkspaceState } from "@/lib/savings/savings-types";

async function parseJson<T>(res: Response): Promise<T> {
  return res.json() as Promise<T>;
}

export async function fetchSavingsWorkspace(): Promise<SavingsWorkspaceState | null> {
  const res = await fetch("/api/savings", { credentials: "include", cache: "no-store" });
  const json = await parseJson<{
    ok: boolean;
    snapshot?: { state: SavingsWorkspaceState; updatedAt: string } | null;
    error?: string;
  }>(res);
  if (!res.ok || !json.ok) {
    throw new Error(json.error ?? "Could not load your savings workspace.");
  }
  return json.snapshot?.state ?? null;
}

export async function saveSavingsWorkspaceToCloud(state: SavingsWorkspaceState): Promise<SavingsWorkspaceState> {
  const res = await fetch("/api/savings", {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ state }),
  });
  const json = await parseJson<{
    ok: boolean;
    snapshot?: { state: SavingsWorkspaceState; updatedAt: string };
    error?: string;
  }>(res);
  if (!res.ok || !json.ok || !json.snapshot) {
    throw new Error(json.error ?? "Could not save your savings workspace.");
  }
  return json.snapshot.state;
}
