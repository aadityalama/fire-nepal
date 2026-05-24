import type { InvestmentKind } from "@/components/portfolio/types";
import type { MarketUniverse } from "@/lib/investment-market/types";

/** Map portfolio row kind → searchable universe (crypto = manual entry). */
export function universesForKind(kind: InvestmentKind): MarketUniverse[] {
  switch (kind) {
    case "nepse":
      return ["nepse"];
    case "sip":
      return ["open_end_mf"];
    case "closed_end_mf":
      return ["closed_end_mf"];
    case "us_stock":
      return ["us_stock"];
    case "etf":
      return ["etf"];
    default:
      return [];
  }
}

export function kindForUniverse(u: MarketUniverse): InvestmentKind {
  switch (u) {
    case "nepse":
      return "nepse";
    case "open_end_mf":
      return "sip";
    case "closed_end_mf":
      return "closed_end_mf";
    case "us_stock":
      return "us_stock";
    case "etf":
      return "etf";
  }
}
