import type { Metadata } from "next";
import { SipCalculatorDashboard } from "@/components/SipCalculatorDashboard";
import { SipCalculatorJsonLd } from "@/components/sip-calculator/SipCalculatorJsonLd";
import { SipCalculatorSeoContent } from "@/components/sip-calculator/SipCalculatorSeoContent";
import { buildSipCalculatorMetadata } from "@/lib/brand/sip-calculator-seo";

export const metadata: Metadata = buildSipCalculatorMetadata();

export default function SipCalculatorPage() {
  return (
    <main className="min-h-screen bg-[#f4fbf6]">
      <SipCalculatorJsonLd />
      <SipCalculatorDashboard />
      <SipCalculatorSeoContent />
    </main>
  );
}
