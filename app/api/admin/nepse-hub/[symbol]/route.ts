import { NextResponse } from "next/server";
import { requireNepseHubAdminApi } from "@/lib/admin/nepse-hub-admin";
import {
  NEPSE_HUB_ADMIN_DOMAIN_LABELS,
  NEPSE_HUB_ADMIN_FIELDS,
  isNepseHubAdminDomain,
} from "@/lib/market/nepse-hub-admin-fields";
import {
  listAuditForSymbol,
  listOverridesForSymbol,
  restoreCompanyOverrides,
  restoreFieldOverride,
  setFieldOverride,
} from "@/services/market/nepse-hub-admin-overrides";
import { createMarketDataServiceClient } from "@/services/market/nepse-market-data-engine";
import { loadCompanyFundamentals } from "@/services/market/nepse-company-fundamentals";
import { loadFinancialIntelligence } from "@/services/market/nepse-financial-intelligence";
import { withApiRouteTiming } from "@/lib/mutation-perf";


export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ symbol: string }> };

async function GETHandler(_request: Request, ctx: Ctx) {
  const gate = await requireNepseHubAdminApi();
  if (gate instanceof NextResponse) return gate;

  const { symbol: raw } = await ctx.params;
  const symbol = decodeURIComponent(raw).trim().toUpperCase();
  if (!symbol) return NextResponse.json({ error: "Symbol required" }, { status: 400 });

  const sb = createMarketDataServiceClient();
  const [fundamentals, fi, overrides, audit, statements, news] = await Promise.all([
    loadCompanyFundamentals(symbol).catch(() => null),
    loadFinancialIntelligence(symbol).catch(() => null),
    listOverridesForSymbol(symbol, sb),
    listAuditForSymbol(symbol, 80, sb),
    sb
      ? sb
          .from("nepse_company_statements")
          .select("period_key,period_type,fiscal_year,quarter,period_label,extraction_status,updated_at")
          .eq("symbol", symbol)
          .order("fiscal_year", { ascending: false })
          .limit(40)
      : Promise.resolve({ data: [] }),
    sb
      ? sb
          .from("nepse_market_news")
          .select("id,headline,source_name,published_at,category,sentiment,source_url")
          .ilike("headline", `%${symbol}%`)
          .order("published_at", { ascending: false })
          .limit(25)
      : Promise.resolve({ data: [] }),
  ]);

  return NextResponse.json({
    symbol,
    domains: NEPSE_HUB_ADMIN_DOMAIN_LABELS,
    fields: NEPSE_HUB_ADMIN_FIELDS,
    fundamentals,
    financialIntelligence: fi
      ? {
          quarterly: fi.quarterly?.slice(0, 8) ?? [],
          annual: fi.annual?.slice(0, 8) ?? [],
          ratios: fi.ratios ?? null,
          shareholding: fi.shareholding ?? null,
        }
      : null,
    statementPeriods: statements.data ?? [],
    news: news.data ?? [],
    overrides,
    audit,
    admin: { email: gate.email, userId: gate.userId },
  });
}

async function PATCHHandler(request: Request, ctx: Ctx) {
  const gate = await requireNepseHubAdminApi();
  if (gate instanceof NextResponse) return gate;

  const { symbol: raw } = await ctx.params;
  const symbol = decodeURIComponent(raw).trim().toUpperCase();
  if (!symbol) return NextResponse.json({ error: "Symbol required" }, { status: 400 });

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const action = typeof body.action === "string" ? body.action : "set";

  if (action === "restore_company") {
    const result = await restoreCompanyOverrides({
      symbol,
      actorUserId: gate.userId,
      actorEmail: gate.email,
      note: typeof body.note === "string" ? body.note : null,
    });
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json({ ok: true, restored: result.restored });
  }

  const domain = typeof body.domain === "string" ? body.domain : "";
  const fieldKey = typeof body.fieldKey === "string" ? body.fieldKey : "";
  const recordKey = typeof body.recordKey === "string" ? body.recordKey : "_";
  if (!domain || !fieldKey) {
    return NextResponse.json({ error: "domain and fieldKey are required" }, { status: 400 });
  }
  if (!isNepseHubAdminDomain(domain) && domain !== "custom") {
    // Allow any future domain string for extensibility, but prefer catalog domains.
  }

  if (action === "restore_field") {
    const result = await restoreFieldOverride({
      symbol,
      domain,
      recordKey,
      fieldKey,
      actorUserId: gate.userId,
      actorEmail: gate.email,
      note: typeof body.note === "string" ? body.note : null,
    });
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json({ ok: true });
  }

  if (!("value" in body)) {
    return NextResponse.json({ error: "value is required for set" }, { status: 400 });
  }

  const result = await setFieldOverride({
    symbol,
    domain,
    recordKey,
    fieldKey,
    value: body.value,
    officialSnapshot: "officialSnapshot" in body ? body.officialSnapshot : undefined,
    note: typeof body.note === "string" ? body.note : null,
    actorUserId: gate.userId,
    actorEmail: gate.email,
  });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true, override: result.row });
}

export const GET = withApiRouteTiming<Ctx>("admin/nepse-hub/[symbol]:GET", GETHandler);
export const PATCH = withApiRouteTiming<Ctx>("admin/nepse-hub/[symbol]:PATCH", PATCHHandler);
