import type { Metadata } from "next";
import { CashflowDashboard } from "@/components/cashflow/CashflowDashboard";

export const metadata: Metadata = {
  title: "Cashflow | FIRE Nepal",
  description:
    "Income, expenses, emergency fund runway, and savings rate — a premium cashflow view for Nepalis worldwide (local-first, NPR display).",
};

export default function CashflowDashboardPage() {
  return <CashflowDashboard />;
}
