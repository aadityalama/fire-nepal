import type { Metadata } from "next";
import { AdminMembershipRequestsClient } from "@/components/admin/AdminMembershipRequestsClient";

export const metadata: Metadata = {
  title: "Membership payments | Admin",
  description: "Review and approve FIRE Nepal membership QR payments.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminMembershipRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ user?: string }>;
}) {
  const sp = await searchParams;
  return <AdminMembershipRequestsClient initialUserId={sp.user?.trim() ?? null} />;
}
