import type { Metadata } from "next";
import { SmartLoanDashboard } from "@/components/smart-loan/SmartLoanDashboard";
import { buildCanonicalAlternates } from "@/lib/brand/site-seo";

export const metadata: Metadata = {
  title: "Smart Loan & Due Management OS | FIRE Nepal",
  description:
    "Premium loan, due, lending, borrowing, EMI, interest, document vault, and recovery management dashboard for Nepali workers abroad.",
  alternates: buildCanonicalAlternates("/smart-loan-os"),
};

export default function SmartLoanOsPage() {
  return <SmartLoanDashboard />;
}
