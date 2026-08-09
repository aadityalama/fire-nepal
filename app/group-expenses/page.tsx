import type { Metadata } from "next";
import { ExpenseDashboard } from "@/components/ExpenseDashboard";
import { buildCanonicalAlternates } from "@/lib/brand/site-seo";

export const metadata: Metadata = {
  title: "Group/Roommate Expenses | FIRE Nepal",
  description:
    "Shared group and roommate bills, splits, and settlements inside FIRE Nepal — isolated from personal finance.",
  alternates: buildCanonicalAlternates("/group-expenses"),
};

export default function GroupExpensesPage() {
  return <ExpenseDashboard mode="group" />;
}
