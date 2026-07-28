import "server-only";

import {
  NEPSE_HUB_ADMIN_FIELDS,
  NEPSE_HUB_CMS_TABS,
  type NepseHubAdminDomain,
  type NepseHubCmsTabId,
} from "@/lib/market/nepse-hub-admin-fields";
import {
  CMS_DELETED_FIELD,
  CMS_ROW_PAYLOAD_FIELD,
  indexOverrides,
  isCmsCreatedRecordKey,
  isRecordDeleted,
  listOverridesForSymbol,
  mergeCmsRows,
  type NepseHubAdminOverrideRow,
} from "@/services/market/nepse-hub-admin-overrides";
import type { NepseCompanyFundamentalsPayload } from "@/types/market/nepse-company-fundamentals";

export type CmsFieldCell = {
  key: string;
  label: string;
  type: string;
  value: unknown;
  officialValue: unknown;
  overridden: boolean;
  options?: { value: string; label: string }[];
};

export type CmsRow = {
  recordKey: string;
  origin: "official" | "cms";
  label: string;
  values: Record<string, unknown>;
  officialValues: Record<string, unknown>;
  overriddenFields: string[];
  deleted: boolean;
};

export type CmsSectionSnapshot = {
  tabId: NepseHubCmsTabId;
  label: string;
  domain: NepseHubAdminDomain;
  kind: "fields" | "rows";
  description?: string;
  allowCreate: boolean;
  fields: CmsFieldCell[];
  rows: CmsRow[];
};

function unwrap(valueJson: unknown): unknown {
  if (valueJson && typeof valueJson === "object" && !Array.isArray(valueJson) && "v" in (valueJson as object)) {
    return (valueJson as { v: unknown }).v;
  }
  return valueJson;
}

function fieldCells(
  domain: NepseHubAdminDomain,
  values: Record<string, unknown>,
  official: Record<string, unknown>,
  overrides: NepseHubAdminOverrideRow[],
  recordKey = "_",
): CmsFieldCell[] {
  const defs = NEPSE_HUB_ADMIN_FIELDS[domain] ?? [];
  return defs
    .filter((f) => f.key !== "open" && f.key !== "high" && f.key !== "low" && f.key !== "close")
    .map((f) => {
      const overridden = overrides.some(
        (o) => o.domain === domain && o.record_key === recordKey && o.field_key === f.key,
      );
      return {
        key: f.key,
        label: f.label,
        type: f.type,
        value: values[f.key] ?? null,
        officialValue: official[f.key] ?? null,
        overridden,
        options: f.options,
      };
    });
}

function rowFromValues(
  domain: NepseHubAdminDomain,
  recordKey: string,
  values: Record<string, unknown>,
  officialValues: Record<string, unknown>,
  overrides: NepseHubAdminOverrideRow[],
  labelKey?: string,
): CmsRow {
  const overriddenFields = overrides
    .filter(
      (o) =>
        o.domain === domain &&
        o.record_key === recordKey &&
        o.field_key !== CMS_DELETED_FIELD &&
        o.field_key !== CMS_ROW_PAYLOAD_FIELD,
    )
    .map((o) => o.field_key);

  const label =
    (labelKey && values[labelKey] != null && String(values[labelKey])) ||
    (values.fiscalYear != null && String(values.fiscalYear)) ||
    (values.headline != null && String(values.headline)) ||
    (values.title != null && String(values.title)) ||
    (values.periodLabel != null && String(values.periodLabel)) ||
    recordKey;

  return {
    recordKey,
    origin: isCmsCreatedRecordKey(recordKey) ? "cms" : "official",
    label,
    values,
    officialValues,
    overriddenFields,
    deleted: overrides.some(
      (o) =>
        o.domain === domain &&
        o.record_key === recordKey &&
        o.field_key === CMS_DELETED_FIELD &&
        unwrap(o.value_json) === true,
    ),
  };
}

function statementRecordKey(row: Record<string, unknown>): string {
  const periodType = String(row.periodType ?? row.period_type ?? "");
  const fy = String(row.fiscalYear ?? row.fiscal_year ?? "");
  const quarter = row.quarter ?? row.Quarter;
  if (periodType === "quarterly" || periodType === "Q" || (typeof quarter === "number" && quarter > 0)) {
    return `Q:${fy}:${quarter}`;
  }
  if (fy) return `A:${fy}`;
  return String(row.period_key ?? row.id ?? fy);
}

/**
 * Build spreadsheet-ready CMS sections for the admin UI.
 * Every available official row is loaded automatically — no manual Record Key entry.
 */
