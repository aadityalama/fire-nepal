import type { Metadata } from "next";
import { ExpenseDashboard, type ExpenseDashboardView } from "@/components/ExpenseDashboard";
import { buildCanonicalAlternates } from "@/lib/brand/site-seo";

export const metadata: Metadata = {
  title: "Expense Dashboard | FIRE Nepal",
  description:
    "Track personal and group expenses, categories, receipts, recurring costs, analytics, and reports inside FIRE Nepal.",
  alternates: buildCanonicalAlternates("/expense-dashboard"),
};

const EXPENSE_DASHBOARD_VIEWS = new Set<ExpenseDashboardView>([
  "dashboard",
  "expenses",
  "categories",
  "receipts",
  "recurring",
  "analytics",
  "reports",
]);

export default async function ExpenseDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ finance?: string; view?: string }>;
}) {
  const sp = await searchParams;
  const initialView = EXPENSE_DASHBOARD_VIEWS.has(sp.view as ExpenseDashboardView)
    ? (sp.view as ExpenseDashboardView)
    : undefined;

  return <ExpenseDashboard mode={sp.finance === "personal" ? "personal" : "group"} initialView={initialView} />;
}
