import { NextResponse } from "next/server";
import { requireNepseHubAdminApi } from "@/lib/admin/nepse-hub-admin";
import { createMarketDataServiceClient, ingestOfficialCompanyMaster } from "@/services/market/nepse-market-data-engine";
import { withApiRouteTiming } from "@/lib/mutation-perf";


export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function GETHandler() {
  const gate = await requireNepseHubAdminApi();
  if (gate instanceof NextResponse) return gate;
  const sb = createMarketDataServiceClient();
  if (!sb) {
    return NextResponse.json({ error: "Supabase service key is not configured" }, { status: 503 });
  }

  const [latestRun, latestReport, sectorRows] = await Promise.all([
    sb.from("nepse_company_master_sync_runs").select("*").order("started_at", { ascending: false }).limit(1).maybeSingle(),
    sb
      .from("nepse_company_master_validation_reports")
      .select("*")
      .order("generated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    sb.from("nepse_company_master").select("sector"),
  ]);

  const counts: Record<string, number> = {};
  for (const row of (sectorRows.data as { sector: string | null }[] | null) ?? []) {
    const key = (row.sector ?? "Unclassified").trim() || "Unclassified";
    counts[key] = (counts[key] ?? 0) + 1;
  }

  return NextResponse.json({
    latestRun: latestRun.data ?? null,
    latestValidation: latestReport.data ?? null,
    liveSectorCounts: counts,
    admin: gate.email,
  });
}

async function POSTHandler() {
  const gate = await requireNepseHubAdminApi();
  if (gate instanceof NextResponse) return gate;
  const sb = createMarketDataServiceClient();
  if (!sb) {
    return NextResponse.json({ error: "Supabase service key is not configured" }, { status: 503 });
  }

  const result = await ingestOfficialCompanyMaster(sb, "manual");
  return NextResponse.json({ ok: result.status !== "error", result, requestedBy: gate.email }, { status: result.status === "error" ? 500 : 200 });
}

export const GET = withApiRouteTiming("admin/nepse-hub/company-master-sync:GET", GETHandler);
export const POST = withApiRouteTiming("admin/nepse-hub/company-master-sync:POST", POSTHandler);
