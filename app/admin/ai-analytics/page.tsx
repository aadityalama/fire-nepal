import { AdminAiAnalyticsClient } from "@/components/admin/AdminAiAnalyticsClient";
import { fetchAdminAiAnalyticsSnapshot } from "@/lib/admin/fetch-ai-analytics-snapshot";

export const dynamic = "force-dynamic";

export default async function AdminAiAnalyticsPage() {
  const snapshot = await fetchAdminAiAnalyticsSnapshot();
  return <AdminAiAnalyticsClient snapshot={snapshot} />;
}
