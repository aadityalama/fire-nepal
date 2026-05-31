import type { Metadata } from "next";
import { EmergencyFundDashboard } from "@/components/emergency-fund/EmergencyFundDashboard";

export const metadata: Metadata = {
  title: "Emergency Fund | FIRE Nepal",
  description:
    "Emergency fund readiness, runway analytics, stress tests, and KRW/NPR safety planning for Nepalis abroad.",
};

export default function EmergencyFundPage() {
  return <EmergencyFundDashboard />;
}
