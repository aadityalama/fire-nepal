import { NEPSE_LISTED_STOCKS } from "@/lib/investment-market/data/nepse";
import type { NepseSectorName } from "@/lib/investment-market/types";

const SECTOR_BY_SYMBOL = new Map<string, NepseSectorName>();
for (const s of NEPSE_LISTED_STOCKS) {
  SECTOR_BY_SYMBOL.set(s.symbol.toUpperCase(), s.sector);
}

/** Best-effort sector from the static registry (live feed may list symbols not yet in the slice). */
export function sectorForListedSymbol(symbol: string): NepseSectorName | undefined {
  return SECTOR_BY_SYMBOL.get(symbol.replace(/\s+/g, "").toUpperCase());
}
