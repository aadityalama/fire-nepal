import type { Metadata } from "next";
import { FamilyCalendarDashboard } from "@/components/family-module/FamilyCalendarDashboard";

export const metadata: Metadata = {
  title: "Family Calendar | FIRE Nepal",
  description: "Unified calendar — school, salary, bills, birthdays, and visa renewals.",
};

export default function FamilyCalendarPage() {
  return <FamilyCalendarDashboard />;
}
