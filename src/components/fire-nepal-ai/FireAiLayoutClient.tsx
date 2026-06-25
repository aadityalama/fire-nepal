"use client";

import type { ReactNode } from "react";
import { DashboardAccessGuard } from "@/components/auth/DashboardAccessGuard";
import { FireAiShell } from "@/components/fire-nepal-ai/FireAiShell";

export function FireAiLayoutClient({ children }: { children: ReactNode }) {
  return (
    <DashboardAccessGuard>
      <FireAiShell>{children}</FireAiShell>
    </DashboardAccessGuard>
  );
}
