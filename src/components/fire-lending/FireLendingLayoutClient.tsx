"use client";

import type { ReactNode } from "react";
import { DashboardAccessGuard } from "@/components/auth/DashboardAccessGuard";
import { FireLendingModuleShell } from "@/components/fire-lending/FireLendingModuleShell";
import { FireLendingProvider } from "@/contexts/FireLendingContext";

export function FireLendingLayoutClient({ children }: { children: ReactNode }) {
  return (
    <DashboardAccessGuard>
      <FireLendingProvider>
        <FireLendingModuleShell>{children}</FireLendingModuleShell>
      </FireLendingProvider>
    </DashboardAccessGuard>
  );
}
