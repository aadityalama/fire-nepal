/** Terminal table sorting (client-side). */
export type NepseTableSortKey =
  | "symbol"
  | "companyName"
  | "ltpNpr"
  | "changePct"
  | "changeNpr"
  | "volume"
  | "turnoverNpr"
  | "marketCap"
  | "sector"
  | "intradayRangePct";

export type NepseSortDirection = "asc" | "desc";
