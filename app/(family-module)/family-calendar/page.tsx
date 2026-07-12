import type { Metadata } from "next";
import { FamilyCalendarDashboard } from "@/components/family-module/FamilyCalendarDashboard";
import { buildCanonicalAlternates } from "@/lib/brand/site-seo";

export const metadata: Metadata = {
  title: "Family Calendar | FIRE Nepal",
  description: "Unified calendar — school, salary, bills, birthdays, and visa renewals.",
  alternates: buildCanonicalAlternates("/family-calendar"),
};

export default function FamilyCalendarPage() {
  return <FamilyCalendarDashboard />;
}
