import type { Metadata } from "next";
import { AdminMembershipRequestsClient } from "@/components/admin/AdminMembershipRequestsClient";

export const metadata: Metadata = {
  title: "Membership payments | Admin",
  description: "Review and approve FIRE Nepal membership QR payments.",
  robots: { index: false, follow: false },
};

export default function AdminMembershipRequestsPage() {
  return <AdminMembershipRequestsClient />;
}
