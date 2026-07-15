import type { Metadata } from "next";
import type { ReactNode } from "react";
import { OverviewHeader } from "@/components/admin/OverviewHeader";
import { requireAdminUserId } from "@/lib/admin/require-admin";

export const metadata: Metadata = {
  title: "Admin | FIRE Nepal",
  description: "Restricted operations dashboard for FIRE Nepal.",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireAdminUserId();

  return (
    <div className="min-h-screen bg-[#020806] text-zinc-100 antialiased">
      <OverviewHeader />
      <div className="mx-auto max-w-[1200px] px-3 py-4 sm:px-5 sm:py-5">{children}</div>
    </div>
  );
}
