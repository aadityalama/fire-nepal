"use client";

import { Bot, Brain, FileText } from "lucide-react";
import { DashboardAccessGuard } from "@/components/auth/DashboardAccessGuard";
import { EcosystemWorkspacePanel, type EcosystemWorkspaceItem } from "@/components/product/hub/EcosystemWorkspacePanel";

const AI_ITEMS: EcosystemWorkspaceItem[] = [
  { href: "/fire-ai", label: "AI Advisor", description: "Financial assistant, insights, and guidance.", icon: Bot },
  { href: "/cashflow-dashboard", label: "OCR Payslip", description: "Import Korean payslip data into cashflow.", icon: FileText },
  { href: "/fire-ai/wealth-summary", label: "AI Reports", description: "Wealth summary and AI financial reports.", icon: Brain },
];

export default function AiWorkspacePage() {
  return (
    <DashboardAccessGuard>
      <EcosystemWorkspacePanel
        title="AI"
        eyebrow="AI workspace"
        description="Advisor, OCR payslip import, and AI reports in one focused workspace."
        items={AI_ITEMS}
      />
    </DashboardAccessGuard>
  );
}
