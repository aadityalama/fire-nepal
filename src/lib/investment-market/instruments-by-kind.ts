import type { InvestmentKind } from "@/components/portfolio/types";
import type { MasterInstrument } from "@/lib/investment-market/types";
import { ALL_MASTER_INSTRUMENTS } from "@/lib/investment-market/catalog";
import { universesForKind } from "@/lib/investment-market/universe-kind-map";

const cache = new Map<InvestmentKind, readonly MasterInstrument[]>();

/** Pre-filtered instruments per portfolio row kind (faster search on large catalogs). */
export function instrumentsForKind(kind: InvestmentKind): readonly MasterInstrument[] {
  let row = cache.get(kind);
  if (row !== undefined) return row;

  const allow = new Set(universesForKind(kind));
  if (allow.size === 0) {
    row = Object.freeze([]);
  } else {
    row = Object.freeze(ALL_MASTER_INSTRUMENTS.filter((i) => allow.has(i.universe)));
  }
  cache.set(kind, row);
  return row;
}
