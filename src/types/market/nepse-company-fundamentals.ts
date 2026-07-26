/**
 * Canonical company fundamental contracts for NEPSE Hub Company Details.
 * Nullable fields mean the value is not yet ingested — UI must show "Data unavailable".
 * Never invent PE/EPS/ownership/financials.
 */

export const DATA_UNAVAILABLE = "Data unavailable" as const;

export type NepseCorporateActionType =
  | "rights"
  | "bonus"
  | "dividend"
  | "agm"
  | "book_close"
  | "fpo"
  | "ipo"
  | "merger";

export type NepseCompanyProfile = {
  symbol: string;
  companyName: string | null;
  sector: string | null;
  industry: string | null;
  marketCapNpr: number | null;
  paidUpCapitalNpr: number | null;
  listedShares: number | null;
  publicShares: number | null;
  promoterShares: number | null;
  source: string | null;
  updatedAt: string | null;
};

export type NepseCompanyValuation = {
  symbol: string;
  asOfDate: string | null;
  eps: number | null;
  pe: number | null;
  bookValueNpr: number | null;
  pb: number | null;
  roePct: number | null;
  roaPct: number | null;
  netWorthNpr: number | null;
  grahamNumber: number | null;
  source: string | null;
  updatedAt: string | null;
};

export type NepseCompanyFinancialRow = {
  symbol: string;
  fiscalYear: string;
  periodLabel: string | null;
  revenueNpr: number | null;
  operatingProfitNpr: number | null;
  netProfitNpr: number | null;
  reservesNpr: number | null;
  cashNpr: number | null;
  borrowingsNpr: number | null;
  assetsNpr: number | null;
  liabilitiesNpr: number | null;
  source: string | null;
};

export type NepseCompanyDividendRow = {
  id: string;
  symbol: string;
  fiscalYear: string;
  bonusPct: number | null;
  cashPct: number | null;
  bookCloseDate: string | null;
  agmDate: string | null;
  source: string | null;
};

export type NepseCompanyActionRow = {
  id: string;
  symbol: string;
  actionType: NepseCorporateActionType;
  title: string;
  actionDate: string | null;
  details: string | null;
  sourceUrl: string | null;
  source: string | null;
};

export type NepseCompanySessionStats = {
  openNpr: number | null;
  highNpr: number | null;
  lowNpr: number | null;
  closeNpr: number | null;
  previousCloseNpr: number | null;
  volume: number | null;
  turnoverNpr: number | null;
  trades: number | null;
};

export type NepseCompanyRange52W = {
  highNpr: number | null;
  lowNpr: number | null;
  fromDate: string | null;
  toDate: string | null;
};

export type NepseCompanyShareholding = {
  promoterShares: number | null;
  publicShares: number | null;
  listedShares: number | null;
  promoterPct: number | null;
  publicPct: number | null;
  otherPct: number | null;
};

export type NepseCompanyFundamentalsPayload = {
  symbol: string;
  profile: NepseCompanyProfile;
  valuation: NepseCompanyValuation;
  financials: NepseCompanyFinancialRow[];
  dividends: NepseCompanyDividendRow[];
  actions: NepseCompanyActionRow[];
  session: NepseCompanySessionStats;
  range52w: NepseCompanyRange52W;
  shareholding: NepseCompanyShareholding;
  loadedAt: string;
};
