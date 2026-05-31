import type { Metadata } from "next";
import { HealthDashboard } from "@/components/family-module/HealthDashboard";

export const metadata: Metadata = {
  title: "Health | FIRE Nepal",
  description: "Medicine reminders, insurance, vaccinations, and emergency medical info.",
};

export default function HealthPage() {
  return <HealthDashboard />;
}
