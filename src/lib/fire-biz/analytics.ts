import type {
  BizTransactionRow,
  CustomerRow,
  FireBizAnalytics,
  FireBizDashboardSummary,
  FireBizFireIntegration,
  PurchaseRow,
  SaleRow,
} from "@/lib/fire-biz/types";

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function currentMonthKey(): string {
  return monthKey(new Date());
}

function previousMonthKey(): string {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return monthKey(d);
}

function inMonth(dateStr: string, key: string): boolean {
  return dateStr.startsWith(key);
}

function lastNMonthKeys(n: number): string[] {
  const keys: string[] = [];
  const d = new Date();
  for (let i = n - 1; i >= 0; i -= 1) {
    const copy = new Date(d.getFullYear(), d.getMonth() - i, 1);
    keys.push(monthKey(copy));
  }
  return keys;
}

function formatMonthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

export function sumMonthlySales(sales: SaleRow[], month = currentMonthKey()): number {
  return sales.filter((s) => inMonth(s.sale_date, month)).reduce((sum, s) => sum + Number(s.total_amount), 0);
}

export function sumMonthlyPurchases(purchases: PurchaseRow[], month = currentMonthKey()): number {
  return purchases.filter((p) => inMonth(p.purchase_date, month)).reduce((sum, p) => sum + Number(p.total_amount), 0);
}

export function sumMonthlyExpenses(transactions: BizTransactionRow[], month = currentMonthKey()): number {
  return transactions
    .filter((t) => inMonth(t.transaction_date, month) && t.transaction_type === "expense")
    .reduce((sum, t) => sum + Number(t.amount), 0);
}

export function computeFireBizAnalytics(
  sales: SaleRow[],
  purchases: PurchaseRow[],
  transactions: BizTransactionRow[],
  customers: CustomerRow[],
  summary: FireBizDashboardSummary,
): FireBizAnalytics {
  const monthKeys = lastNMonthKeys(6);

  const salesTrend = monthKeys.map((key) => ({
    month: formatMonthLabel(key),
    sales: sales.filter((s) => inMonth(s.sale_date, key)).reduce((sum, s) => sum + Number(s.total_amount), 0),
    purchases: purchases.filter((p) => inMonth(p.purchase_date, key)).reduce((sum, p) => sum + Number(p.total_amount), 0),
  }));

  const expenseMap = new Map<string, number>();
  for (const tx of transactions) {
    if (tx.transaction_type !== "expense") continue;
    const label = tx.party_name?.trim() || tx.reference_type?.trim() || "General";
    expenseMap.set(label, (expenseMap.get(label) ?? 0) + Number(tx.amount));
  }
  const expenseBreakdown = Array.from(expenseMap.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  const profitOverview = monthKeys.map((key) => {
    const salesAmt = sales.filter((s) => inMonth(s.sale_date, key)).reduce((sum, s) => sum + Number(s.total_amount), 0);
    const purchaseAmt = purchases.filter((p) => inMonth(p.purchase_date, key)).reduce((sum, p) => sum + Number(p.total_amount), 0);
    const expenseAmt = transactions
      .filter((t) => inMonth(t.transaction_date, key) && t.transaction_type === "expense")
      .reduce((sum, t) => sum + Number(t.amount), 0);
    return { month: formatMonthLabel(key), profit: salesAmt - purchaseAmt - expenseAmt, sales: salesAmt, expenses: expenseAmt };
  });

  const topCustomers = customers
    .filter((c) => Number(c.balance) > 0)
    .sort((a, b) => Number(b.balance) - Number(a.balance))
    .slice(0, 5)
    .map((c) => ({ name: c.name, balance: Number(c.balance) }));

  const outstandingReceivables = customers
    .filter((c) => Number(c.balance) > 0)
    .sort((a, b) => Number(b.balance) - Number(a.balance))
    .slice(0, 8)
    .map((c) => ({ name: c.name, amount: Number(c.balance), dueLabel: c.phone ?? "—" }));

  return {
    salesTrend,
    expenseBreakdown,
    profitOverview,
    inventoryValue: summary.inventoryValue,
    topCustomers,
    outstandingReceivables,
  };
}

/** FIRE desk heuristic: monthly living target NPR 75k × 25 = NPR 1.875M corpus band. */
const FIRE_MONTHLY_TARGET_NPR = 75_000;
const FIRE_CORPUS_MULTIPLIER = 25;

export function computeFireBizFireIntegration(summary: FireBizDashboardSummary): FireBizFireIntegration {
  const businessNetWorth = summary.cashBalance + summary.inventoryValue + summary.receivables - summary.payables;
  const monthlyBusinessProfit = summary.monthlySales - summary.monthlyPurchases - summary.monthlyExpenses;

  const prevMonthSales = 0; // computed at summary level if needed; use growth from profit trend instead
  const fireCorpusTarget = FIRE_MONTHLY_TARGET_NPR * FIRE_CORPUS_MULTIPLIER;
  const businessContributionPct = fireCorpusTarget > 0 ? Math.min(100, Math.max(0, (businessNetWorth / fireCorpusTarget) * 100)) : 0;

  const cur = summary.monthlySales - summary.monthlyPurchases - summary.monthlyExpenses;
  const growthPct =
    cur !== 0 && businessNetWorth > 0
      ? Math.round((monthlyBusinessProfit / Math.max(1, Math.abs(businessNetWorth - monthlyBusinessProfit))) * 100)
      : 0;

  return {
    businessNetWorth,
    monthlyBusinessProfit,
    businessContributionPct,
    businessWealthGrowthPct: Math.min(999, Math.max(-999, growthPct)),
    fireCorpusTarget,
    prevMonthSales,
  };
}
