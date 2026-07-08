"use client";

import { Banknote, PiggyBank, ReceiptText, Wallet } from "lucide-react";
import { DashboardAccessGuard } from "@/components/auth/DashboardAccessGuard";
import { EcosystemWorkspacePanel, type EcosystemWorkspaceItem } from "@/components/product/hub/EcosystemWorkspacePanel";

const FINANCE_ITEMS: EcosystemWorkspaceItem[] = [
  { href: "/cashflow-dashboard", label: "Cashflow", description: "Income, burn, savings rate, and runway.", icon: Wallet },
  { href: "/expense-dashboard?finance=personal", label: "Expense", description: "Personal expenses, categories, receipts, reports, and analytics.", icon: ReceiptText },
  { href: "/budget", label: "Budget", description: "Monthly budget workspace for FIRE planning.", icon: Banknote },
  { href: "/savings-tracker", label: "Savings", description: "Savings targets, glide path, and progress.", icon: PiggyBank },
];

export default function FinanceWorkspacePage() {
  return (
    <DashboardAccessGuard>
      <EcosystemWorkspacePanel
        title="Finance"
        eyebrow="Finance workspace"
        description="Cashflow, expenses, budget, and savings in one focused FIRE Nepal workspace."
        items={FINANCE_ITEMS}
      />
    </DashboardAccessGuard>
  );
}
