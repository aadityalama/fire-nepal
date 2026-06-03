import { AdminDashboardClient } from "@/components/admin/AdminDashboardClient";
import { fetchAdminSnapshot } from "@/lib/admin/fetch-admin-snapshot";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const snapshot = await fetchAdminSnapshot();
  return <AdminDashboardClient snapshot={snapshot} />;
}
