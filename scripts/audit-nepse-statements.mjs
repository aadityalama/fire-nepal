#!/usr/bin/env node
/**
 * Audit financial-statement coverage across listed companies.
 *
 * Reports:
 *  - Total companies checked
 *  - Total statement rows ingested
 *  - Coverage percentage (periods with ≥1 statement line beyond EPS/profit scalars)
 *  - Remaining unavailable fields + reasons
 *
 * Usage: node scripts/audit-nepse-statements.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { loadDotEnvLocal } from "./load-dotenv-local.mjs";

loadDotEnvLocal();

const FINANCIALS_URL = "https://shubhamnpk.github.io/yonepse/data/company/financials.json";

const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim().replace(/\/+$/, "");
const key = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

const LINE_FIELDS = [
  ["revenue_npr", "Revenue"],
  ["operating_revenue_npr", "Operating Revenue"],
  ["other_income_npr", "Other Income"],
  ["gross_profit_npr", "Gross Profit"],
  ["operating_profit_npr", "Operating Profit"],
  ["ebitda_npr", "EBITDA"],
  ["ebit_npr", "EBIT"],
  ["net_profit_npr", "Net Profit"],
  ["eps", "EPS"],
  ["diluted_eps", "Diluted EPS"],
  ["total_assets_npr", "Total Assets"],
  ["current_assets_npr", "Current Assets"],
  ["non_current_assets_npr", "Non-current Assets"],
  ["cash_npr", "Cash & Cash Equivalents"],
  ["investments_npr", "Investments"],
  ["inventories_npr", "Inventories"],
  ["receivables_npr", "Receivables"],
  ["total_equity_npr", "Total Equity"],
  ["share_capital_npr", "Share Capital"],
  ["reserves_npr", "Reserves"],
  ["retained_earnings_npr", "Retained Earnings"],
  ["total_liabilities_npr", "Total Liabilities"],
  ["current_liabilities_npr", "Current Liabilities"],
  ["non_current_liabilities_npr", "Non-current Liabilities"],
  ["borrowings_npr", "Borrowings"],
  ["operating_cash_flow_npr", "Operating Cash Flow"],
  ["investing_cash_flow_npr", "Investing Cash Flow"],
  ["financing_cash_flow_npr", "Financing Cash Flow"],
  ["free_cash_flow_npr", "Free Cash Flow"],
  ["net_cash_movement_npr", "Net Cash Movement"],
];

function reasonFor(field, row) {
  const status = row.extraction_status ?? "structured_only";
  const structuredOnly = new Set(["net_profit_npr", "eps", "share_capital_npr", "paid_up_capital_npr"]);
  if (status === "no_document") {
    return "No official PDF attached on NEPSE fiscal report";
  }
  if (status === "pdf_unreadable") {
    return "Official PDF is image-only / not text-extractable";
  }
  if (status === "structured_only" && !structuredOnly.has(field)) {
    return "Line item not present in NEPSE structured fiscalReport JSON; PDF not yet parsed";
  }
  if (field === "ebitda_npr" || field === "ebit_npr" || field === "free_cash_flow_npr" || field === "diluted_eps") {
    return "Not published under a recognized label in the official filing text";
  }
  if (field.startsWith("operating_cash_flow") || field.startsWith("investing_cash_flow") || field.startsWith("financing_cash_flow") || field === "net_cash_movement_npr") {
    return "Cash-flow statement lines not published (or not text-labeled) in the official filing";
  }
  return "Not published in the official NEPSE filing for this period";
}

const filings = await fetch(FINANCIALS_URL, { headers: { Accept: "application/json" } }).then((r) => r.json());
const listedSymbols = new Set(
  (Array.isArray(filings) ? filings : [])
    .map((row) => (typeof row?.symbol === "string" ? row.symbol.toUpperCase() : null))
    .filter(Boolean),
);

const { data, error } = await sb.from("nepse_company_statements").select("*");
if (error) {
  console.error("Query failed:", error.message);
  console.error("Apply migration supabase/migrations/20260727120000_nepse_company_statements.sql first.");
  process.exit(1);
}

const rows = data ?? [];
const companiesWithRows = new Set(rows.map((row) => row.symbol));
const totalCompaniesChecked = listedSymbols.size || companiesWithRows.size;
const totalStatementRows = rows.length;

let periodsWithExtendedLines = 0;
const unavailable = new Map(); // field -> { count, reasons: Map }

for (const row of rows) {
  let extended = false;
  for (const [field] of LINE_FIELDS) {
    const value = row[field];
    const present = value != null && Number.isFinite(Number(value));
    if (present && !["net_profit_npr", "eps"].includes(field)) extended = true;
    if (present) continue;
    const entry = unavailable.get(field) ?? { count: 0, reasons: new Map() };
    entry.count += 1;
    const why = reasonFor(field, row);
    entry.reasons.set(why, (entry.reasons.get(why) ?? 0) + 1);
    unavailable.set(field, entry);
  }
  if (extended) periodsWithExtendedLines += 1;
}

const companiesMissingAnyRow = [...listedSymbols].filter((symbol) => !companiesWithRows.has(symbol));
const coveragePct =
  totalStatementRows === 0 ? 0 : Number(((periodsWithExtendedLines / totalStatementRows) * 100).toFixed(2));

const report = {
  totalCompaniesChecked,
  companiesWithStatementRows: companiesWithRows.size,
  companiesMissingStatementRows: companiesMissingAnyRow.length,
  sampleMissingCompanies: companiesMissingAnyRow.slice(0, 25),
  totalStatementRowsIngested: totalStatementRows,
  periodsWithExtendedStatementLines: periodsWithExtendedLines,
  coveragePercentageExtendedLines: coveragePct,
  extractionStatusCounts: rows.reduce((acc, row) => {
    const key = row.extraction_status ?? "unknown";
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {}),
  remainingUnavailableFields: LINE_FIELDS.map(([field, label]) => {
    const entry = unavailable.get(field) ?? { count: 0, reasons: new Map() };
    return {
      field,
      label,
      unavailableCells: entry.count,
      reasons: [...entry.reasons.entries()].map(([reason, count]) => ({ reason, count })),
    };
  }),
};

console.log(JSON.stringify(report, null, 2));
