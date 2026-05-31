import type { Metadata } from "next";
import { SipCalculatorDashboard } from "@/components/SipCalculatorDashboard";

export const metadata: Metadata = {
  title: "SIP Calculator | FIRE Nepal",
  description:
    "Premium FIRE Nepal SIP calculator for Nepali workers abroad with KRW, NPR, and USD support, compound growth charts, FIRE analytics, and Korea salary investing simulations.",
};

export default function SipCalculatorPage() {
  return <SipCalculatorDashboard />;
}
