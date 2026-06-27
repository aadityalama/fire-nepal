import { NextResponse } from "next/server";
import { requireAdminApi, toCsv } from "@/lib/admin/verify-admin-api";
import { fetchAdminAiAnalyticsSnapshot } from "@/lib/admin/fetch-ai-analytics-snapshot";

export async function GET() {
  const gate = await requireAdminApi();
  if (gate instanceof NextResponse) return gate;

  const snapshot = await fetchAdminAiAnalyticsSnapshot();
  const headers = ["created_at", "user_id", "user", "membership", "feature", "model", "status", "tokens", "cost_usd", "duration_ms", "error"];
  const rows = snapshot.logs.map((log) => [
    log.createdAt,
    log.userId,
    log.userLabel,
    log.membership,
    log.aiFeature,
    log.model,
    log.status,
    String(log.tokens),
    String(log.cost),
    String(log.durationMs),
    log.errorMessage ?? "",
  ]);

  return new NextResponse(toCsv(headers, rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="fire-ai-analytics-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
