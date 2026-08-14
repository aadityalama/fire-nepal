/**
 * Pure validation helpers for Finance Add/Edit Expense forms.
 * Shared by workspace Add sheet, dashboard modal, and tests.
 */

export type ExpenseFormFields = {
  title: string;
  amount: string;
  category: string;
  date: string;
};

export type ExpenseFormValidation = {
  ok: boolean;
  amountNpr: number;
  title: string;
  category: string;
  date: string;
  error: string | null;
};

/** Parse amount strings like "1,200" or "1200.50" into a positive NPR number. */
export function parseExpenseFormAmount(raw: string): number | null {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed || trimmed.startsWith("-")) return null;
  const cleaned = trimmed.replace(/,/g, "").replace(/[^\d.]/g, "").trim();
  if (!cleaned) return null;
  const amount = Number(cleaned);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return amount;
}

export function isExpenseFormDateValid(date: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(date ?? "").trim());
}

/**
 * Validate required Add Expense fields: name, category, amount, date.
 * Returns a structured result so UI and tests share one contract.
 */
export function validateExpenseFormFields(fields: ExpenseFormFields): ExpenseFormValidation {
  const title = String(fields.title ?? "").trim();
  const category = String(fields.category ?? "").trim();
  const date = String(fields.date ?? "").trim();
  const amountNpr = parseExpenseFormAmount(fields.amount);

  if (!title) {
    return { ok: false, amountNpr: 0, title, category, date, error: "Enter an expense name." };
  }
  if (!category) {
    return { ok: false, amountNpr: 0, title, category, date, error: "Choose a category." };
  }
  if (amountNpr === null) {
    return { ok: false, amountNpr: 0, title, category, date, error: "Enter a valid amount greater than 0." };
  }
  if (!isExpenseFormDateValid(date)) {
    return { ok: false, amountNpr: amountNpr ?? 0, title, category, date, error: "Pick a valid expense date." };
  }

  return { ok: true, amountNpr, title, category, date, error: null };
}