export function buildCmsSections(input: {
  fundamentals: NepseCompanyFundamentalsPayload | null;
  financialIntelligence: {
    quarterly?: Record<string, unknown>[];
    annual?: Record<string, unknown>[];
    ratios?: Record<string, unknown> | null;
    shareholding?: Record<string, unknown> | null;
  } | null;
  statementPeriods: Record<string, unknown>[];
  news: Record<string, unknown>[];
  overrides: NepseHubAdminOverrideRow[];
  ai?: Record<string, unknown> | null;
}): CmsSectionSnapshot[] {
  const overrideIndex = indexOverrides(input.overrides);
  const fund = input.fundamentals;
  const profile = (fund?.profile ?? {}) as Record<string, unknown>;
  const valuation = (fund?.valuation ?? {}) as Record<string, unknown>;
  const session = (fund?.session ?? {}) as Record<string, unknown>;
  const range52w = (fund?.range52w ?? {}) as Record<string, unknown>;
  const shareholding = {
    ...((fund?.shareholding ?? {}) as Record<string, unknown>),
    ...((input.financialIntelligence?.shareholding ?? {}) as Record<string, unknown>),
  };
  const ratios = {
    ...valuation,
    ...((input.financialIntelligence?.ratios ?? {}) as Record<string, unknown>),
  };

  const technicalValues: Record<string, unknown> = {
    previousCloseNpr: session.previousCloseNpr ?? null,
    openNpr: session.openNpr ?? null,
    highNpr: session.highNpr ?? null,
    lowNpr: session.lowNpr ?? null,
    closeNpr: session.closeNpr ?? null,
    vwapNpr: session.vwapNpr ?? null,
    volume: session.volume ?? null,
    turnoverNpr: session.turnoverNpr ?? null,
    trades: session.trades ?? null,
    circuit: session.circuit ?? null,
    rsi: null,
    macd: null,
    atr: null,
    beta: null,
    high52wNpr: range52w.highNpr ?? null,
    low52wNpr: range52w.lowNpr ?? null,
  };
  // Apply technical overrides onto the display values
  for (const key of Object.keys(technicalValues)) {
    const ov = overrideIndex.get(`technical|_|${key}`);
    if (ov !== undefined) technicalValues[key] = ov;
  }
  // Map legacy keys into session-shaped fields for display
  for (const [legacy, modern] of [
    ["open", "openNpr"],
    ["high", "highNpr"],
    ["low", "lowNpr"],
    ["close", "closeNpr"],
  ] as const) {
    const ov = overrideIndex.get(`technical|_|${legacy}`);
    if (ov !== undefined && technicalValues[modern] == null) technicalValues[modern] = ov;
  }

  const aiValues: Record<string, unknown> = {
    investmentThesis: null,
    pros: null,
    cons: null,
    summary: null,
    targetPrice: null,
    risk: null,
    outlook: null,
    riskNote: null,
    bullCase: null,
    bearCase: null,
    payload: null,
    ...(input.ai ?? {}),
  };
  for (const key of Object.keys(aiValues)) {
    const ov = overrideIndex.get(`ai|_|${key}`);
    if (ov !== undefined) aiValues[key] = ov;
  }

  const ownershipValues: Record<string, unknown> = {
    promoterShares: profile.promoterShares ?? shareholding.promoterShares ?? null,
    publicShares: profile.publicShares ?? shareholding.publicShares ?? null,
    listedShares: profile.listedShares ?? shareholding.listedShares ?? null,
    promoterPct: shareholding.promoterPct ?? null,
    publicPct: shareholding.publicPct ?? null,
    mutualFundsPct: shareholding.mutualFundsPct ?? null,
    institutionsPct: shareholding.institutionsPct ?? null,
    foreignPct: shareholding.foreignPct ?? null,
    shareholderName: null,
    shareholderShares: null,
    shareholderPct: null,
  };
  for (const key of Object.keys(ownershipValues)) {
    const ov = overrideIndex.get(`ownership|_|${key}`);
    if (ov !== undefined) ownershipValues[key] = ov;
  }

  // Statement rows from FI + basic financials + statement periods
  const statementOfficial: Record<string, unknown>[] = [];
  const seenStatements = new Set<string>();
  const pushStatement = (row: Record<string, unknown>) => {
    const key = statementRecordKey(row);
    if (!key || seenStatements.has(key)) return;
    seenStatements.add(key);
    statementOfficial.push({ ...row, recordKey: key });
  };

  for (const row of input.financialIntelligence?.annual ?? []) {
    pushStatement({ ...row, periodType: "annual", periodLabel: String(row.fiscalYear ?? "") });
  }
  for (const row of input.financialIntelligence?.quarterly ?? []) {
    pushStatement({
      ...row,
      periodType: "quarterly",
      periodLabel: `${row.fiscalYear ?? ""} Q${row.quarter ?? ""}`,
    });
  }
  for (const row of fund?.financials ?? []) {
    pushStatement({ ...row, periodType: "annual", periodLabel: row.periodLabel ?? row.fiscalYear });
  }
  for (const row of input.statementPeriods) {
    const fy = String(row.fiscal_year ?? "");
    const q = row.quarter;
    pushStatement({
      fiscalYear: fy,
      quarter: q,
      periodType: row.period_type === "quarterly" ? "quarterly" : "annual",
      periodLabel: String(row.period_label ?? row.period_key ?? fy),
      period_key: row.period_key,
    });
  }

  const statementRowsMerged = mergeCmsRows({
    official: statementOfficial as Array<Record<string, unknown> & { recordKey: string }>,
    overrides: overrideIndex,
    domain: "statements",
    recordKeyOf: (row) => String(row.recordKey ?? statementRecordKey(row)),
    buildCmsRow: (recordKey, payload) => ({ ...payload, recordKey, id: recordKey }),
  });

  const dividendOfficial = (fund?.dividends ?? []).map((d) => ({ ...d }));
  const dividendRows = mergeCmsRows({
    official: dividendOfficial as Array<Record<string, unknown>>,
    overrides: overrideIndex,
    domain: "dividends",
    recordKeyOf: (row) => String(row.fiscalYear || row.id || ""),
    buildCmsRow: (recordKey, payload) => ({
      id: recordKey,
      symbol: fund?.symbol ?? "",
      fiscalYear: String(payload.fiscalYear ?? recordKey.replace(/^cms:/, "")),
      bonusPct: (payload.bonusPct as number | null) ?? null,
      cashPct: (payload.cashPct as number | null) ?? null,
      bookCloseDate: (payload.bookCloseDate as string | null) ?? null,
      agmDate: (payload.agmDate as string | null) ?? null,
      notes: (payload.notes as string | null) ?? null,
      source: "cms",
      ...payload,
    }),
  });

  const actionOfficial = (fund?.actions ?? []).map((a) => ({ ...a }));
  const actionRows = mergeCmsRows({
    official: actionOfficial as Array<Record<string, unknown>>,
    overrides: overrideIndex,
    domain: "actions",
    recordKeyOf: (row) => String(row.id ?? ""),
    buildCmsRow: (recordKey, payload) => ({
      id: recordKey,
      symbol: fund?.symbol ?? "",
      actionType: payload.actionType ?? "bonus",
      title: payload.title ?? "Untitled action",
      actionDate: payload.actionDate ?? null,
      details: payload.details ?? null,
      sourceUrl: payload.sourceUrl ?? null,
      source: "cms",
      ...payload,
    }),
  });

  const newsOfficial = input.news.map((n) => ({
    id: n.id,
    headline: n.headline,
    summary: n.summary ?? n.snippet ?? null,
    snippet: n.snippet ?? n.summary ?? null,
    sentiment: n.sentiment ?? "neutral",
    category: n.category ?? "general",
    publishedAt: n.published_at ?? n.publishedAt ?? null,
    sourceName: n.source_name ?? n.sourceName ?? null,
    sourceUrl: n.source_url ?? n.sourceUrl ?? null,
  }));
  const newsRows = mergeCmsRows({
    official: newsOfficial as Array<Record<string, unknown>>,
    overrides: overrideIndex,
    domain: "news",
    recordKeyOf: (row) => String(row.id ?? ""),
    buildCmsRow: (recordKey, payload) => ({
      id: recordKey,
      headline: payload.headline ?? "Untitled",
      ...payload,
    }),
  });

  // Also surface deleted official rows so Restore Official is available.
  const withDeleted = (
    domain: NepseHubAdminDomain,
    active: CmsRow[],
    official: Array<Record<string, unknown>>,
    keyOf: (row: Record<string, unknown>) => string,
    labelKey?: string,
  ): CmsRow[] => {
    const activeKeys = new Set(active.map((r) => r.recordKey));
    const deleted: CmsRow[] = [];
    for (const row of official) {
      const key = keyOf(row);
      if (!key || activeKeys.has(key)) continue;
      if (!isRecordDeleted(overrideIndex, domain, key)) continue;
      deleted.push(rowFromValues(domain, key, row, row, input.overrides, labelKey));
    }
    return [...active, ...deleted];
  };

  const sections: CmsSectionSnapshot[] = [];

  for (const tab of NEPSE_HUB_CMS_TABS) {
    if (tab.kind === "fields") {
      let values: Record<string, unknown> = {};
      let official: Record<string, unknown> = {};
      if (tab.id === "overview") {
        values = { ...profile };
        official = { ...profile };
        for (const key of Object.keys(values)) {
          const ov = overrideIndex.get(`profile|_|${key}`);
          if (ov !== undefined) values[key] = ov;
        }
      } else if (tab.id === "price") {
        values = technicalValues;
        official = {
          previousCloseNpr: session.previousCloseNpr ?? null,
          openNpr: session.openNpr ?? null,
          highNpr: session.highNpr ?? null,
          lowNpr: session.lowNpr ?? null,
          closeNpr: session.closeNpr ?? null,
          vwapNpr: null,
          volume: session.volume ?? null,
          turnoverNpr: session.turnoverNpr ?? null,
          trades: session.trades ?? null,
          circuit: null,
          rsi: null,
          macd: null,
          atr: null,
          beta: null,
          high52wNpr: range52w.highNpr ?? null,
          low52wNpr: range52w.lowNpr ?? null,
        };
      } else if (tab.id === "metrics") {
        values = { ...ratios };
        official = { ...valuation, ...((input.financialIntelligence?.ratios ?? {}) as Record<string, unknown>) };
        for (const key of Object.keys(values)) {
          const ov = overrideIndex.get(`ratios|_|${key}`);
          if (ov !== undefined) values[key] = ov;
        }
      } else if (tab.id === "ownership") {
        values = ownershipValues;
        official = { ...ownershipValues };
        for (const key of Object.keys(official)) {
          // Reset official to non-override values where possible
          if (key in shareholding) official[key] = shareholding[key];
          if (key in profile) official[key] = profile[key] ?? official[key];
        }
      } else if (tab.id === "ai") {
        values = aiValues;
        official = { ...aiValues };
        for (const def of NEPSE_HUB_ADMIN_FIELDS.ai) {
          if (overrideIndex.has(`ai|_|${def.key}`)) {
            // keep overridden value in values; official stays from ai payload defaults
          }
        }
      }

      sections.push({
        tabId: tab.id,
        label: tab.label,
        domain: tab.domain,
        kind: "fields",
        description: tab.description,
        allowCreate: false,
        fields: fieldCells(tab.domain, values, official, input.overrides, "_"),
        rows: [],
      });
      continue;
    }

    // Row sections
    let rows: CmsRow[] = [];
    if (tab.id === "intelligence" || tab.id === "financials") {
      const mapped = statementRowsMerged.map((row) => {
        const key = String(row.recordKey ?? statementRecordKey(row));
        return rowFromValues("statements", key, row, row, input.overrides, tab.rowLabelKey);
      });
      rows = withDeleted(
        "statements",
        mapped,
        statementOfficial,
        (r) => String(r.recordKey ?? statementRecordKey(r)),
        tab.rowLabelKey,
      );
    } else if (tab.id === "dividends") {
      const mapped = dividendRows.map((row) => {
        const key = String(row.fiscalYear || row.id || "");
        return rowFromValues("dividends", key, row, row, input.overrides, "fiscalYear");
      });
      rows = withDeleted("dividends", mapped, dividendOfficial, (r) => String(r.fiscalYear || r.id || ""), "fiscalYear");
    } else if (tab.id === "actions") {
      const mapped = actionRows.map((row) => {
        const key = String(row.id ?? "");
        return rowFromValues("actions", key, row, row, input.overrides, "title");
      });
      rows = withDeleted("actions", mapped, actionOfficial, (r) => String(r.id ?? ""), "title");
    } else if (tab.id === "news") {
      const mapped = newsRows.map((row) => {
        const key = String(row.id ?? "");
        return rowFromValues("news", key, row, row, input.overrides, "headline");
      });
      rows = withDeleted("news", mapped, newsOfficial, (r) => String(r.id ?? ""), "headline");
    }

    sections.push({
      tabId: tab.id,
      label: tab.label,
      domain: tab.domain,
      kind: "rows",
      description: tab.description,
      allowCreate: Boolean(tab.allowCreate),
      fields: (NEPSE_HUB_ADMIN_FIELDS[tab.domain] ?? []).map((f) => ({
        key: f.key,
        label: f.label,
        type: f.type,
        value: null,
        officialValue: null,
        overridden: false,
        options: f.options,
      })),
      rows,
    });
  }

  return sections;
}

/** Re-export list helper for API convenience. */
export { listOverridesForSymbol };
