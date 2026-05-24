import type { NepseListedStock, NepseSectorName } from "@/lib/investment-market/types";

export function nepseStock(
  symbol: string,
  companyName: string,
  sector: NepseSectorName,
  extraKeywords: readonly string[],
  demoLastPriceNpr: number,
): NepseListedStock {
  const merged = new Set<string>([
    symbol.toLowerCase(),
    ...companyName
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 1),
    ...extraKeywords.map((k) => k.toLowerCase()),
  ]);
  return {
    universe: "nepse",
    key: `nepse:${symbol}`,
    symbol,
    companyName,
    sector,
    searchKeywords: [...merged],
    demoLastPriceNpr,
  };
}
