#!/usr/bin/env node
/**
 * Seed nepse_company_profiles / valuation / financials / dividends
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
const LIVE_URL = "https://shubhamnpk.github.io/yonepse/data/nepse_data.json";

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
const faceValue = (instrumentType) => ((instrumentType ?? "").toLowerCase().includes("mutual") ? 10 : 100);
const listedShares = (paidUp, instrumentType) => (paidUp != null && paidUp > 0 ? paidUp / faceValue(instrumentType) : null);

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

const [financials, dividends, securities, live] = await Promise.all([
  fetchJson(FINANCIALS_URL),
  fetchJson(DIVIDENDS_URL),
  fetchJson(SECURITIES_URL),
  fetchJson(LIVE_URL).catch(() => []),
]);

const liveBySymbol = new Map();
for (const row of Array.isArray(live) ? live : []) {
  const symbol = str(row.symbol)?.toUpperCase();
  if (!symbol) continue;
  liveBySymbol.set(symbol, row);
}

const now = new Date().toISOString();
const reportsBySymbol = new Map();
for (const company of financials) {
  const symbol = str(company.symbol)?.toUpperCase();
  if (!symbol || !Array.isArray(company.reports)) continue;
  reportsBySymbol.set(symbol, company.reports);
}

const pickLatest = (reports) =>
  [...reports].sort((a, b) => {
    const diff = fyStart(b.fy) - fyStart(a.fy);
    return diff !== 0 ? diff : qRank(b.quarter) - qRank(a.quarter);
  })[0];

const profileRows = securities
  .filter((sec) => str(sec.symbol))
  .map((sec) => {
    const symbol = str(sec.symbol).toUpperCase();
    const latest = pickLatest(reportsBySymbol.get(symbol) ?? []);
    const paidUp = latest ? num(latest.paid_up_capital) : null;
    const listed = listedShares(paidUp, str(sec.instrumentType));
    const liveRow = liveBySymbol.get(symbol);
    const price = num(liveRow?.ltp) || num(liveRow?.previous_close);
    const feedCap = num(liveRow?.market_cap);
    return {
      symbol,
      company_name: str(sec.companyName) ?? str(sec.securityName),
      sector: str(sec.sectorName),
      industry: str(sec.instrumentType),
      paid_up_capital_npr: paidUp,
      listed_shares: listed,
      market_cap_npr: feedCap && feedCap > 0 ? feedCap : price != null && listed != null ? price * listed : null,
      public_shares: null,
      promoter_shares: null,
      source: paidUp != null ? "yonepse:all_securities+filings" : "yonepse:all_securities",
      updated_at: now,
    };
  });

const valuationRows = [];
const financialRows = [];
for (const [symbol, reports] of reportsBySymbol) {
  const latest = pickLatest(reports);
  if (!latest) continue;
  const liveRow = liveBySymbol.get(symbol);
  const price = num(liveRow?.ltp) || num(liveRow?.previous_close);
  const eps = num(latest.eps);
  const book = num(latest.net_worth_per_share);
  const listed = listedShares(num(latest.paid_up_capital), "Equity");
  const docs = Array.isArray(latest.documents) ? latest.documents : [];
  const submitted = docs.map((d) => str(d.submitted_date)).filter(Boolean).sort().pop() ?? null;
  valuationRows.push({
    symbol,
    as_of_date: submitted,
    eps,
    pe: eps != null && eps > 0 && price != null && price > 0 ? price / eps : num(latest.pe),
    book_value_npr: book,
    pb: book != null && book > 0 && price != null && price > 0 ? price / book : null,
    roe_pct: eps != null && book != null && book > 0 ? (eps / book) * 100 : null,
    roa_pct: null,
    net_worth_npr: book != null && listed != null ? book * listed : null,
    graham_number: eps != null && book != null && eps > 0 && book > 0 ? Math.sqrt(22.5 * eps * book) : null,
    source: `yonepse:${str(latest.type) ?? "report"}:${str(latest.fy) ?? ""}${latest.quarter ? ` ${latest.quarter}` : ""}`,
    updated_at: now,
  });

  const seen = new Set();
  for (const report of reports) {
    if (!/annual/i.test(str(report.type) ?? "")) continue;
    const fy = str(report.fy);
    if (!fy || seen.has(fy)) continue;
    seen.add(fy);
    const reportListed = listedShares(num(report.paid_up_capital), "Equity");
    const reportBook = num(report.net_worth_per_share);
    financialRows.push({
      symbol,
      fiscal_year: fy,
      period_label: `FY ${fy}`,
      revenue_npr: null,
      operating_profit_npr: null,
      net_profit_npr: num(report.profit),
      reserves_npr: reportBook != null && reportListed != null ? reportBook * reportListed : null,
      cash_npr: null,
      borrowings_npr: null,
      assets_npr: null,
      liabilities_npr: null,
      source: `yonepse:annual:${fy}`,
      updated_at: now,
    });
  }
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
const fins = await upsert("nepse_company_financials", financialRows, "symbol,fiscal_year");
const divs = await upsert("nepse_company_dividends", dividendRows, "symbol,fiscal_year");

await sb.from("nepse_ingestion_runs").insert({
  kind: "fundamentals",
  status: "ok",
  items: profiles + valuations + fins + divs,
  message: `CLI seeded ${profiles} profiles, ${valuations} valuations, ${fins} financials, ${divs} dividend rows`,
  started_at: now,
});

const { data: nabilProfile } = await sb.from("nepse_company_profiles").select("*").eq("symbol", "NABIL").maybeSingle();
const { data: nabilVal } = await sb.from("nepse_company_valuation").select("*").eq("symbol", "NABIL").maybeSingle();
const { count: nabilFins } = await sb.from("nepse_company_financials").select("*", { count: "exact", head: true }).eq("symbol", "NABIL");

console.log(JSON.stringify({ profiles, valuations, financials: fins, dividends: divs, nabilProfile, nabilValuation: nabilVal, nabilFinancialRows: nabilFins }, null, 2));
