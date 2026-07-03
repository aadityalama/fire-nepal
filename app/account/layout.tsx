import type { Metadata } from "next";
import type { ReactNode } from "react";
import { DashboardAccessGuard } from "@/components/auth/DashboardAccessGuard";

export const metadata: Metadata = {
  title: "Account | FIRE Nepal",
  description: "Signed-in profile and session controls for the FIRE Nepal workspace.",
};

export default function AccountLayout({ children }: { children: ReactNode }) {
  return <DashboardAccessGuard>{children}</DashboardAccessGuard>;
}
