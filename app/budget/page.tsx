"use client";

import { Banknote, PiggyBank, ReceiptText, Wallet } from "lucide-react";
import { DashboardAccessGuard } from "@/components/auth/DashboardAccessGuard";
import { EcosystemWorkspacePanel, type EcosystemWorkspaceItem } from "@/components/product/hub/EcosystemWorkspacePanel";

const FINANCE_ITEMS: EcosystemWorkspaceItem[] = [
  { href: "/cashflow-dashboard", label: "Cashflow", description: "Income, burn, savings rate, and runway.", icon: Wallet },
  { href: "/finance/expense", label: "Expense", description: "Personal expenses, categories, receipts, reports, and analytics.", icon: ReceiptText },
  { href: "/budget", label: "Budget", description: "Monthly budget workspace for FIRE planning.", icon: Banknote },
  { href: "/savings-tracker", label: "Savings", description: "Savings targets, glide path, and progress.", icon: PiggyBank },
];

export default function BudgetWorkspacePage() {
  return (
    <DashboardAccessGuard>
      <EcosystemWorkspacePanel
        title="Budget"
        eyebrow="Finance workspace"
        description="Use cashflow, expenses, and savings modules together to manage the monthly FIRE budget."
        items={FINANCE_ITEMS}
      />
    </DashboardAccessGuard>
  );
}
