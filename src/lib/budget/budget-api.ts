import type { BudgetRecord, CreateBudgetInput } from "@/lib/budget/types";

async function parseJson<T>(res: Response): Promise<T> {
  return res.json() as Promise<T>;
}

export async function fetchBudgetRecords(): Promise<BudgetRecord[]> {
  const res = await fetch("/api/budgets", { credentials: "include", cache: "no-store" });
  const json = await parseJson<{ ok: boolean; budgets?: BudgetRecord[]; error?: string }>(res);
  if (!res.ok || !json.ok) {
    throw new Error(json.error ?? "Could not load your budgets. Please refresh and try again.");
  }
  return json.budgets ?? [];
}

export async function createBudgetRecord(input: CreateBudgetInput): Promise<BudgetRecord> {
  const res = await fetch("/api/budgets", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const json = await parseJson<{ ok: boolean; budget?: BudgetRecord; error?: string }>(res);
  if (!res.ok || !json.ok || !json.budget) {
    throw new Error(json.error ?? "Could not save your budget. Please check your connection and try again.");
  }
  return json.budget;
}

export async function updateBudgetRecord(id: string, input: CreateBudgetInput): Promise<BudgetRecord> {
  const res = await fetch(`/api/budgets/${encodeURIComponent(id)}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const json = await parseJson<{ ok: boolean; budget?: BudgetRecord; error?: string }>(res);
  if (!res.ok || !json.ok || !json.budget) {
    throw new Error(json.error ?? "Could not update your budget.");
  }
  return json.budget;
}

export async function deleteBudgetRecord(id: string): Promise<void> {
  const res = await fetch(`/api/budgets/${encodeURIComponent(id)}`, {
    method: "DELETE",
    credentials: "include",
  });
  const json = await parseJson<{ ok: boolean; error?: string }>(res);
  if (!res.ok || !json.ok) {
    throw new Error(json.error ?? "Could not delete your budget.");
  }
}
