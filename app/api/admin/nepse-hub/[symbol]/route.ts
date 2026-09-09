import { NextResponse } from "next/server";
import { requireNepseHubAdminApi } from "@/lib/admin/nepse-hub-admin";
import {
  NEPSE_HUB_ADMIN_DOMAIN_LABELS,
  NEPSE_HUB_ADMIN_FIELDS,
  NEPSE_HUB_CMS_TABS,
  isNepseHubAdminDomain,
} from "@/lib/market/nepse-hub-admin-fields";
import {
  createCmsRecord,
  deleteCmsRecord,
  listAuditForSymbol,
  listOverridesForSymbol,
  restoreCmsRecord,
  restoreCompanyOverrides,
  restoreFieldOverride,
  setFieldOverride,
  setRecordFields,
  undoLastCmsChange,
} from "@/services/market/nepse-hub-admin-overrides";
import { buildCmsSections } from "@/services/market/nepse-hub-cms-snapshot";
import { createMarketDataServiceClient } from "@/services/market/nepse-market-data-engine";
import { loadCompanyFundamentals } from "@/services/market/nepse-company-fundamentals";
import { loadFinancialIntelligence } from "@/services/market/nepse-financial-intelligence";
import { loadAiCompanyIntelligence } from "@/services/market/nepse-ai-intelligence";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ symbol: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  const gate = await requireNepseHubAdminApi();
  if (gate instanceof NextResponse) return gate;

  const { symbol: raw } = await ctx.params;
  const symbol = decodeURIComponent(raw).trim().toUpperCase();
  if (!symbol) return NextResponse.json({ error: "Symbol required" }, { status: 400 });

  const sb = createMarketDataServiceClient();
  const [fundamentals, fi, overrides, audit, statements, news, ai] = await Promise.all([
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
          .select("id,headline,source_name,published_at,category,sentiment,source_url,summary")
          .ilike("headline", `%${symbol}%`)
          .order("published_at", { ascending: false })
          .limit(25)
      : Promise.resolve({ data: [] }),
    loadAiCompanyIntelligence(symbol).catch(() => null),
  ]);

  const cms = buildCmsSections({
    fundamentals,
    financialIntelligence: fi
      ? {
          quarterly: (fi.quarterly as unknown as Record<string, unknown>[])?.slice(0, 16) ?? [],
          annual: (fi.annual as unknown as Record<string, unknown>[])?.slice(0, 16) ?? [],
          ratios: (fi.ratios as unknown as Record<string, unknown>) ?? null,
          shareholding: (fi.shareholding as unknown as Record<string, unknown>) ?? null,
        }
      : null,
    statementPeriods: (statements.data as Record<string, unknown>[] | null) ?? [],
    news: (news.data as Record<string, unknown>[] | null) ?? [],
    overrides,
    ai: ai
      ? {
          investmentThesis: ai.summary?.overall ?? null,
          pros: ai.recommendation?.rationale?.find((r) => r.toLowerCase().includes("bull")) ?? null,
          cons: ai.recommendation?.rationale?.find((r) => r.toLowerCase().includes("bear")) ?? null,
          summary: ai.summary?.overall ?? null,
          targetPrice: ai.fairValue?.fairValueNpr ?? null,
          risk: ai.risk?.detail ?? null,
          outlook: ai.summary?.growthOutlook ?? null,
          riskNote: ai.risk?.detail ?? null,
          bullCase: null,
          bearCase: null,
        }
      : null,
  });

  return NextResponse.json({
    symbol,
    domains: NEPSE_HUB_ADMIN_DOMAIN_LABELS,
    fields: NEPSE_HUB_ADMIN_FIELDS,
    tabs: NEPSE_HUB_CMS_TABS,
    cms,
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

export async function PATCH(request: Request, ctx: Ctx) {
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

  if (action === "undo") {
    const result = await undoLastCmsChange({
      symbol,
      actorUserId: gate.userId,
      actorEmail: gate.email,
      auditId: typeof body.auditId === "string" ? body.auditId : null,
    });
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json({ ok: true, undoneAction: result.undoneAction });
  }

  const domain = typeof body.domain === "string" ? body.domain : "";
  const recordKey = typeof body.recordKey === "string" ? body.recordKey : "_";

  if (action === "create_record") {
    if (!domain) return NextResponse.json({ error: "domain is required" }, { status: 400 });
    const fields =
      body.fields && typeof body.fields === "object" && !Array.isArray(body.fields)
        ? (body.fields as Record<string, unknown>)
        : {};
    const result = await createCmsRecord({
      symbol,
      domain,
      fields,
      preferredRecordKey: typeof body.preferredRecordKey === "string" ? body.preferredRecordKey : null,
      note: typeof body.note === "string" ? body.note : null,
      actorUserId: gate.userId,
      actorEmail: gate.email,
    });
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json({ ok: true, recordKey: result.recordKey });
  }

  if (action === "delete_record") {
    if (!domain || !recordKey || recordKey === "_") {
      return NextResponse.json({ error: "domain and recordKey are required" }, { status: 400 });
    }
    const result = await deleteCmsRecord({
      symbol,
      domain,
      recordKey,
      actorUserId: gate.userId,
      actorEmail: gate.email,
      note: typeof body.note === "string" ? body.note : null,
    });
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json({ ok: true });
  }

  if (action === "restore_record") {
    if (!domain || !recordKey) {
      return NextResponse.json({ error: "domain and recordKey are required" }, { status: 400 });
    }
    const result = await restoreCmsRecord({
      symbol,
      domain,
      recordKey,
      actorUserId: gate.userId,
      actorEmail: gate.email,
      note: typeof body.note === "string" ? body.note : null,
    });
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json({ ok: true, restored: result.restored });
  }

  if (action === "set_fields") {
    if (!domain) return NextResponse.json({ error: "domain is required" }, { status: 400 });
    const fields =
      body.fields && typeof body.fields === "object" && !Array.isArray(body.fields)
        ? (body.fields as Record<string, unknown>)
        : {};
    const officialSnapshots =
      body.officialSnapshots && typeof body.officialSnapshots === "object" && !Array.isArray(body.officialSnapshots)
        ? (body.officialSnapshots as Record<string, unknown>)
        : undefined;
    const result = await setRecordFields({
      symbol,
      domain,
      recordKey,
      fields,
      officialSnapshots,
      note: typeof body.note === "string" ? body.note : null,
      actorUserId: gate.userId,
      actorEmail: gate.email,
    });
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json({ ok: true, recordKey: result.recordKey, count: result.rows.length });
  }

  const fieldKey = typeof body.fieldKey === "string" ? body.fieldKey : "";
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
