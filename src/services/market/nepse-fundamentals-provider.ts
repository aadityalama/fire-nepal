import { createMemoryTtlCache } from "@/lib/api/memory-ttl-cache";
import { fetchJson } from "@/lib/api/fetch-json";

/**
 * Real fundamentals provider (Yonepse static JSON mirror of NEPSE company filings).
 * Publishes quarterly/annual report figures (EPS, PE, profit, net worth per share,
 * paid-up capital), multi-year dividend history and the securities registry.
 * Revenue / assets / liabilities / cash flow are NOT published here — those fields
 * stay null and the UI shows "Data unavailable". Nothing is ever synthesized.
 */

const FINANCIALS_URL = "https://shubhamnpk.github.io/yonepse/data/company/financials.json";
const DIVIDENDS_URL = "https://shubhamnpk.github.io/yonepse/data/proposed_dividend/history_all_years.json";
const SECURITIES_URL = "https://shubhamnpk.github.io/yonepse/data/all_securities.json";

/** Filings change at most a few times per quarter — cache aggressively. */
const TTL_MS = 6 * 60 * 60 * 1000;

const cache = createMemoryTtlCache();

export type ProviderReport = {
  type: "quarterly" | "annual";
  fiscalYear: string;
  fiscalYearNepali: string | null;
  quarter: string | null;
  eps: number | null;
  pe: number | null;
  profitNpr: number | null;
  paidUpCapitalNpr: number | null;
  netWorthPerShareNpr: number | null;
  submittedDate: string | null;
};

export type ProviderDividend = {
  symbol: string;
  fiscalYear: string;
  cashPct: number | null;
  bonusPct: number | null;
  totalPct: number | null;
  announcementDate: string | null;
  bookCloseDate: string | null;
};

export type ProviderSecurity = {
  symbol: string;
  companyName: string | null;
  sector: string | null;
  instrumentType: string | null;
};

function num(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value);
  return null;
}

function str(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  return null;
}

function mapReport(raw: Record<string, unknown>): ProviderReport | null {
  const typeRaw = str(raw.type)?.toLowerCase() ?? "";
  const type = typeRaw.includes("annual") ? "annual" : typeRaw.includes("quarter") ? "quarterly" : null;
  const fiscalYear = str(raw.fy);
  if (!type || !fiscalYear) return null;
  const docs = Array.isArray(raw.documents) ? (raw.documents as Record<string, unknown>[]) : [];
  const submittedDate = docs.map((doc) => str(doc.submitted_date)).filter(Boolean).sort().pop() ?? null;
  return {
    type,
    fiscalYear,
    fiscalYearNepali: str(raw.fy_nepali),
    quarter: str(raw.quarter),
    eps: num(raw.eps),
    pe: num(raw.pe),
    profitNpr: num(raw.profit),
    paidUpCapitalNpr: num(raw.paid_up_capital),
    netWorthPerShareNpr: num(raw.net_worth_per_share),
    submittedDate,
  };
}

/** All published filings keyed by uppercase symbol. */
export async function getCompanyReportsBySymbol(): Promise<Map<string, ProviderReport[]>> {
  const key = "nepse-provider-reports-v1";
  const hit = cache.get<Map<string, ProviderReport[]>>(key);
  if (hit) return hit;

  const payload = await fetchJson<Record<string, unknown>[]>(FINANCIALS_URL, { timeoutMs: 30_000, retries: 1 });
  const bySymbol = new Map<string, ProviderReport[]>();
  for (const company of Array.isArray(payload) ? payload : []) {
    const symbol = str(company.symbol)?.toUpperCase();
    if (!symbol) continue;
    const reports = (Array.isArray(company.reports) ? (company.reports as Record<string, unknown>[]) : [])
      .map(mapReport)
      .filter((row): row is ProviderReport => Boolean(row));
    if (reports.length) bySymbol.set(symbol, reports);
  }
  cache.set(key, bySymbol, TTL_MS);
  return bySymbol;
}

