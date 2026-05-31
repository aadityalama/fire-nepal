import type { Metadata } from "next";
import { SmartLoanDashboard } from "@/components/smart-loan/SmartLoanDashboard";

export const metadata: Metadata = {
  title: "Smart Loan & Due Management OS | FIRE Nepal",
  description:
    "Premium loan, due, lending, borrowing, EMI, interest, document vault, and recovery management dashboard for Nepali workers abroad.",
};

export default function SmartLoanOsPage() {
  return <SmartLoanDashboard />;
}
