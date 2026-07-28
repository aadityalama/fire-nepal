/**
 * Editable NEPSE Hub Admin domains / fields + CMS tab catalog.
 * Official cron keeps ingesting; overrides win only for edited fields at read time.
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
  type: "string" | "number" | "boolean" | "json" | "date" | "select";
  options?: { value: string; label: string }[];
};

/** Visual CMS tabs that mirror the public company page sections. */
export type NepseHubCmsTabId =
  | "overview"
  | "price"
  | "metrics"
  | "intelligence"
  | "financials"
  | "dividends"
  | "actions"
  | "ownership"
  | "news"
  | "ai";

export type NepseHubCmsSectionKind = "fields" | "rows";

export type NepseHubCmsTabDef = {
  id: NepseHubCmsTabId;
  label: string;
  domain: NepseHubAdminDomain;
  kind: NepseHubCmsSectionKind;
  /** Human-readable identity column for row tables. */
  rowLabelKey?: string;
  /** When true, Add Row creates a CMS-only record. */
  allowCreate?: boolean;
  description?: string;
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

export const NEPSE_HUB_CMS_TABS: NepseHubCmsTabDef[] = [
  {
    id: "overview",
    label: "Overview",
    domain: "profile",
    kind: "fields",
    description: "Company identity, capital structure, and contact details.",
  },
  {
    id: "price",
    label: "Price & Chart",
    domain: "technical",
    kind: "fields",
    description: "Session stats and technical indicator overrides.",
  },
  {
    id: "metrics",
    label: "Key Metrics",
    domain: "ratios",
    kind: "fields",
    description: "Valuation and profitability ratios.",
  },
  {
    id: "intelligence",
    label: "Intelligence",
    domain: "statements",
    kind: "rows",
    rowLabelKey: "periodLabel",
    allowCreate: true,
    description: "Quarterly and annual statement periods used by Intelligence.",
  },
  {
    id: "financials",
    label: "Financials",
    domain: "statements",
    kind: "rows",
    rowLabelKey: "fiscalYear",
    allowCreate: true,
    description: "Income statement, balance sheet, and cash flow line items.",
  },
  {
    id: "dividends",
    label: "Dividends",
    domain: "dividends",
    kind: "rows",
    rowLabelKey: "fiscalYear",
    allowCreate: true,
    description: "Every fiscal year is an editable dividend row.",
  },
  {
    id: "actions",
    label: "Actions",
    domain: "actions",
    kind: "rows",
    rowLabelKey: "title",
    allowCreate: true,
    description: "Corporate actions: bonus, rights, split, merger, listing, and more.",
  },
  {
    id: "ownership",
    label: "Ownership",
    domain: "ownership",
    kind: "fields",
    description: "Shareholding breakdown and shareholder rows.",
  },
  {
    id: "news",
    label: "News",
    domain: "news",
    kind: "rows",
    rowLabelKey: "headline",
    allowCreate: true,
    description: "Company news headlines and metadata.",
  },
  {
    id: "ai",
    label: "AI Analysis",
    domain: "ai",
    kind: "fields",
    description: "Investment thesis, pros/cons, target price, and risk narrative.",
  },
];

export const NEPSE_CORPORATE_ACTION_OPTIONS = [
  { value: "bonus", label: "Bonus" },
  { value: "rights", label: "Rights" },
  { value: "split", label: "Split" },
  { value: "merger", label: "Merger" },
  { value: "listing", label: "Listing" },
  { value: "delisting", label: "Delisting" },
  { value: "acquisition", label: "Acquisition" },
  { value: "dividend", label: "Dividend" },
  { value: "agm", label: "AGM" },
  { value: "book_close", label: "Book Close" },
  { value: "fpo", label: "FPO" },
  { value: "ipo", label: "IPO" },
] as const;

export const NEPSE_HUB_ADMIN_FIELDS: Record<NepseHubAdminDomain, NepseHubAdminFieldDef[]> = {
  profile: [
    { key: "companyName", label: "Company Name", type: "string" },
    { key: "sector", label: "Sector", type: "string" },
    { key: "industry", label: "Industry", type: "string" },
    { key: "marketCapNpr", label: "Market Cap (NPR)", type: "number" },
    { key: "paidUpCapitalNpr", label: "Paid-up Capital (NPR)", type: "number" },
    { key: "listedShares", label: "Listed Shares", type: "number" },
    { key: "promoterShares", label: "Promoter Shares", type: "number" },
    { key: "publicShares", label: "Public Shares", type: "number" },
    { key: "website", label: "Website", type: "string" },
    { key: "email", label: "Email", type: "string" },
    { key: "address", label: "Address", type: "string" },
    { key: "phone", label: "Phone", type: "string" },
    { key: "ceo", label: "CEO", type: "string" },
    { key: "founded", label: "Founded", type: "string" },
    { key: "registrar", label: "Registrar", type: "string" },
    { key: "auditor", label: "Auditor", type: "string" },
  ],
  ownership: [
    { key: "promoterShares", label: "Promoter Shares", type: "number" },
    { key: "publicShares", label: "Public Shares", type: "number" },
    { key: "listedShares", label: "Listed Shares", type: "number" },
    { key: "promoterPct", label: "Promoter %", type: "number" },
    { key: "publicPct", label: "Public %", type: "number" },
    { key: "mutualFundsPct", label: "Mutual Funds %", type: "number" },
    { key: "institutionsPct", label: "Institutions %", type: "number" },
    { key: "foreignPct", label: "Foreign %", type: "number" },
    { key: "shareholderName", label: "Shareholder Name", type: "string" },
    { key: "shareholderShares", label: "Shareholder Shares", type: "number" },
    { key: "shareholderPct", label: "Shareholder %", type: "number" },
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
    { key: "netProfitMarginPct", label: "Net Profit Margin %", type: "number" },
    { key: "operatingMarginPct", label: "Operating Margin %", type: "number" },
    { key: "debtToEquity", label: "Debt to Equity", type: "number" },
    { key: "currentRatio", label: "Current Ratio", type: "number" },
    { key: "quickRatio", label: "Quick Ratio", type: "number" },
  ],
  statements: [
    { key: "fiscalYear", label: "Fiscal Year", type: "string" },
    { key: "periodLabel", label: "Period Label", type: "string" },
    { key: "periodType", label: "Period Type", type: "select", options: [
      { value: "annual", label: "Annual" },
      { value: "quarterly", label: "Quarterly" },
    ] },
    { key: "quarter", label: "Quarter", type: "number" },
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
    { key: "assetsNpr", label: "Assets (summary)", type: "number" },
    { key: "liabilitiesNpr", label: "Liabilities (summary)", type: "number" },
  ],
  dividends: [
    { key: "fiscalYear", label: "Fiscal Year", type: "string" },
    { key: "bonusPct", label: "Bonus %", type: "number" },
    { key: "cashPct", label: "Cash %", type: "number" },
    { key: "bookCloseDate", label: "Book Close Date", type: "date" },
    { key: "agmDate", label: "AGM Date", type: "date" },
    { key: "notes", label: "Notes", type: "string" },
  ],
  actions: [
    {
      key: "actionType",
      label: "Action Type",
      type: "select",
      options: [...NEPSE_CORPORATE_ACTION_OPTIONS],
    },
    { key: "title", label: "Title", type: "string" },
    { key: "actionDate", label: "Action Date", type: "date" },
    { key: "details", label: "Details", type: "string" },
    { key: "sourceUrl", label: "Source URL", type: "string" },
  ],
  technical: [
    { key: "previousCloseNpr", label: "Previous Close", type: "number" },
    { key: "openNpr", label: "Open", type: "number" },
    { key: "highNpr", label: "High", type: "number" },
    { key: "lowNpr", label: "Low", type: "number" },
    { key: "closeNpr", label: "Close / LTP", type: "number" },
    { key: "vwapNpr", label: "VWAP", type: "number" },
    { key: "volume", label: "Volume", type: "number" },
    { key: "turnoverNpr", label: "Turnover (NPR)", type: "number" },
    { key: "trades", label: "Trades", type: "number" },
    { key: "circuit", label: "Circuit", type: "string" },
    { key: "rsi", label: "RSI", type: "number" },
    { key: "macd", label: "MACD", type: "number" },
    { key: "atr", label: "ATR", type: "number" },
    { key: "beta", label: "Beta", type: "number" },
    { key: "high52wNpr", label: "52W High", type: "number" },
    { key: "low52wNpr", label: "52W Low", type: "number" },
    // Legacy aliases kept for existing overrides
    { key: "open", label: "Open (legacy)", type: "number" },
    { key: "high", label: "High (legacy)", type: "number" },
    { key: "low", label: "Low (legacy)", type: "number" },
    { key: "close", label: "Close (legacy)", type: "number" },
  ],
  ai: [
    { key: "investmentThesis", label: "Investment Thesis", type: "string" },
    { key: "pros", label: "Pros", type: "string" },
    { key: "cons", label: "Cons", type: "string" },
    { key: "summary", label: "Summary", type: "string" },
    { key: "targetPrice", label: "Target Price", type: "number" },
    { key: "risk", label: "Risk", type: "string" },
    { key: "outlook", label: "Outlook", type: "string" },
    { key: "riskNote", label: "Risk Note", type: "string" },
    { key: "bullCase", label: "Bull Case / Pros", type: "string" },
    { key: "bearCase", label: "Bear Case / Cons", type: "string" },
    { key: "payload", label: "Full AI Payload (JSON)", type: "json" },
  ],
  news: [
    { key: "headline", label: "Headline", type: "string" },
    { key: "summary", label: "Summary", type: "string" },
    { key: "snippet", label: "Snippet", type: "string" },
    { key: "sentiment", label: "Sentiment", type: "select", options: [
      { value: "positive", label: "Positive" },
      { value: "neutral", label: "Neutral" },
      { value: "negative", label: "Negative" },
    ] },
    { key: "category", label: "Category", type: "string" },
    { key: "publishedAt", label: "Published At", type: "date" },
    { key: "sourceName", label: "Source Name", type: "string" },
    { key: "sourceUrl", label: "Source URL", type: "string" },
  ],
  market: [
    { key: "ltpNpr", label: "LTP (NPR)", type: "number" },
    { key: "percentChange", label: "Percent Change", type: "number" },
    { key: "marketCapNpr", label: "Market Cap (NPR)", type: "number" },
    { key: "sector", label: "Sector", type: "string" },
  ],
  custom: [{ key: "value", label: "Custom Value (JSON)", type: "json" }],
};

/** Field keys reserved for record-level CMS operations (not shown as editable cells). */
export const CMS_DELETED_FIELD = "__deleted__";
export const CMS_ROW_PAYLOAD_FIELD = "__row__";
export const CMS_RECORD_PREFIX = "cms:";

export function isNepseHubAdminDomain(value: string): value is NepseHubAdminDomain {
  return value in NEPSE_HUB_ADMIN_DOMAIN_LABELS;
}

export function isCmsCreatedRecordKey(recordKey: string): boolean {
  return recordKey.startsWith(CMS_RECORD_PREFIX);
}

export function newCmsRecordKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${CMS_RECORD_PREFIX}${crypto.randomUUID()}`;
  }
  return `${CMS_RECORD_PREFIX}${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
