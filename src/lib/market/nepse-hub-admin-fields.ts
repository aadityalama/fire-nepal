/**
 * Editable NEPSE Hub Admin domains / fields.
 * New company-related fields can be added here; freeform custom fields also supported via API.
 */

export type NepseHubAdminDomain =
  | "profile"
  | "statements"
  | "ratios"
  | "dividends"
  | "ownership"
  | "actions"
  | "technical"
  | "ai"
  | "news"
  | "market"
  | "custom";

export type NepseHubAdminFieldDef = {
  key: string;
  label: string;
  type: "string" | "number" | "boolean" | "json";
};

export const NEPSE_HUB_ADMIN_DOMAIN_LABELS: Record<NepseHubAdminDomain, string> = {
  profile: "Company Profile",
  statements: "Financial Statements",
  ratios: "Ratios",
  dividends: "Dividends",
  ownership: "Ownership",
  actions: "Corporate Actions",
  technical: "Technical Data",
  ai: "AI Analysis",
  news: "News",
  market: "Market Data",
  custom: "Custom Fields",
};

export const NEPSE_HUB_ADMIN_FIELDS: Record<NepseHubAdminDomain, NepseHubAdminFieldDef[]> = {
  profile: [
    { key: "companyName", label: "Company Name", type: "string" },
    { key: "sector", label: "Sector", type: "string" },
    { key: "industry", label: "Industry", type: "string" },
    { key: "marketCapNpr", label: "Market Cap (NPR)", type: "number" },
    { key: "paidUpCapitalNpr", label: "Paid-up Capital (NPR)", type: "number" },
    { key: "listedShares", label: "Listed Shares", type: "number" },
  ],
  ownership: [
    { key: "promoterShares", label: "Promoter Shares", type: "number" },
    { key: "publicShares", label: "Public Shares", type: "number" },
    { key: "listedShares", label: "Listed Shares", type: "number" },
  ],
  ratios: [
    { key: "eps", label: "EPS", type: "number" },
    { key: "pe", label: "P/E", type: "number" },
    { key: "bookValueNpr", label: "Book Value (NPR)", type: "number" },
    { key: "pb", label: "P/B", type: "number" },
    { key: "roePct", label: "ROE %", type: "number" },
    { key: "roaPct", label: "ROA %", type: "number" },
    { key: "netWorthNpr", label: "Net Worth (NPR)", type: "number" },
    { key: "grahamNumber", label: "Graham Number", type: "number" },
  ],
  statements: [
    { key: "revenueNpr", label: "Revenue", type: "number" },
    { key: "operatingRevenueNpr", label: "Operating Revenue", type: "number" },
    { key: "otherIncomeNpr", label: "Other Income", type: "number" },
    { key: "grossProfitNpr", label: "Gross Profit", type: "number" },
    { key: "operatingProfitNpr", label: "Operating Profit", type: "number" },
    { key: "ebitdaNpr", label: "EBITDA", type: "number" },
    { key: "ebitNpr", label: "EBIT", type: "number" },
    { key: "netProfitNpr", label: "Net Profit", type: "number" },
    { key: "eps", label: "EPS", type: "number" },
    { key: "dilutedEps", label: "Diluted EPS", type: "number" },
    { key: "totalAssetsNpr", label: "Total Assets", type: "number" },
    { key: "currentAssetsNpr", label: "Current Assets", type: "number" },
    { key: "nonCurrentAssetsNpr", label: "Non-current Assets", type: "number" },
    { key: "cashNpr", label: "Cash & Cash Equivalents", type: "number" },
    { key: "investmentsNpr", label: "Investments", type: "number" },
    { key: "inventoriesNpr", label: "Inventories", type: "number" },
    { key: "receivablesNpr", label: "Receivables", type: "number" },
    { key: "totalEquityNpr", label: "Total Equity", type: "number" },
    { key: "shareCapitalNpr", label: "Share Capital", type: "number" },
    { key: "reservesNpr", label: "Reserves", type: "number" },
    { key: "retainedEarningsNpr", label: "Retained Earnings", type: "number" },
    { key: "totalLiabilitiesNpr", label: "Total Liabilities", type: "number" },
    { key: "currentLiabilitiesNpr", label: "Current Liabilities", type: "number" },
    { key: "nonCurrentLiabilitiesNpr", label: "Non-current Liabilities", type: "number" },
    { key: "borrowingsNpr", label: "Borrowings", type: "number" },
    { key: "operatingCashFlowNpr", label: "Operating Cash Flow", type: "number" },
    { key: "investingCashFlowNpr", label: "Investing Cash Flow", type: "number" },
    { key: "financingCashFlowNpr", label: "Financing Cash Flow", type: "number" },
    { key: "freeCashFlowNpr", label: "Free Cash Flow", type: "number" },
    { key: "netCashMovementNpr", label: "Net Cash Movement", type: "number" },
  ],
  dividends: [
    { key: "bonusPct", label: "Bonus %", type: "number" },
    { key: "cashPct", label: "Cash %", type: "number" },
    { key: "bookCloseDate", label: "Book Close Date", type: "string" },
    { key: "agmDate", label: "AGM Date", type: "string" },
  ],
  actions: [
    { key: "actionType", label: "Action Type", type: "string" },
    { key: "title", label: "Title", type: "string" },
    { key: "actionDate", label: "Action Date", type: "string" },
    { key: "details", label: "Details", type: "string" },
    { key: "sourceUrl", label: "Source URL", type: "string" },
  ],
  technical: [
    { key: "open", label: "Open", type: "number" },
    { key: "high", label: "High", type: "number" },
    { key: "low", label: "Low", type: "number" },
    { key: "close", label: "Close", type: "number" },
    { key: "volume", label: "Volume", type: "number" },
    { key: "turnoverNpr", label: "Turnover (NPR)", type: "number" },
    { key: "trades", label: "Trades", type: "number" },
  ],
  ai: [
    { key: "summary", label: "Summary", type: "string" },
    { key: "outlook", label: "Outlook", type: "string" },
    { key: "riskNote", label: "Risk Note", type: "string" },
    { key: "bullCase", label: "Bull Case", type: "string" },
    { key: "bearCase", label: "Bear Case", type: "string" },
    { key: "payload", label: "Full AI Payload (JSON)", type: "json" },
  ],
  news: [
    { key: "headline", label: "Headline", type: "string" },
    { key: "snippet", label: "Snippet", type: "string" },
    { key: "sentiment", label: "Sentiment", type: "string" },
    { key: "category", label: "Category", type: "string" },
    { key: "publishedAt", label: "Published At", type: "string" },
  ],
  market: [
    { key: "ltpNpr", label: "LTP (NPR)", type: "number" },
    { key: "percentChange", label: "Percent Change", type: "number" },
    { key: "marketCapNpr", label: "Market Cap (NPR)", type: "number" },
    { key: "sector", label: "Sector", type: "string" },
  ],
  custom: [{ key: "value", label: "Custom Value (JSON)", type: "json" }],
};

export function isNepseHubAdminDomain(value: string): value is NepseHubAdminDomain {
  return value in NEPSE_HUB_ADMIN_DOMAIN_LABELS;
}
