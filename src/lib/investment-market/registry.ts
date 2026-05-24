import type { InvestmentKind } from "@/components/portfolio/types";
import type { MasterInstrument } from "@/lib/investment-market/types";
import { rankMasterInstruments } from "@/lib/investment-market/search";

export { ALL_MASTER_INSTRUMENTS, getInstrumentByKey } from "@/lib/investment-market/catalog";
export { kindForUniverse, universesForKind } from "@/lib/investment-market/universe-kind-map";

/** Fuzzy-ranked autocomplete list (see `search.ts`). */
export function filterMasterInstruments(kind: InvestmentKind, query: string, limit = 80): MasterInstrument[] {
  return rankMasterInstruments(kind, query, limit);
}

export function primaryLabel(i: MasterInstrument): string {
  switch (i.universe) {
    case "nepse":
      return i.symbol;
    case "open_end_mf":
      return i.fundName;
    case "closed_end_mf":
      return i.ticker;
    case "us_stock":
      return i.symbol;
    case "etf":
      return i.symbol;
  }
}

export function secondaryLabel(i: MasterInstrument): string {
  switch (i.universe) {
    case "nepse":
      return `${i.companyName} · ${i.sector}`;
    case "open_end_mf":
      return `${i.fundManager} · ${i.category}${i.sipSupported ? " · SIP" : ""}`;
    case "closed_end_mf":
      return `${i.fundName} · ${i.category}`;
    case "us_stock":
      return i.companyName;
    case "etf":
      return i.name;
  }
}
