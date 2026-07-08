import type { BudgetRecord, CreateBudgetInput } from "@/lib/budget/types";

async function parseJson<T>(res: Response): Promise<T> {
  return res.json() as Promise<T>;
}

export async function fetchBudgetRecords(): Promise<BudgetRecord[]> {
  const res = await fetch("/api/budgets", { credentials: "include", cache: "no-store" });
  const json = await parseJson<{ ok: boolean; budgets?: BudgetRecord[]; error?: string }>(res);
  if (!res.ok || !json.ok) {
    throw new Error(json.error ?? "Could not load budgets.");
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
    throw new Error(json.error ?? "Could not save budget.");
  }
  return json.budget;
}
