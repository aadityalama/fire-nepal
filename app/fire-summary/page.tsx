import type { Metadata } from "next";
import { UnifiedFireDashboard } from "@/components/fire-summary/UnifiedFireDashboard";
import { buildCanonicalAlternates } from "@/lib/brand/site-seo";

export const metadata: Metadata = {
  title: "FIRE Summary | FIRE Nepal",
  description:
    "Unified net worth, investable assets, retirement, cashflow, savings rate, emergency coverage, and FIRE progress — glass dashboard for Nepalis worldwide.",
  alternates: buildCanonicalAlternates("/fire-summary"),
};

export default function FireSummaryPage() {
  return <UnifiedFireDashboard />;
}
