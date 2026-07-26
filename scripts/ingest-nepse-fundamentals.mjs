#!/usr/bin/env node
/**
 * Seed nepse_company_profiles / nepse_company_valuation / nepse_company_dividends
 * from the real Yonepse filings mirror (same logic as the cron fundamentals ingest).
 * Usage: node scripts/ingest-nepse-fundamentals.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { loadDotEnvLocal } from "./load-dotenv-local.mjs";

loadDotEnvLocal();

const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim().replace(/\/+$/, "");
const key = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

const FINANCIALS_URL = "https://shubhamnpk.github.io/yonepse/data/company/financials.json";
const DIVIDENDS_URL = "https://shubhamnpk.github.io/yonepse/data/proposed_dividend/history_all_years.json";
const SECURITIES_URL = "https://shubhamnpk.github.io/yonepse/data/all_securities.json";

async function fetchJson(u) {
  const res = await fetch(u, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${u}`);
  return res.json();
}

const num = (v) => (typeof v === "number" && Number.isFinite(v) ? v : typeof v === "string" && v.trim() && Number.isFinite(Number(v)) ? Number(v) : null);
const str = (v) => (typeof v === "string" && v.trim() ? v.trim() : null);
const fyStart = (fy) => {
  const m = typeof fy === "string" ? fy.match(/^(\d{4})/) : null;
  return m ? Number(m[1]) : 0;
};
const QUARTERS = { "first quarter": 1, "second quarter": 2, "third quarter": 3, "fourth quarter": 4 };
const qRank = (q) => (q ? (QUARTERS[q.toLowerCase()] ?? 0) : 0);

async function upsert(table, rows, onConflict) {
  let ok = 0;
  for (let i = 0; i < rows.length; i += 500) {
    const chunk = rows.slice(i, i + 500);
    const { error } = await sb.from(table).upsert(chunk, { onConflict });
    if (error) throw new Error(`${table}: ${error.message}`);
    ok += chunk.length;
  }
  return ok;
}

const [financials, dividends, securities] = await Promise.all([
  fetchJson(FINANCIALS_URL),
  fetchJson(DIVIDENDS_URL),
  fetchJson(SECURITIES_URL),
]);

const now = new Date().toISOString();

const profileRows = securities
  .filter((sec) => str(sec.symbol))
  .map((sec) => ({
    symbol: str(sec.symbol).toUpperCase(),
    company_name: str(sec.companyName) ?? str(sec.securityName),
    sector: str(sec.sectorName),
    industry: str(sec.instrumentType),
    source: "yonepse:all_securities",
    updated_at: now,
  }));

const valuationRows = [];
for (const company of financials) {
  const symbol = str(company.symbol)?.toUpperCase();
  if (!symbol || !Array.isArray(company.reports) || !company.reports.length) continue;
  const latest = [...company.reports].sort((a, b) => {
    const diff = fyStart(b.fy) - fyStart(a.fy);
    return diff !== 0 ? diff : qRank(b.quarter) - qRank(a.quarter);
  })[0];
  const docs = Array.isArray(latest.documents) ? latest.documents : [];
  const submitted = docs.map((d) => str(d.submitted_date)).filter(Boolean).sort().pop() ?? null;
  valuationRows.push({
    symbol,
    as_of_date: submitted,
    eps: num(latest.eps),
    pe: num(latest.pe),
    book_value_npr: num(latest.net_worth_per_share),
    source: `yonepse:${str(latest.type) ?? "report"}:${str(latest.fy) ?? ""}${latest.quarter ? ` ${latest.quarter}` : ""}`,
    updated_at: now,
  });
}

const seenDividend = new Set();
const dividendRows = [];
for (const row of dividends) {
  const symbol = str(row.symbol)?.toUpperCase();
  const fiscalYear = str(row.fiscal_year);
  if (!symbol || !fiscalYear) continue;
  const dedupeKey = `${symbol}·${fiscalYear}`;
  if (seenDividend.has(dedupeKey)) continue;
  seenDividend.add(dedupeKey);
  dividendRows.push({
    symbol,
    fiscal_year: fiscalYear,
    bonus_pct: num(row.bonus_share),
    cash_pct: num(row.cash_dividend),
    book_close_date: str(row.bookclose_date),
    source: "yonepse:proposed_dividend",
    updated_at: now,
  });
}

const profiles = await upsert("nepse_company_profiles", profileRows, "symbol");
const valuations = await upsert("nepse_company_valuation", valuationRows, "symbol");
const divs = await upsert("nepse_company_dividends", dividendRows, "symbol,fiscal_year");

await sb.from("nepse_ingestion_runs").insert({
  kind: "fundamentals",
  status: "ok",
  items: profiles + valuations + divs,
  message: `CLI seeded ${profiles} profiles, ${valuations} valuations, ${divs} dividend rows`,
  started_at: now,
});

const { data: nabilVal } = await sb.from("nepse_company_valuation").select("*").eq("symbol", "NABIL").maybeSingle();
const { count: nabilDivs } = await sb.from("nepse_company_dividends").select("*", { count: "exact", head: true }).eq("symbol", "NABIL");

console.log(JSON.stringify({ profiles, valuations, dividends: divs, nabilValuation: nabilVal, nabilDividendRows: nabilDivs }, null, 2));
