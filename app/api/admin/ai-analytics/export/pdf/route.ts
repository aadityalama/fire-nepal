import { NextResponse } from "next/server";
import { jsPDF } from "jspdf";
import { requireAdminApi } from "@/lib/admin/verify-admin-api";
import { fetchAdminAiAnalyticsSnapshot } from "@/lib/admin/fetch-ai-analytics-snapshot";

export async function GET() {
  const gate = await requireAdminApi();
  if (gate instanceof NextResponse) return gate;

  const s = await fetchAdminAiAnalyticsSnapshot();
  const lines = [
    "FIRE Nepal AI Analytics",
    `Generated: ${new Date().toISOString()}`,
    `Total AI Requests: ${s.kpis.totalRequests}`,
    `Active AI Users: ${s.kpis.activeAiUsers}`,
    `Requests Today: ${s.kpis.requestsToday}`,
    `Requests This Month: ${s.kpis.requestsThisMonth}`,
    `OpenAI Cost Today: $${s.kpis.costToday.toFixed(4)}`,
    `OpenAI Cost This Month: $${s.kpis.costThisMonth.toFixed(4)}`,
    `Lifetime AI Cost: $${s.kpis.lifetimeCost.toFixed(4)}`,
    `Average Response Time: ${s.kpis.averageResponseTimeMs}ms`,
    `Total Tokens Used: ${s.kpis.totalTokensUsed}`,
    `Failed Requests: ${s.kpis.failedRequests}`,
    `Error Rate: ${s.kpis.errorRatePct}%`,
  ];
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("FIRE Nepal AI Analytics", 48, 56);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  lines.slice(1).forEach((line, index) => {
    doc.text(line, 48, 92 + index * 22);
  });

  return new NextResponse(Buffer.from(doc.output("arraybuffer")), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="fire-ai-analytics-${new Date().toISOString().slice(0, 10)}.pdf"`,
    },
  });
}
