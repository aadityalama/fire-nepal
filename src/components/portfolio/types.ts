import type { PortfolioDisplayCurrency } from "@/lib/portfolio-convert";

export type InvestmentKind = "nepse" | "us_stock" | "etf" | "sip" | "closed_end_mf" | "crypto";

export type MfDividendEntry = {
  date: string;
  amountNpr: number;
};

/** FIFO-ready tax lots (same currency as parent row). */
export type FifoPositionLot = {
  id: string;
  quantity: number;
  unitCost: number;
  currency: PortfolioDisplayCurrency;
  openedAt: string;
  fees?: number;
};

export type PortfolioLedgerBucket =
  | "investment"
  | "metal"
  | "liquid_cash"
  | "real_estate"
  | "vehicle"
  | "liability"
  /** Reserved for future retirement-account trade / contribution ledger rows. */
  | "retirement";
export type PortfolioLedgerTxType = "buy" | "sell" | "cash_dividend" | "bonus_share" | "right_share";

export type PortfolioLedgerEntry = {
  id: string;
  txType: PortfolioLedgerTxType;
  bucket: PortfolioLedgerBucket;
  rowId: string;
  assetLabel: string;
  /** Human-readable action for unified ledger UI (e.g. IPO, Add cash, Pay loan). */
  ledgerAction?: string;
  investmentKind?: InvestmentKind;
  metal?: "gold" | "silver";
  quantity: number;
  unitPrice: number;
  currency: PortfolioDisplayCurrency;
  tradeDate: string;
  fees?: number;
  notes?: string;
  /** Realized gain/loss in NPR at execution time (sells). */
  realizedGainNpr?: number | null;
  /** Hooks for tax, dividends, broker sync, etc. */
  meta?: Record<string, unknown>;
};

export type RealEstateKind = "land" | "house" | "apartment" | "commercial";

export type VehicleKind = "bike" | "car" | "ev";

export type LiabilityKind = "loan" | "credit" | "mortgage" | "personal";

export type InvestmentRow = {
  id: string;
  kind: InvestmentKind;
  name: string;
  quantity: number | undefined;
  buyPrice: number | undefined;
  currency: PortfolioDisplayCurrency;
  /** Master DB key (Phase 2) — enables demo live unit from registry. */
  instrumentKey?: string;
  /** ISO `YYYY-MM-DD` — optional holding timeline & CAGR display. */
  purchaseDate?: string;
  /** FIFO lots; when absent, `quantity` + `buyPrice` synthesize a single lot on first trade. */
  fifoLots?: FifoPositionLot[];
  /** SIP / open MF: optional monthly contribution (NPR) for runway + IRR-style analytics. */
  sipMonthlyContributionNpr?: number;
  /** ISO `YYYY-MM-DD` — first debit / scheme start; falls back to `purchaseDate` when unset. */
  sipStartedAt?: string;
  /** Nepal MF cash dividends received (NPR). */
  mfDividendHistory?: MfDividendEntry[];
};

export type MetalRow = {
  id: string;
  metal: "gold" | "silver";
  grams: number | undefined;
  /** ISO `YYYY-MM-DD` — optional holding timeline. */
  boughtDate?: string;
  /** Total NPR cost basis for held grams (optional; enables realized P/L on sells). */
  totalCostBasisNpr?: number;
  /**
   * Optional photos (jewelry, bars, invoices): inline JPEG data URLs or safe `https` image URLs.
   * Display / documentation only — does not affect marks or ledger.
   */
  photoUrls?: string[];
  /** Index into `photoUrls` for the cover image (0-based). */
  coverPhotoIndex?: number;
};

export type RealEstateRow = {
  id: string;
  propertyType: RealEstateKind;
  name: string;
  /**
   * Human-readable place (ward/district, city, country), e.g. "Budhanilkantha, Kathmandu" or "Jeonju, South Korea".
   * Display / planning only — does not affect valuations.
   */
  location?: string;
  /** Optional Google Maps link (https only; validated when persisting). Display only. */
  mapsUrl?: string;
  purchaseValue: number | undefined;
  estimatedValue: number | undefined;
  currency: PortfolioDisplayCurrency;
  /** ISO `YYYY-MM-DD` — optional acquisition timeline / appreciation analytics. */
  acquiredDate?: string;
  /** Optional planning assumption: expected average annual price growth % (user-entered). */
  annualAppreciationEstimatePct?: number;
  /**
   * Optional cover image: `https://…` image URL or inline `data:image/jpeg;base64,…` from client compression.
   * Does not affect valuations — display only.
   */
  propertyPhoto?: string;
};

