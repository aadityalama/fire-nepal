/**
 * Institutional Market Terminal contracts (Phase 5).
 * All values come from live/provider feeds or DB — never fabricated.
 */

import { DATA_UNAVAILABLE } from "@/types/market/nepse-company-fundamentals";
import type { NepseMarketBreadth, NepseSecurityTick, NepseSectorPerformance } from "@/types/market";

export type TerminalMarketStatus = {
  label: "Open" | "Closed" | "Pre-open";
  live: boolean;
  /** Upstream feed flag when published; null if feed silent. */
  feedIsOpen: boolean | null;
  checkedAt: string | null;
};

export type TerminalIndexRow = {
  id: string;
  name: string;
  /** Official index level when the feed publishes it. */
  value: number | null;
  changePct: number | null;
  changeNpr: number | null;
  /** When value is missing, optional sector-pulse % from live constituents. */
  sectorChangePct: number | null;
  source: "index_feed" | "sector_pulse" | "unavailable";
};

export type TerminalSummaryStats = {
  totalTurnoverNpr: number | null;
  totalVolume: number | null;
  totalTrades: number | null;
  scripsTraded: number | null;
  /** Sum of published market-cap fields only — null when none are available. */
  totalMarketCapNpr: number | null;
  marketCapCoverage: number;
};

export type TerminalRange52W = {
  symbol: string;
  companyName: string | null;
  sector: string | null;
  ltpNpr: number;
  high52wNpr: number | null;
  low52wNpr: number | null;
  distancePct: number | null;
};

export type TerminalMovers = {
  topGainers: NepseSecurityTick[];
  topLosers: NepseSecurityTick[];
  topTurnover: NepseSecurityTick[];
  topVolume: NepseSecurityTick[];
  topTransactions: NepseSecurityTick[];
  mostActive: NepseSecurityTick[];
  near52wHigh: TerminalRange52W[];
  near52wLow: TerminalRange52W[];
};

export type TerminalHeatCell = {
  symbol: string;
  companyName: string | null;
  sector: string | null;
  changePct: number | null;
  ltpNpr: number | null;
  turnoverNpr: number | null;
  marketCapNpr: number | null;
};

export type TerminalHeatmap = {
  companies: TerminalHeatCell[];
  sectors: {
    sector: string;
    avgChangePct: number;
    constituents: number;
    turnoverNpr: number;
  }[];
};

export type TerminalBrokerRow = {
  memberCode: string;
  memberName: string;
  latestTurnoverNpr: number | null;
  thirtyDayTurnoverNpr: number | null;
  buyAmountNpr: number | null;
  sellAmountNpr: number | null;
  buyQtyPct: number | null;
  sellQtyPct: number | null;
  rating: number | null;
};

export type TerminalBrokerBoard = {
  topByTurnover: TerminalBrokerRow[];
  buySellLeaders: TerminalBrokerRow[];
  asOf: string | null;
};

export type ScreenerMaTrend = "bullish" | "bearish" | "neutral" | typeof DATA_UNAVAILABLE;
export type ScreenerTechRating = "bullish" | "bearish" | "neutral" | typeof DATA_UNAVAILABLE;
export type ScreenerBollingerPos = "above_upper" | "below_lower" | "upper_half" | "lower_half" | typeof DATA_UNAVAILABLE;

export type ScreenerRow = {
  symbol: string;
  companyName: string | null;
  sector: string | null;
  ltpNpr: number | null;
  changePct: number | null;
  volume: number | null;
  turnoverNpr: number | null;
  trades: number | null;
  marketCapNpr: number | null;
  pe: number | null;
  pb: number | null;
  eps: number | null;
  roePct: number | null;
  roaPct: number | null;
  bookValueNpr: number | null;
  dividendYieldPct: number | null;
  rsi: number | null;
  macdHistogram: number | null;
  smaTrend: ScreenerMaTrend;
  emaTrend: ScreenerMaTrend;
  /** @deprecated prefer smaTrend / emaTrend */
  maTrend: ScreenerMaTrend;
  bollingerPos: ScreenerBollingerPos;
  high52wNpr: number | null;
  low52wNpr: number | null;
  near52wHigh: boolean;
  near52wLow: boolean;
  technicalRating: ScreenerTechRating;
  aiScore: number | null;
};

export type CalendarEventType =
  | "agm"
  | "book_closure"
  | "dividend"
  | "bonus"
  | "rights"
  | "ipo"
  | "fpo"
  | "auction"
  | "financial_report"
  | "trading_holiday";

export type MarketCalendarEvent = {
  id: string;
  type: CalendarEventType;
  title: string;
  symbol: string | null;
  date: string | null;
  detail: string | null;
  source: string;
};

export type SmartWatchlistBucket = {
  id: string;
  label: string;
  description: string;
  symbols: string[];
};

export type NepseTerminalBoardPayload = {
  status: TerminalMarketStatus;
  indices: TerminalIndexRow[];
  summary: TerminalSummaryStats;
  breadth: NepseMarketBreadth | null;
  sectorPerformance: NepseSectorPerformance[];
  movers: TerminalMovers;
  heatmap: TerminalHeatmap;
  brokers: TerminalBrokerBoard;
  marketDistribution: { sector: string; turnoverSharePct: number; turnoverNpr: number; constituents: number }[];
  loadedAt: string;
  sources: string[];
};
