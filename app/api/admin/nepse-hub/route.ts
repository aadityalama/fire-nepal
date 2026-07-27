import { NextResponse } from "next/server";
import { requireNepseHubAdminApi } from "@/lib/admin/nepse-hub-admin";
import { NEPSE_HUB_ADMIN_DOMAIN_LABELS, NEPSE_HUB_ADMIN_FIELDS } from "@/lib/market/nepse-hub-admin-fields";
import { createMarketDataServiceClient } from "@/services/market/nepse-market-data-engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Catalog + company search for NEPSE Hub Admin (email-gated). */
export async function GET(request: Request) {
  const gate = await requireNepseHubAdminApi();
  if (gate instanceof NextResponse) return gate;

  const url = new URL(request.url);
  const q = (url.searchParams.get("q") ?? "").trim().toUpperCase();
  const sb = createMarketDataServiceClient();

  let companies: { symbol: string; company_name: string | null; sector: string | null }[] = [];
  if (sb) {
    let query = sb
      .from("nepse_company_master")
      .select("symbol,company_name,sector")
      .order("symbol", { ascending: true })
      .limit(q ? 40 : 80);
    if (q) {
      query = query.or(`symbol.ilike.%${q}%,company_name.ilike.%${q}%`);
    }
    const { data, error } = await query;
    if (!error && data) companies = data as typeof companies;
  }

  return NextResponse.json({
    admin: { email: gate.email, userId: gate.userId },
    domains: NEPSE_HUB_ADMIN_DOMAIN_LABELS,
    fields: NEPSE_HUB_ADMIN_FIELDS,
    companies,
  });
}
