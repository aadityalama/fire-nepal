import type { Metadata } from "next";
import type { ReactNode } from "react";
import { DashboardAccessGuard } from "@/components/auth/DashboardAccessGuard";
import { FireDashboardShell } from "@/components/dashboard/FireDashboardShell";

export const metadata: Metadata = {
  title: "Dashboard | FIRE Nepal",
  description: "Premium member profile, membership, and FIRE workspace settings.",
};

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <DashboardAccessGuard>
      <FireDashboardShell>{children}</FireDashboardShell>
    </DashboardAccessGuard>
  );
}