/** Dividend history (all years) keyed by uppercase symbol. */
export async function getDividendHistoryBySymbol(): Promise<Map<string, ProviderDividend[]>> {
  const key = "nepse-provider-dividends-v1";
  const hit = cache.get<Map<string, ProviderDividend[]>>(key);
  if (hit) return hit;

  const payload = await fetchJson<Record<string, unknown>[]>(DIVIDENDS_URL, { timeoutMs: 30_000, retries: 1 });
  const bySymbol = new Map<string, ProviderDividend[]>();
  for (const raw of Array.isArray(payload) ? payload : []) {
    const symbol = str(raw.symbol)?.toUpperCase();
    const fiscalYear = str(raw.fiscal_year);
    if (!symbol || !fiscalYear) continue;
    const row: ProviderDividend = {
      symbol,
      fiscalYear,
      cashPct: num(raw.cash_dividend),
      bonusPct: num(raw.bonus_share),
      totalPct: num(raw.total_dividend),
      announcementDate: str(raw.announcement_date),
      bookCloseDate: str(raw.bookclose_date),
    };
    const list = bySymbol.get(symbol);
    if (list) list.push(row);
    else bySymbol.set(symbol, [row]);
  }
  for (const rows of bySymbol.values()) {
    rows.sort((a, b) => b.fiscalYear.localeCompare(a.fiscalYear));
  }
  cache.set(key, bySymbol, TTL_MS);
  return bySymbol;
}

/** Securities registry (name, sector) keyed by uppercase symbol. */
export async function getSecuritiesBySymbol(): Promise<Map<string, ProviderSecurity>> {
  const key = "nepse-provider-securities-v1";
  const hit = cache.get<Map<string, ProviderSecurity>>(key);
  if (hit) return hit;

  const payload = await fetchJson<Record<string, unknown>[]>(SECURITIES_URL, { timeoutMs: 20_000, retries: 1 });
  const bySymbol = new Map<string, ProviderSecurity>();
  for (const raw of Array.isArray(payload) ? payload : []) {
    const symbol = str(raw.symbol)?.toUpperCase();
    if (!symbol) continue;
    bySymbol.set(symbol, {
      symbol,
      companyName: str(raw.companyName) ?? str(raw.securityName),
      sector: str(raw.sectorName),
      instrumentType: str(raw.instrumentType),
    });
  }
  cache.set(key, bySymbol, TTL_MS);
  return bySymbol;
}

const QUARTER_ORDER: Record<string, number> = {
  "first quarter": 1,
  "second quarter": 2,
  "third quarter": 3,
  "fourth quarter": 4,
};

export function quarterRank(quarter: string | null): number {
  if (!quarter) return 0;
  return QUARTER_ORDER[quarter.toLowerCase()] ?? 0;
}

export function shortQuarterLabel(quarter: string | null): string {
  const rank = quarterRank(quarter);
  return rank ? `Q${rank}` : quarter ?? "";
}

/** "2081/2082" or "2081-2082" → 2081; "2024-2025" → 2024. Null when not parseable. */
export function fiscalYearStart(fiscalYear: string | null): number | null {
  if (!fiscalYear) return null;
  const match = fiscalYear.match(/^(\d{4})/);
  if (!match) return null;
  const year = Number(match[1]);
  return Number.isFinite(year) ? year : null;
}

/** Normalize "2081/2082" → "2081-2082" so dividend FYs match report `fy_nepali`. */
export function normalizeFiscalYear(fiscalYear: string): string {
  return fiscalYear.replace(/\//g, "-").trim();
}

/** CAGR between two real positive values across `years` periods. */
export function cagrPct(startValue: number | null, endValue: number | null, years: number): number | null {
  if (startValue == null || endValue == null || startValue <= 0 || endValue <= 0 || years <= 0) return null;
  return (Math.pow(endValue / startValue, 1 / years) - 1) * 100;
}
