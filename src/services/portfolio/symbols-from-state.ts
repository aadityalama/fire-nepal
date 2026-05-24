import type { WealthPortfolioStateV2 } from "@/components/portfolio/types";
import { getInstrumentByKey } from "@/lib/investment-market/catalog";

/** Derive external quote symbols from the user's portfolio (best-effort). */
export function collectMarketSymbolsFromPortfolio(state: WealthPortfolioStateV2): {
  yahoo: string[];
  cryptoIds: string[];
} {
  const yahoo = new Set<string>();
  const cryptoIds = new Set<string>();

  for (const inv of state.investments) {
    const inst = getInstrumentByKey(inv.instrumentKey);
    if (inst?.universe === "us_stock" || inst?.universe === "etf") {
      yahoo.add(inst.symbol.toUpperCase());
    }
    if (inv.kind === "crypto") {
      cryptoIds.add("bitcoin");
      cryptoIds.add("ethereum");
    }
    const ks = /\b(\d{6}\.KS)\b/i.exec(inv.name)?.[1];
    if (ks) yahoo.add(ks.toUpperCase());
  }

  return { yahoo: [...yahoo], cryptoIds: [...cryptoIds] };
}
