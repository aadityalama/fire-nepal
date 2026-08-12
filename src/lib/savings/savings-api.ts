import type { SavingsWorkspaceState } from "@/lib/savings/savings-types";

const SAVINGS_API_TIMEOUT_MS = 12_000;

async function parseJson<T>(res: Response): Promise<T> {
  return res.json() as Promise<T>;
}

async function fetchSavings(input: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SAVINGS_API_TIMEOUT_MS);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (error) {
    if (
      (error instanceof DOMException && error.name === "AbortError") ||
      (error instanceof Error && error.name === "AbortError")
    ) {
      throw new Error("Timed out loading savings workspace. Check your connection and retry.");
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchSavingsWorkspace(): Promise<SavingsWorkspaceState | null> {
  const res = await fetchSavings("/api/savings", { credentials: "include", cache: "no-store" });
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
  const res = await fetchSavings("/api/savings", {
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
