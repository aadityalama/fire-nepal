"use client";

import { Calculator, Target, TrendingUp } from "lucide-react";
import { DashboardAccessGuard } from "@/components/auth/DashboardAccessGuard";
import { EcosystemWorkspacePanel, type EcosystemWorkspaceItem } from "@/components/product/hub/EcosystemWorkspacePanel";

const FIRE_PLANNING_ITEMS: EcosystemWorkspaceItem[] = [
  { href: "/#calculator", label: "FIRE Calculator", description: "Retirement projection and FI timeline.", icon: Calculator },
  { href: "/fire-summary", label: "FIRE Journey", description: "Unified FIRE progress and readiness view.", icon: TrendingUp },
  { href: "/goals", label: "Goals", description: "Financial goals and milestone planning.", icon: Target },
];

export default function GoalsWorkspacePage() {
  return (
    <DashboardAccessGuard>
      <EcosystemWorkspacePanel
        title="Goals"
        eyebrow="FIRE workspace"
        description="Plan and review milestones from the FIRE Planning workspace."
        items={FIRE_PLANNING_ITEMS}
      />
    </DashboardAccessGuard>
  );
}
