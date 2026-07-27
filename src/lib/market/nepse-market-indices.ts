/**
 * Official NEPSE market-index catalog for the company explorer filter.
 * Display names match the product UI; nepseId maps to nepalstock.com.np index ids.
 */

export type NepseMarketIndexOption = {
  key: string;
  /** null = All Listed (no index membership filter) */
  nepseId: number | null;
  displayName: string;
  /** Prefer sector-master membership when set (complete listed universe). */
  sectorNames: string[];
  /** Use daily trade-stat membership persistence for curated indices. */
  usesTradeComposition: boolean;
};

/** "All Listed" first, then official NEPSE indices in product order. */
export const NEPSE_MARKET_INDEX_OPTIONS: NepseMarketIndexOption[] = [
  { key: "ALL_LISTED", nepseId: null, displayName: "All Listed", sectorNames: [], usesTradeComposition: false },
  { key: "NEPSE", nepseId: 58, displayName: "NEPSE Index", sectorNames: [], usesTradeComposition: false },
  { key: "SENSITIVE", nepseId: 57, displayName: "Sensitive Index", sectorNames: [], usesTradeComposition: true },
  { key: "FLOAT", nepseId: 62, displayName: "Float Index", sectorNames: [], usesTradeComposition: true },
  { key: "SENSITIVE_FLOAT", nepseId: 63, displayName: "Sensitive Float Index", sectorNames: [], usesTradeComposition: true },
  {
    key: "COMMERCIAL_BANKS",
    nepseId: 51,
    displayName: "Banking Index",
    sectorNames: ["Commercial Banks"],
    usesTradeComposition: false,
  },
  {
    key: "DEVELOPMENT_BANKS",
    nepseId: 55,
    displayName: "Development Bank Index",
    sectorNames: ["Development Banks"],
    usesTradeComposition: false,
  },
  {
    key: "FINANCE",
    nepseId: 60,
    displayName: "Finance Index",
    sectorNames: ["Finance"],
    usesTradeComposition: false,
  },
  {
    key: "HOTELS_AND_TOURISM",
    nepseId: 52,
    displayName: "Hotels & Tourism Index",
    sectorNames: ["Hotels And Tourism", "Hotels & Tourism", "Hotels"],
    usesTradeComposition: false,
  },
  {
    key: "HYDRO_POWER",
    nepseId: 54,
    displayName: "Hydropower Index",
    sectorNames: ["Hydro Power", "Hydropower", "HydroPower"],
    usesTradeComposition: false,
  },
  {
    key: "INVESTMENT",
    nepseId: 67,
    displayName: "Investment Index",
    sectorNames: ["Investment"],
    usesTradeComposition: false,
  },
  {
    key: "LIFE_INSURANCE",
    nepseId: 65,
    displayName: "Life Insurance Index",
    sectorNames: ["Life Insurance"],
    usesTradeComposition: false,
  },
  {
    key: "MANUFACTURING_AND_PROCESSING",
    nepseId: 56,
    displayName: "Manufacturing & Processing Index",
    sectorNames: ["Manufacturing And Processing", "Manufacturing & Processing"],
    usesTradeComposition: false,
  },
  {
    key: "MICROFINANCE",
    nepseId: 64,
    displayName: "Microfinance Index",
    sectorNames: ["Microfinance"],
    usesTradeComposition: false,
  },
  {
    key: "MUTUAL_FUND",
    nepseId: 66,
    displayName: "Mutual Fund Index",
    sectorNames: ["Mutual Fund", "Mutual Funds"],
    usesTradeComposition: false,
  },
  {
    key: "NON_LIFE_INSURANCE",
    nepseId: 59,
    displayName: "Non-Life Insurance Index",
    sectorNames: ["Non Life Insurance", "Non-Life Insurance", "Nonlife Insurance"],
    usesTradeComposition: false,
  },
  {
    key: "OTHERS",
    nepseId: 53,
    displayName: "Others Index",
    sectorNames: ["Others"],
    usesTradeComposition: false,
  },
  {
    key: "TRADING",
    nepseId: 61,
    displayName: "Trading Index",
    sectorNames: ["Tradings", "Trading"],
    usesTradeComposition: false,
  },
];

export function getMarketIndexOption(key: string): NepseMarketIndexOption | undefined {
  return NEPSE_MARKET_INDEX_OPTIONS.find((row) => row.key === key);
}

export function normalizeSectorLabel(value: string | null | undefined): string {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function sectorMatchesIndex(sector: string | null | undefined, sectorNames: string[]): boolean {
  if (!sectorNames.length) return false;
  const needle = normalizeSectorLabel(sector);
  if (!needle) return false;
  return sectorNames.some((name) => normalizeSectorLabel(name) === needle);
}
