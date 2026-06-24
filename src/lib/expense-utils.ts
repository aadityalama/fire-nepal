export type Currency = "NPR" | "KRW" | "USD";

export type Expense = {
  id: number;
  title: string;
  amount: number;
  payerId: string;
  category: string;
  splitEqually: boolean;
  date: string;
  notes?: string;
  receiptImage?: string;
  /** Currency used when this expense amount was entered (NPR base is always stored in `amount`) */
  amountCurrency?: "NPR" | "KRW";
  /** Member ids who share this expense; omit or empty = entire group */
  splitAmong?: string[];
  /** When splitEqually is false, weights by member id (0–100+); normalized on settlement */
  splitPercentages?: Record<string, number>;
};

export type RoommateProfile = {
  name: string;
  avatarUrl?: string;
  phone: string;
  kakaoId: string;
  bankName: string;
  accountNumber: string;
  emergencyContact: string;
  notes: string;
};

export const currencyMeta = {
  NPR: { symbol: "रु", rate: 1 },
  KRW: { symbol: "₩", rate: 9.27 },
  USD: { symbol: "$", rate: 0.0075 },
};

export function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function formatMoney(amount: number, currency: Currency) {
  const converted = amount * currencyMeta[currency].rate;
  const maximumFractionDigits = currency === "USD" ? 2 : 0;

  return `${currencyMeta[currency].symbol} ${converted.toLocaleString("en-US", {
    maximumFractionDigits,
  })}`;
}

export function formatSignedMoney(amount: number, currency: Currency) {
  const symbol = currencyMeta[currency].symbol;
  const converted = Math.abs(amount) * currencyMeta[currency].rate;
  const maximumFractionDigits = currency === "USD" ? 2 : 0;
  const value = converted.toLocaleString("en-US", { maximumFractionDigits });

  if (amount > 1) return `+${symbol}${value}`;
  if (amount < -1) return `-${symbol}${value}`;
  return `${symbol}${value}`;
}

export function expenseEntryCurrency(displayCurrency: Currency): "NPR" | "KRW" {
  return displayCurrency === "KRW" ? "KRW" : "NPR";
}

export function expenseMonthKey(date: string) {
  return date.slice(0, 7);
}

export function currentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

/** NPR attributed to each member for one expense (their fair share). */
export function expenseAttributedShares(expense: Expense, groupMembers: string[]): Record<string, number> {
  const out: Record<string, number> = Object.fromEntries(groupMembers.map((m) => [m, 0]));
  const involvedRaw =
    expense.splitAmong && expense.splitAmong.length > 0
      ? expense.splitAmong.filter((m) => groupMembers.includes(m))
      : [...groupMembers];
  const involved = involvedRaw.length > 0 ? involvedRaw : [...groupMembers];
  const n = involved.length;
  if (n === 0 || expense.amount <= 0) return out;

  const useEqual = expense.splitEqually !== false;

  if (useEqual) {
    const each = expense.amount / n;
    for (const m of involved) out[m] = each;
    return out;
  }

  const weights = involved.map((m) => ({
    m,
    w: Math.max(0, expense.splitPercentages?.[m] ?? 100 / n),
  }));
  const sumW = weights.reduce((s, x) => s + x.w, 0) || 1;
  for (const { m, w } of weights) {
    out[m] = (expense.amount * w) / sumW;
  }
  return out;
}

export function getSettlement(members: string[], expenses: Expense[]) {
  const totalExpense = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const memberExpectedShare = Object.fromEntries(members.map((m) => [m, 0])) as Record<string, number>;
  for (const expense of expenses) {
    const shares = expenseAttributedShares(expense, members);
    for (const m of members) {
      memberExpectedShare[m] += shares[m] ?? 0;
    }
  }
  const equalSplitAmount = totalExpense / Math.max(members.length, 1);
  const paidByMember = Object.fromEntries(
    members.map((member) => [
      member,
      expenses
        .filter((expense) => expense.payerId === member)
        .reduce((sum, expense) => sum + expense.amount, 0),
    ]),
  );
  const balances = Object.fromEntries(
    members.map((member) => [member, paidByMember[member] - memberExpectedShare[member]]),
  );

  const creditors = Object.entries(balances)
    .filter(([, amount]) => amount > 1)
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount);
  const debtors = Object.entries(balances)
    .filter(([, amount]) => amount < -1)
    .map(([name, amount]) => ({ name, amount: Math.abs(amount) }))
    .sort((a, b) => b.amount - a.amount);
  const transfers: Array<{ from: string; to: string; amount: number }> = [];
  let debtorIndex = 0;
  let creditorIndex = 0;

  while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
    const amount = Math.min(debtors[debtorIndex].amount, creditors[creditorIndex].amount);
    transfers.push({
      from: debtors[debtorIndex].name,
      to: creditors[creditorIndex].name,
      amount,
    });
    debtors[debtorIndex].amount -= amount;
    creditors[creditorIndex].amount -= amount;

    if (debtors[debtorIndex].amount < 1) debtorIndex += 1;
    if (creditors[creditorIndex].amount < 1) creditorIndex += 1;
  }

  return { balances, equalSplitAmount, memberExpectedShare, paidByMember, totalExpense, transfers };
}
