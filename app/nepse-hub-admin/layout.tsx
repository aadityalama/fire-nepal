import type { Metadata } from "next";
import type { ReactNode } from "react";
import { requireNepseHubAdminUser } from "@/lib/admin/nepse-hub-admin";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "NEPSE Hub Admin | FIRE Nepal",
  description: "Restricted NEPSE Hub manual override control panel.",
  robots: { index: false, follow: false },
};

export default async function NepseHubAdminLayout({ children }: { children: ReactNode }) {
  await requireNepseHubAdminUser();
  return (
    <div className="admin-panel-root min-h-screen bg-[#020806] text-zinc-100 antialiased">{children}</div>
  );
}
