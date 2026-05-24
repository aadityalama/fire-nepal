/**
 * FIRE Nepal investment master database.
 * `demo*` NPR/USD fields are snapshot placeholders until live-price APIs plug in.
 */

export type MarketUniverse = "nepse" | "open_end_mf" | "closed_end_mf" | "us_stock" | "etf";

export const NEPSE_SECTORS = [
  "Commercial Banks",
  "Development Banks",
  "Finance",
  "Hydropower",
  "Insurance",
  "Microfinance",
  "Hotels",
  "Manufacturing",
  "Trading",
  "Investment",
] as const;

export type NepseSectorName = (typeof NEPSE_SECTORS)[number];

/** NPR-denominated on-exchange style quote (whole paisa allowed). */
export type NepseListedStock = {
  universe: "nepse";
  key: string;
  symbol: string;
  companyName: string;
  sector: NepseSectorName;
  /** Curated aliases + fragments (e.g. "nab" → NABIL). Merged into search index. */
  searchKeywords: readonly string[];
  /** Demo last price per share in NPR (API-ready shape). */
  demoLastPriceNpr: number;
};

export type OpenEndedMutualFund = {
  universe: "open_end_mf";
  key: string;
  fundName: string;
  fundManager: string;
  category: string;
  sipSupported: boolean;
  /** Demo NAV per unit NPR */
  demoNavNpr: number;
};

export type ClosedEndedMutualFund = {
  universe: "closed_end_mf";
  key: string;
  ticker: string;
  fundName: string;
  category: string;
  /** Demo last price per unit NPR */
  demoLastPriceNpr: number;
};

export type UsListedStock = {
  universe: "us_stock";
  key: string;
  symbol: string;
  companyName: string;
  /** Demo last price per share in USD */
  demoLastPriceUsd: number;
};

export type EtfInstrument = {
  universe: "etf";
  key: string;
  symbol: string;
  name: string;
  /** Demo last price per share in USD */
  demoLastPriceUsd: number;
};

export type MasterInstrument =
  | NepseListedStock
  | OpenEndedMutualFund
  | ClosedEndedMutualFund
  | UsListedStock
  | EtfInstrument;

export function instrumentSearchBlob(i: MasterInstrument): string {
  switch (i.universe) {
    case "nepse":
      return `${i.symbol} ${i.companyName} ${i.sector} ${i.searchKeywords.join(" ")}`.toLowerCase();
    case "open_end_mf":
      return `${i.fundName} ${i.fundManager} ${i.category} ${i.sipSupported ? "sip yes" : "sip no"}`.toLowerCase();
    case "closed_end_mf":
      return `${i.ticker} ${i.fundName} ${i.category}`.toLowerCase();
    case "us_stock":
      return `${i.symbol} ${i.companyName}`.toLowerCase();
    case "etf":
      return `${i.symbol} ${i.name} etf`.toLowerCase();
    default:
      return "";
  }
}
