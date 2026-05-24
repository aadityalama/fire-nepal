"use client";

import type { ReactNode } from "react";
import { RequireAuth } from "@/components/product/auth/RequireAuth";

/** Client guard for premium dashboard surfaces — pairs with root `middleware` + httpOnly session. */
export function DashboardAccessGuard({ children }: { children: ReactNode }) {
  return <RequireAuth>{children}</RequireAuth>;
}
