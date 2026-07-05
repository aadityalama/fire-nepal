"use client";

import { BarChart3, Banknote, CalendarClock, FileText, FolderOpen, ReceiptText, ScanText } from "lucide-react";
import { DashboardAccessGuard } from "@/components/auth/DashboardAccessGuard";
import { EcosystemWorkspacePanel, type EcosystemWorkspaceItem } from "@/components/product/hub/EcosystemWorkspacePanel";

const PERSONAL_EXPENSE_ITEMS: EcosystemWorkspaceItem[] = [
  {
    href: "/expense-dashboard?finance=personal&view=expenses",
    label: "Personal Expenses",
    description: "Track daily spending without roommate or group-expense navigation.",
    icon: ReceiptText,
  },
  {
    href: "/expense-dashboard?finance=personal&view=categories",
    label: "Categories",
    description: "Review spending by personal expense category.",
    icon: FolderOpen,
  },
  {
    href: "/budget",
    label: "Budget",
    description: "Plan monthly budgets for personal FIRE cashflow.",
    icon: Banknote,
  },
  {
    href: "/expense-dashboard?finance=personal&view=receipts",
    label: "Receipts (OCR)",
    description: "Attach receipt images and extract text with OCR.",
    icon: ScanText,
  },
  {
    href: "/expense-dashboard?finance=personal&view=recurring",
    label: "Recurring Expenses",
    description: "Manage repeat monthly costs from the personal expense ledger.",
    icon: CalendarClock,
  },
  {
    href: "/expense-dashboard?finance=personal&view=analytics",
    label: "Analytics",
    description: "Analyze monthly personal spending trends.",
    icon: BarChart3,
  },
  {
    href: "/expense-dashboard?finance=personal&view=reports",
    label: "Reports",
    description: "Open personal expense history and export reports.",
    icon: FileText,
  },
];

export default function FinanceExpenseWorkspacePage() {
  return (
    <DashboardAccessGuard>
      <EcosystemWorkspacePanel
        title="Expense"
        eyebrow="Finance workspace"
        description="Personal expense management for transactions, categories, budgets, receipts, recurring expenses, analytics, and reports."
        items={PERSONAL_EXPENSE_ITEMS}
      />
    </DashboardAccessGuard>
  );
}
