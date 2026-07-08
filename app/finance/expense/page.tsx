import { redirect } from "next/navigation";
import type { ExpenseDashboardView } from "@/components/ExpenseDashboard";

const EXPENSE_DASHBOARD_VIEWS = new Set<ExpenseDashboardView>([
  "dashboard",
  "expenses",
  "categories",
  "receipts",
  "recurring",
  "analytics",
  "reports",
]);

/** Legacy `/finance/expense` → main Expense Dashboard (personal mode). */
export default async function FinanceExpenseRedirectPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const sp = await searchParams;
  const params = new URLSearchParams({ finance: "personal" });
  if (sp.view && EXPENSE_DASHBOARD_VIEWS.has(sp.view as ExpenseDashboardView)) {
    params.set("view", sp.view);
  }
  redirect(`/expense-dashboard?${params.toString()}`);
}
