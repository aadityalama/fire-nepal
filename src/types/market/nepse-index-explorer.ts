/**
 * Interactive Market Index Explorer contracts.
 * Values come from live feeds / official EOD — composition from Company Master + NEPSE index membership.
 */

export type IndexExplorerTrend = "up" | "down" | "flat" | "unknown";

export type IndexExplorerCard = {
  indexKey: string;
  displayName: string;
  nepseId: number | null;
  /** Official / live index level when published. */
  value: number | null;
  /** Today's absolute point change. */
  change: number | null;
  changePct: number | null;
  trend: IndexExplorerTrend;
  lastUpdated: string | null;
  companyCount: number;
  membershipSource: string;
  /** How the value was sourced. */
  valueSource: "index_feed" | "index_eod" | "sector_pulse" | "unavailable";
};

export type IndexExplorerPayload = {
  indices: IndexExplorerCard[];
  loadedAt: string;
  sources: string[];
};
