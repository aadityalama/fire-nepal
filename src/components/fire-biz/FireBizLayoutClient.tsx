"use client";

import type { ReactNode } from "react";
import { DashboardAccessGuard } from "@/components/auth/DashboardAccessGuard";
import { FireBizModuleShell } from "@/components/fire-biz/FireBizModuleShell";
import { FireBizProvider } from "@/contexts/FireBizContext";

export function FireBizLayoutClient({ children }: { children: ReactNode }) {
  return (
    <DashboardAccessGuard>
      <FireBizProvider>
        <FireBizModuleShell>{children}</FireBizModuleShell>
      </FireBizProvider>
    </DashboardAccessGuard>
  );
}