export type VehicleRow = {
  id: string;
  vehicleType: VehicleKind;
  name: string;
  resaleEstimate: number | undefined;
  currency: PortfolioDisplayCurrency;
  /** ISO `YYYY-MM-DD` — optional purchase timeline. */
  purchaseDate?: string;
};

export type LiabilityRow = {
  id: string;
  liabilityType: LiabilityKind;
  name: string;
  amount: number | undefined;
  currency: PortfolioDisplayCurrency;
  /** ISO `YYYY-MM-DD` — optional loan / obligation start (loan age). */
  loanStartDate?: string;
};

export type SimpleMoneyLine = {
  id: string;
  /** Bank or wallet display name. */
  name: string;
  /** Optional account / wallet reference (masked in UI elsewhere if needed). */
  accountNumber?: string;
  /** Current balance for this liquid line. */
  amount: number | undefined;
  currency: PortfolioDisplayCurrency;
  /** ISO `YYYY-MM-DD` — optional opening date for this cash line. */
  openedDate?: string;
};

/** Fixed deposit compounding frequency (nominal annual rate `interestRatePct`). */
export type FdCompounding = "simple" | "monthly" | "quarterly" | "annual";

/** Term deposit row — principal locked until maturity; interest is modelled, not ledger-settled. */
export type FixedDepositRow = {
  id: string;
  bankName: string;
  accountNumber: string;
  principal: number | undefined;
  interestRatePct: number | undefined;
  /** ISO `YYYY-MM-DD` — maturity / renewal date. */
  maturityDate?: string;
  /** ISO `YYYY-MM-DD` — booking / value date; when omitted, analytics use “today”. */
  openedDate?: string;
  compounding: FdCompounding;
  currency: PortfolioDisplayCurrency;
};

export type NetWorthHistoryPoint = {
  month: string;
  netWorthNpr: number;
};

/** Global retirement / pension vehicles (Nepal, diaspora, regional pillars). */
export type RetirementAccountKind =
  | "ssf"
  | "cit"
  | "epf"
  | "pension_savings"
  | "employer_retirement"
  | "retirement_sip"
  | "global_retirement_account"
  /** South Korea — common for Nepali diaspora; not Korea-only app scope. */
  | "kr_nps"
  | "kr_severance"
  | "kr_dc_irp";

export type GlobalRetirementAssetRow = {
  id: string;
  kind: RetirementAccountKind;
  accountName: string;
  country: string;
  currentBalance: number | undefined;
  currency: PortfolioDisplayCurrency;
  monthlyContribution: number | undefined;
  employerContribution?: number | undefined;
  expectedRetirementAge: number | undefined;
  /** Used with expectedRetirementAge to derive years to retirement for projections. */
  currentAge?: number | undefined;
  /** Shown when kind is SSF — Social Security Fund member / ID reference. */
  ssfMemberId?: string;
  /** Shown when kind is Korea NPS — national pension subscriber number. */
  npsNumber?: string;
  /** When the account or pillar enrollment began (local date, YYYY-MM-DD). */
  accountStartDate?: string;
  /** Calendar year contributions or coverage began (planning reference). */
  contributionStartYear?: number;
};

export type WealthPortfolioStateV2 = {
  version: 2;
  liquidCash: SimpleMoneyLine[];
  /** Term deposits (principal counted in assets; interest synced to cashflow when configured). */
  fixedDeposits: FixedDepositRow[];
  investments: InvestmentRow[];
  metals: MetalRow[];
  realEstate: RealEstateRow[];
  vehicles: VehicleRow[];
  liabilities: LiabilityRow[];
  /** SSF, CIT, EPF, global pensions, Korea NPS/퇴직금/DC·IRP, employer plans, SIPs, etc. */
  globalRetirementAssets: GlobalRetirementAssetRow[];
  netWorthHistory: NetWorthHistoryPoint[];
  /** Buy / sell ledger (FIFO slices stored on entries for future tax / sync). */
  ledger: PortfolioLedgerEntry[];
};
