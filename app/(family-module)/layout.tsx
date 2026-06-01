import type { Metadata } from "next";
import type { ReactNode } from "react";
import { DashboardAccessGuard } from "@/components/auth/DashboardAccessGuard";
import { FamilyModuleClientRoot } from "@/components/family-module/FamilyModuleClientRoot";

export const metadata: Metadata = {
  title: "Family Module | FIRE Nepal",
  description:
    "Premium family OS for FIRE Nepal — hub, children, education, health, calendar, and parenting AI.",
};

export default function FamilyModuleLayout({ children }: { children: ReactNode }) {
  return (
    <DashboardAccessGuard>
      <FamilyModuleClientRoot>{children}</FamilyModuleClientRoot>
    </DashboardAccessGuard>
  );
}
