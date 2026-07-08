export type IncomeFrequency = "once" | "weekly" | "monthly" | "yearly";

export type CashflowIncomeTypeId =
  | "salary"
  | "overtime"
  | "bonus"
  | "dividend"
  | "rental"
  | "business"
  | "freelance"
  | "other";

export const CASHFLOW_INCOME_TYPES: {
  id: CashflowIncomeTypeId;
  label: string;
  emoji: string;
}[] = [
  { id: "salary", label: "Salary", emoji: "💼" },
  { id: "overtime", label: "Overtime", emoji: "🕒" },
  { id: "bonus", label: "Bonus", emoji: "🎁" },
  { id: "dividend", label: "Dividend", emoji: "📈" },
  { id: "rental", label: "Rental Income", emoji: "🏠" },
  { id: "business", label: "Business", emoji: "🏢" },
  { id: "freelance", label: "Freelance", emoji: "🧑‍💻" },
  { id: "other", label: "Other Income", emoji: "💰" },
];

export const INCOME_FREQUENCY_OPTIONS: { id: IncomeFrequency; label: string }[] = [
  { id: "once", label: "One-time" },
  { id: "weekly", label: "Weekly" },
  { id: "monthly", label: "Monthly" },
  { id: "yearly", label: "Yearly" },
];

export function getIncomeTypeMeta(id: CashflowIncomeTypeId) {
  return CASHFLOW_INCOME_TYPES.find((item) => item.id === id) ?? CASHFLOW_INCOME_TYPES[7];
}

export function getFrequencyLabel(id: IncomeFrequency) {
  return INCOME_FREQUENCY_OPTIONS.find((item) => item.id === id)?.label ?? "One-time";
}

/** Map legacy incomeSource / old type ids after schema changes. */
export function normalizeIncomeType(raw: string): CashflowIncomeTypeId {
  if (raw === "rental") return "rental";
  if (raw === "freelance") return "freelance";
  if (CASHFLOW_INCOME_TYPES.some((item) => item.id === raw)) return raw as CashflowIncomeTypeId;
  return "other";
}

export function normalizeIncomeFrequency(entry: {
  frequency?: IncomeFrequency;
  repeatMonthly?: boolean;
}): IncomeFrequency {
  if (entry.frequency && INCOME_FREQUENCY_OPTIONS.some((item) => item.id === entry.frequency)) {
    return entry.frequency;
  }
  if (entry.repeatMonthly) return "monthly";
  return "once";
}
