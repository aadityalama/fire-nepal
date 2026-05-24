"use client";

import type { ReactNode } from "react";
import { DashboardAccessGuard } from "@/components/auth/DashboardAccessGuard";
import { ProductAppShell } from "@/components/product/shell/ProductAppShell";

export function HubLayoutClient({ children }: { children: ReactNode }) {
  return (
    <DashboardAccessGuard>
      <ProductAppShell>{children}</ProductAppShell>
    </DashboardAccessGuard>
  );
}
