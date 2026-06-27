import "server-only";

import { compactLines } from "@/lib/fire-nepal-ai/context-modules/format";
import { getFireAiFinancialSnapshot } from "@/services/fire-ai-financial-snapshot";
import type { ExpenseTransactionRow } from "@/lib/transaction-history-types";

type AmountBucket = { amount: number; currency: string };

function monthKey(date: string): string {
  return date.slice(0, 7);
}

function addBucket(map: Map<string, AmountBucket>, key: string, row: ExpenseTransactionRow) {
  const existing = map.get(key) ?? { amount: 0, currency: row.currency || "NPR" };
  existing.amount += row.amount;
  if (existing.currency !== row.currency) existing.currency = "mixed";
  map.set(key, existing);
}

function formatBucket(bucket: AmountBucket | undefined): string {
  if (!bucket) return "0";
  const amount = Math.round(bucket.amount).toLocaleString("en-IN");
  return bucket.currency === "mixed" ? `${amount} (mixed currencies)` : `${bucket.currency} ${amount}`;
}

function topEntries(map: Map<string, AmountBucket>, limit: number): string {
  return Array.from(map.entries())
    .sort((a, b) => b[1].amount - a[1].amount)
    .slice(0, limit)
    .map(([label, bucket], index) => `${index + 1}. ${label || "Uncategorized"}: ${formatBucket(bucket)}`)
    .join("\n");
}

export async function buildExpenseInsightsContext(userId: string): Promise<string | null> {
  const snapshot = await getFireAiFinancialSnapshot(userId);
  const rows = snapshot.expenses.rows;

  if (rows.length === 0) {
    return compactLines([
      "Expense Tracker: no synced expense transaction data found in Supabase.",
      "If the user asks about expenses, clearly say there is not enough expense data yet and suggest tracking expenses in Expense Tracker.",
    ]);
  }

  const currentMonth = new Date().toISOString().slice(0, 7);
  const previousMonthDate = new Date();
  previousMonthDate.setUTCMonth(previousMonthDate.getUTCMonth() - 1);
  const previousMonth = previousMonthDate.toISOString().slice(0, 7);

  const byMonth = new Map<string, AmountBucket>();
  const byCategory = new Map<string, AmountBucket>();
  const currentByCategory = new Map<string, AmountBucket>();

  for (const row of rows) {
    addBucket(byMonth, monthKey(row.transaction_date), row);
    addBucket(byCategory, row.category || "Uncategorized", row);
    if (monthKey(row.transaction_date) === currentMonth) {
      addBucket(currentByCategory, row.category || "Uncategorized", row);
    }
  }

  const currentSpend = byMonth.get(currentMonth);
  const previousSpend = byMonth.get(previousMonth);
  const monthBuckets = Array.from(byMonth.entries()).sort(([a], [b]) => a.localeCompare(b));
  const averageMonthly =
    monthBuckets.length > 0
      ? monthBuckets.reduce((sum, [, bucket]) => sum + bucket.amount, 0) / monthBuckets.length
      : 0;
  const overspending =
    currentSpend && averageMonthly > 0 && currentSpend.amount > averageMonthly * 1.2
      ? `Current month appears above recent average by about ${Math.round(((currentSpend.amount / averageMonthly) - 1) * 100)}%.`
      : "No clear overspending signal from synced transactions.";

  return compactLines([
    `Profile: ${snapshot.profile.displayName ?? "member"}; membership: ${snapshot.profile.membershipPlan ?? "unknown"}; preferred currency: ${snapshot.profile.preferredCurrency ?? "not set"}.`,
    `Expense data window: ${rows.length} synced expense transactions from the last six months.`,
    `Current month (${currentMonth}) spending: ${formatBucket(currentSpend)}.`,
    `Previous month (${previousMonth}) spending: ${formatBucket(previousSpend)}.`,
    `Average monthly spending in synced data: ${formatBucket({ amount: averageMonthly, currency: currentSpend?.currency ?? previousSpend?.currency ?? "mixed" })}.`,
    `Spending trend by month: ${monthBuckets.map(([m, b]) => `${m}: ${formatBucket(b)}`).join("; ")}.`,
    `Highest categories overall:\n${topEntries(byCategory, 5)}`,
    currentByCategory.size > 0 ? `Current month category breakdown:\n${topEntries(currentByCategory, 5)}` : "Current month category breakdown: no current-month expense rows.",
    `Overspending detection: ${overspending}`,
    "Savings opportunities: focus first on the top 1-2 categories above; do not invent categories or amounts beyond this context.",
  ]);
}
