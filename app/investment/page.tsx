"use client";

import { BarChart3, Gem, Home, LineChart, Target, TrendingUp } from "lucide-react";
import { DashboardAccessGuard } from "@/components/auth/DashboardAccessGuard";
import { EcosystemWorkspacePanel, type EcosystemWorkspaceItem } from "@/components/product/hub/EcosystemWorkspacePanel";

const INVESTMENT_ITEMS: EcosystemWorkspaceItem[] = [
  { href: "/portfolio", label: "Portfolio", description: "Net worth, assets, and wealth analytics.", icon: Target },
  { href: "/market", label: "NEPSE", description: "Nepal market signals and economy dashboard.", icon: BarChart3 },
  { href: "/sip-calculator", label: "SIP", description: "Monthly investing projection and growth path.", icon: TrendingUp },
  { href: "/swp-calculator", label: "SWP", description: "Withdrawal planning and passive income runway.", icon: LineChart },
  { href: "/portfolio/gold", label: "Gold", description: "Gold and silver holdings inside portfolio.", icon: Gem },
  { href: "/portfolio/real-estate", label: "Real Estate", description: "Property assets and real estate wealth view.", icon: Home },
];

export default function InvestmentWorkspacePage() {
  return (
    <DashboardAccessGuard>
      <EcosystemWorkspacePanel
        title="Investment"
        eyebrow="Investment workspace"
        description="Portfolio, NEPSE, SIP, SWP, gold, and real estate in one focused workspace."
        items={INVESTMENT_ITEMS}
      />
    </DashboardAccessGuard>
  );
}
