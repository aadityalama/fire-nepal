/**
 * Normalized live market snapshot consumed by portfolio engine + UI widgets.
 * All monetary fields use explicit units in field names.
 */

export type MarketSourceStatus = "ok" | "error" | "skipped";

export type ForexCross = {
  krwPerNpr: number;
  usdPerNpr: number;
  /** NPR per 1 USD (derived). */
  nprPerUsd: number;
};

export type NepseIndexTick = {
  name: string;
  value: number;
  changePct?: number;
};

export type NepseSecurityTick = {
  /** Uppercase NEPSE symbol. */
  symbol: string;
  /** Company / fund name when provided by the feed. */
  companyName?: string;
  /** Last traded price in NPR when known. */
  ltpNpr: number;
  changePct?: number;
  /** Absolute day change in NPR (vs previous close) when known. */
  changeNpr?: number;
  previousCloseNpr?: number;
  highNpr?: number;
  lowNpr?: number;
  /** Intraday range as % of previous close: (high − low) / prevClose × 100. */
  intradayRangePct?: number;
  volume?: number;
  /** NPR turnover for the session when known. */
  turnoverNpr?: number;
  /** Listed market cap (feed units — typically NPR crores on Yonepse). */
  marketCap?: number;
  /** Sector label when mapped from registry or upstream. */
  sector?: string;
  trades?: number;
  lastUpdated?: string;
};

export type NepseMarketBreadth = {
  advancing: number;
  declining: number;
  unchanged: number;
  advanceDeclineRatio: number;
};

export type NepseSectorPerformance = {
  sector: string;
  /** Volume-weighted average % change inside the sector. */
  avgChangePct: number;
  constituents: number;
  turnoverNpr: number;
};

/** Derived board view (built server-side from the live map). */
export type NepseTerminalSnapshot = {
  topGainers: NepseSecurityTick[];
  topLosers: NepseSecurityTick[];
  mostActive: NepseSecurityTick[];
  turnoverLeaders: NepseSecurityTick[];
  sectorPerformance: NepseSectorPerformance[];
  breadth: NepseMarketBreadth;
  totalsListed: number;
  totalTurnoverNpr: number;
};

export type UsdInstrumentTick = {
  symbol: string;
  lastUsd: number;
  changePct?: number;
};

export type KrwInstrumentTick = {
  symbol: string;
  lastKrw: number;
  changePct?: number;
};

export type CryptoTick = {
  id: string;
  lastUsd: number;
};

export type MetalSpotUsdOz = {
  goldUsdPerOz: number;
  silverUsdPerOz: number;
};

export type MarketSnapshot = {
  fetchedAt: string;
  /** Partial / degraded responses are still useful for UI. */
  partial: boolean;
  sourceStatus: Record<string, MarketSourceStatus>;
  forex: ForexCross;
  nepseIndex?: NepseIndexTick;
  /** Best-effort LTP map keyed by uppercase NEPSE ticker. */
  nepseBySymbol: Record<string, NepseSecurityTick>;
  /** Equity + MF board analytics (same refresh window as `nepseBySymbol`). */
  nepseTerminal?: NepseTerminalSnapshot;
  /** Yahoo-style symbols (e.g. AAPL, SPY). */
  usdEquities: Record<string, UsdInstrumentTick>;
  /** Yahoo-style KRX symbols (e.g. 005930.KS). */
  krEquities: Record<string, KrwInstrumentTick>;
  /** CoinGecko-style ids (e.g. bitcoin, ethereum). */
  crypto: Record<string, CryptoTick>;
  metalsUsdOz: MetalSpotUsdOz;
};

export type MarketApiErrorBody = {
  error: string;
  retryAfterSec?: number;
};

export type { NepseSortDirection, NepseTableSortKey } from "./terminal-ui";

